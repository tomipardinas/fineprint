// Fineprint - Content Script
// Detects Terms of Service on web pages and shows an overlay analysis

(function () {
  'use strict';

  let overlayActive = false;
  let detectedTosUrl = null;
  let interceptedElement = null;

  // ─── ToS Detection ────────────────────────────────────────────────────────

  const TOS_BUTTON_PATTERNS = /\b(accept|i agree|agree and continue|agree & continue|accept all|accept terms|accept and continue|siguiente|continuar|aceptar|acepto|j'accepte|accepter|akzeptieren|ich stimme zu|concordo|aceitar)\b/i;
  const TOS_LABEL_PATTERNS = /\b(terms|privacy|agree|tos|terms of service|terms and conditions|privacy policy|términos|condiciones|privacidad|politique de confidentialité|conditions d'utilisation|datenschutz|nutzungsbedingungen|termos|privacidade)\b/i;
  const TOS_HREF_PATTERNS = /\/(terms|privacy|tos|legal|conditions|eula|user-agreement|terminos|privacidad|datenschutz|nutzungsbedingungen|politique|confidentialite)|legal\.\w+\.\w+/i;

  function findTosUrl() {
    // Look for links with TOS-related hrefs
    const links = document.querySelectorAll('a[href]');
    for (const link of links) {
      if (TOS_HREF_PATTERNS.test(link.href)) {
        return link.href;
      }
    }
    return window.location.href;
  }

  function isNearTosText(el) {
    // Check surrounding text within a reasonable DOM radius
    const parent = el.closest('form, section, div, label') || el.parentElement;
    if (!parent) return false;
    return TOS_LABEL_PATTERNS.test(parent.innerText || '');
  }

  function scanForTosElements() {
    if (overlayActive) return;

    // 1. Buttons with accept-like text
    const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"], a[role="button"]');
    for (const btn of buttons) {
      const text = btn.textContent || btn.value || '';
      if (TOS_BUTTON_PATTERNS.test(text.trim())) {
        return btn;
      }
    }

    // 2. Buttons near terms/privacy text (e.g. "Siguiente" next to "Términos")
    for (const btn of buttons) {
      if (isNearTosText(btn)) {
        return btn;
      }
    }

    // 3. Checkboxes near terms text
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    for (const cb of checkboxes) {
      if (isNearTosText(cb)) {
        // Find the submit button nearby
        const form = cb.closest('form');
        if (form) {
          const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
          if (submitBtn) return submitBtn;
        }
        return cb;
      }
    }

    return null;
  }

  // ─── Overlay Injection ────────────────────────────────────────────────────

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'fineprint-overlay';
    overlay.innerHTML = `
      <div class="fp-backdrop"></div>
      <div class="fp-card" role="dialog" aria-modal="true" aria-label="Fineprint ToS Analysis">
        <div class="fp-header">
          <span class="fp-logo">🔍 Fineprint</span>
          <p class="fp-tagline">Reading the fine print so you don't have to</p>
        </div>
        <div class="fp-body">
          <div class="fp-loading" id="fp-loading">
            <div class="fp-spinner"></div>
            <p>Analyzing Terms of Service…</p>
          </div>
          <div class="fp-results" id="fp-results" style="display:none;">
            <div class="fp-section" id="fp-privacy-section">
              <h3>🔒 Privacy</h3>
              <ul class="fp-findings" id="fp-privacy-findings"></ul>
            </div>
            <div class="fp-section" id="fp-security-section">
              <h3>🛡️ Security</h3>
              <ul class="fp-findings" id="fp-security-findings"></ul>
            </div>
            <div class="fp-section" id="fp-behavior-section">
              <h3>🧠 Behavior</h3>
              <ul class="fp-findings" id="fp-behavior-findings"></ul>
            </div>
          </div>
          <div class="fp-error" id="fp-error" style="display:none;">
            <p>⚠️ Could not analyze this Terms of Service. Proceed with caution.</p>
          </div>
        </div>
        <div class="fp-footer">
          <button class="fp-btn-accept" id="fp-accept-anyway">Accept anyway</button>
          <button class="fp-btn-block" id="fp-block-me">Block me from accepting</button>
        </div>
      </div>
    `;
    return overlay;
  }

  function renderFindings(findings, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !findings || findings.length === 0) {
      container && (container.closest('.fp-section').style.display = 'none');
      return;
    }
    container.innerHTML = '';
    for (const finding of findings) {
      const li = document.createElement('li');
      li.className = 'fp-finding';
      const dot = document.createElement('span');
      dot.className = `fp-dot fp-dot-${finding.severity || 'yellow'}`;
      const text = document.createElement('span');
      text.className = 'fp-finding-text';
      text.textContent = finding.summary;
      li.appendChild(dot);
      li.appendChild(text);

      if (finding.clause) {
        const details = document.createElement('details');
        details.className = 'fp-clause';
        const summary = document.createElement('summary');
        summary.textContent = 'See original clause';
        const clauseText = document.createElement('p');
        clauseText.textContent = finding.clause;
        details.appendChild(summary);
        details.appendChild(clauseText);
        li.appendChild(details);
      }

      container.appendChild(li);
    }
  }

  function showResults(data) {
    document.getElementById('fp-loading').style.display = 'none';
    document.getElementById('fp-results').style.display = 'block';

    renderFindings(data.privacy, 'fp-privacy-findings');
    renderFindings(data.security, 'fp-security-findings');
    renderFindings(data.behavior, 'fp-behavior-findings');
  }

  function showError() {
    document.getElementById('fp-loading').style.display = 'none';
    document.getElementById('fp-error').style.display = 'block';
  }

  async function showOverlay(triggerElement) {
    if (overlayActive) return;
    overlayActive = true;
    interceptedElement = triggerElement;

    // Intercept click on the trigger element
    if (triggerElement) {
      triggerElement.addEventListener('click', interceptClick, true);
    }

    detectedTosUrl = findTosUrl();

    const overlay = createOverlay();
    document.body.appendChild(overlay);

    // Wire up buttons
    document.getElementById('fp-accept-anyway').addEventListener('click', () => {
      closeOverlay();
      // Let the user proceed — re-click or unblock
      if (interceptedElement) {
        interceptedElement.removeEventListener('click', interceptClick, true);
        interceptedElement.click();
      }
    });

    document.getElementById('fp-block-me').addEventListener('click', () => {
      closeOverlay(true);
    });

    // Fetch analysis
    try {
      const deviceId = await getDeviceId();
      // Grab visible page text from the live DOM so we don't rely on server-side fetch
      const pageText = document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 12000);
      const result = await chrome.runtime.sendMessage({
        type: 'ANALYZE_TOS',
        url: detectedTosUrl,
        device_id: deviceId,
        pageText: pageText
      });

      if (result && result.success) {
        showResults(result.data);
      } else {
        showError();
      }
    } catch (err) {
      console.error('[Fineprint] Analysis error:', err);
      showError();
    }
  }

  function interceptClick(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }

  function closeOverlay(blocked = false) {
    const overlay = document.getElementById('fineprint-overlay');
    if (overlay) overlay.remove();
    overlayActive = false;
    if (!blocked && interceptedElement) {
      interceptedElement.removeEventListener('click', interceptClick, true);
    }
    interceptedElement = null;
  }

  // ─── Device ID ────────────────────────────────────────────────────────────

  async function getDeviceId() {
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

  // ─── Settings Check ───────────────────────────────────────────────────────

  async function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get({
        autoAnalyze: true,
        showOverlay: true
      }, resolve);
    });
  }

  // ─── DOM Observer ─────────────────────────────────────────────────────────

  async function init() {
    const settings = await getSettings();
    if (!settings.autoAnalyze) return;

    function check() {
      const el = scanForTosElements();
      if (el && settings.showOverlay) {
        showOverlay(el);
      }
    }

    // Initial scan after page settles
    setTimeout(check, 1500);

    // Watch for dynamic DOM changes (SPAs)
    const observer = new MutationObserver(() => {
      if (!overlayActive) check();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Manual trigger from popup
  window.addEventListener('fineprint:analyze', () => {
    if (!overlayActive) {
      detectedTosUrl = findTosUrl();
      showOverlay(null);
    }
  });

  // Only run on real page loads (not in iframes)
  if (window.self === window.top) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})();
