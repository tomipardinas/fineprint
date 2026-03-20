// Fineprint - Background Service Worker

const BACKEND_URL = 'https://fineprint.vercel.app/api/analyze';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Device ID ────────────────────────────────────────────────────────────

async function getOrCreateDeviceId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['device_id'], (result) => {
      if (result.device_id) {
        resolve(result.device_id);
      } else {
        const id = crypto.randomUUID();
        chrome.storage.local.set({ device_id: id });
        resolve(id);
      }
    });
  });
}

// ─── Cache helpers ────────────────────────────────────────────────────────

function cacheKey(url) {
  return `cache:${url}`;
}

async function getCached(url) {
  return new Promise((resolve) => {
    chrome.storage.local.get([cacheKey(url)], (result) => {
      const entry = result[cacheKey(url)];
      if (!entry) return resolve(null);
      if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        chrome.storage.local.remove(cacheKey(url));
        return resolve(null);
      }
      resolve(entry.data);
    });
  });
}

async function setCache(url, data) {
  return new Promise((resolve) => {
    chrome.storage.local.set({
      [cacheKey(url)]: { data, timestamp: Date.now() }
    }, resolve);
  });
}

// ─── Analysis fetch ───────────────────────────────────────────────────────

async function analyzeUrl(url, deviceId, pageText) {
  // Check cache first
  const cached = await getCached(url);
  if (cached) {
    console.log('[Fineprint bg] Cache hit for', url);
    return { success: true, data: cached, fromCache: true };
  }

  // Get user settings
  const settings = await new Promise((resolve) => {
    chrome.storage.sync.get({
      apiKey: '',
      privacyLevel: 3,
      blockAdSharing: true,
      alertManipulation: true
    }, resolve);
  });

  const profile = {
    privacy_level: settings.privacyLevel,
    block_ad_sharing: settings.blockAdSharing,
    alert_manipulation: settings.alertManipulation
  };

  try {
    let response;

    if (settings.apiKey) {
      // ── BYO key: call Anthropic directly (no backend needed) ──────────────
      // Use page text from the content script if available, otherwise fetch
      let tosText = '';
      if (pageText) {
        tosText = pageText.slice(0, 8000);
      } else {
        try {
          const pageRes = await fetch(url);
          const html = await pageRes.text();
          tosText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 8000);
        } catch (e) {
          tosText = `Could not fetch page content from ${url}. Analyze based on URL only.`;
        }
      }

      const systemPrompt = `You are a privacy and legal expert analyzing Terms of Service.
Analyze and identify issues in 3 categories:
1. PRIVACY — data collection, sharing with third parties, retention periods
2. SECURITY — liability for breaches, data protection measures
3. BEHAVIOR — dark patterns, opt-out vs opt-in, algorithmic manipulation, content rights

For each finding return:
- category: "privacy" | "security" | "behavior"
- severity: "critical" | "warning" | "info"
- title: short description (max 10 words)
- description: explanation (max 30 words)
- clause: exact quote from ToS (max 50 words)

Return ONLY valid JSON: { "findings": [...], "overall_risk": "high"|"medium"|"low", "summary": "2 sentence summary" }
${profile.block_ad_sharing ? 'Flag any data sharing with advertisers as critical.' : ''}
${profile.alert_manipulation ? 'Flag behavioral manipulation and dark patterns.' : ''}
Privacy sensitivity level: ${profile.privacy_level}/5 — higher means flag more aggressively.`;

      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': settings.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250514',
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: `Analyze this Terms of Service:\n\n${tosText}` }]
        })
      });

      if (!anthropicRes.ok) {
        const err = await anthropicRes.text();
        console.error('[Fineprint bg] Anthropic error:', err);
        return { success: false, error: `Anthropic API error: ${anthropicRes.status}` };
      }

      const anthropicData = await anthropicRes.json();
      const raw = anthropicData.content?.[0]?.text || '{}';
      const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || '{}');

      // Normalize to expected shape
      const normalized = { findings: [], privacy: [], security: [], behavior: [], overall_risk: parsed.overall_risk || 'medium', summary: parsed.summary || '' };
      for (const f of (parsed.findings || [])) {
        if (f.severity === 'critical') f.severity = 'red';
        else if (f.severity === 'warning') f.severity = 'yellow';
        else if (f.severity === 'info') f.severity = 'green';
        if (!f.summary) f.summary = f.title || f.description || '';
        normalized.findings.push(f);
        if (f.category === 'privacy') normalized.privacy.push(f);
        else if (f.category === 'security') normalized.security.push(f);
        else normalized.behavior.push(f);
      }

      await setCache(url, normalized);
      chrome.storage.local.set({ lastAnalyzed: { url, timestamp: Date.now(), score: computeOverallScore(normalized), label: computeScoreLabel(normalized) } });
      return { success: true, data: normalized };

    } else {
      // ── No API key: call our backend ──────────────────────────────────────
      const payload = { url, device_id: deviceId, preferences: profile, page_text: pageText || '' };
      response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[Fineprint bg] Backend error:', response.status, errText);
        return { success: false, error: `Backend error: ${response.status}` };
      }

      const raw = await response.json();

      // Normalize: group flat findings into category arrays and map severities
      const data = { findings: [], privacy: [], security: [], behavior: [], overall_risk: raw.overall_risk || 'medium', summary: raw.summary || '' };
      for (const f of (raw.findings || [])) {
        // Map severity names to color names used by the UI
        if (f.severity === 'critical') f.severity = 'red';
        else if (f.severity === 'warning') f.severity = 'yellow';
        else if (f.severity === 'info') f.severity = 'green';
        // Map title/description to summary for UI
        if (!f.summary) f.summary = f.title || f.description || '';
        data.findings.push(f);
        if (f.category === 'privacy') data.privacy.push(f);
        else if (f.category === 'security') data.security.push(f);
        else data.behavior.push(f);
      }

      // Cache successful response
      await setCache(url, data);

      // Store last analyzed for popup
      chrome.storage.local.set({
        lastAnalyzed: {
          url,
          timestamp: Date.now(),
          score: computeOverallScore(data),
          label: computeScoreLabel(data)
        }
      });

      return { success: true, data };
    } // end else (backend path)
  } catch (err) {
    console.error('[Fineprint bg] Fetch failed:', err);
    return { success: false, error: err.message };
  }
}

