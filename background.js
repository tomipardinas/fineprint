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

async function analyzeUrl(url, deviceId) {
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

  const payload = {
    url,
    device_id: deviceId,
    preferences: {
      privacy_level: settings.privacyLevel,
      block_ad_sharing: settings.blockAdSharing,
      alert_manipulation: settings.alertManipulation
    }
  };

  // Include user API key if set
  const headers = { 'Content-Type': 'application/json' };
  if (settings.apiKey) {
    headers['X-Anthropic-API-Key'] = settings.apiKey;
  }

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Fineprint bg] Backend error:', response.status, errText);
      return { success: false, error: `Backend error: ${response.status}` };
    }

    const data = await response.json();

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
  const reds    = allFindings.filter(f => f.severity === 'red').length;
  const yellows = allFindings.filter(f => f.severity === 'yellow').length;
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
      const result = await analyzeUrl(message.url, deviceId);
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