function computeOverallScore(data) {
  // Count red findings across all sections
  const allFindings = [
    ...(data.privacy || []),
    ...(data.security || []),
    ...(data.behavior || [])
  ];
  const reds    = allFindings.filter(f => f.severity === 'red' || f.severity === 'critical').length;
  const yellows = allFindings.filter(f => f.severity === 'yellow' || f.severity === 'warning').length;
  if (reds > 0) return 'red';
  if (yellows > 0) return 'yellow';
  return 'green';
}

function computeScoreLabel(data) {
  const score = computeOverallScore(data);
  return { red: 'High Risk', yellow: 'Some Concerns', green: 'Looks OK' }[score];
}

// ─── Message handler ──────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ANALYZE_TOS') {
    (async () => {
      const deviceId = message.device_id || await getOrCreateDeviceId();
      const result = await analyzeUrl(message.url, deviceId, message.pageText);
      sendResponse(result);
    })();

    // Required for async sendResponse
    return true;
  }

  if (message.type === 'GET_DEVICE_ID') {
    getOrCreateDeviceId().then(id => sendResponse({ device_id: id }));
    return true;
  }

  if (message.type === 'CLEAR_CACHE') {
    chrome.storage.local.get(null, (items) => {
      const cacheKeys = Object.keys(items).filter(k => k.startsWith('cache:'));
      chrome.storage.local.remove(cacheKeys, () => sendResponse({ cleared: cacheKeys.length }));
    });
    return true;
  }
});

// ─── On install ───────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const deviceId = await getOrCreateDeviceId();
    console.log('[Fineprint] Installed. Device ID:', deviceId);
    // Open welcome/options page
    chrome.runtime.openOptionsPage();
  }
});
