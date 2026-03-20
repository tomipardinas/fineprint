// Fineprint - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const lastSiteName = document.getElementById('last-site-name');
  const lastScore = document.getElementById('last-score');
  const scoreDot = document.getElementById('score-dot');
  const scoreText = document.getElementById('score-text');
  const analyzeBtn = document.getElementById('analyze-btn');
  const statusEl = document.getElementById('status');
  const settingsLink = document.getElementById('settings-link');

  // ─── Load last analyzed site ──────────────────────────────────────────────

  chrome.storage.local.get(['lastAnalyzed'], (result) => {
    if (result.lastAnalyzed) {
      const { url, score, label } = result.lastAnalyzed;
      try {
        const hostname = new URL(url).hostname;
        lastSiteName.textContent = hostname;
        lastSiteName.classList.remove('empty');
      } catch {
        lastSiteName.textContent = url;
      }
      if (score) {
        lastScore.style.display = 'flex';
        scoreDot.className = `score-dot ${score}`;
        scoreText.textContent = label || score;
      }
    }
  });

  // ─── Analyze current page ─────────────────────────────────────────────────

  analyzeBtn.addEventListener('click', async () => {
    analyzeBtn.disabled = true;
    statusEl.textContent = 'Analyzing…';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        statusEl.textContent = 'No active tab found.';
        analyzeBtn.disabled = false;
        return;
      }

      // Send message to content script to trigger analysis
      await chrome.tabs.sendMessage(tab.id, { type: 'FINEPRINT_ANALYZE' });

      statusEl.textContent = 'Overlay triggered on page!';
    } catch (err) {
      console.error('[Fineprint popup]', err);
      statusEl.textContent = 'Could not analyze this page.';
    } finally {
      analyzeBtn.disabled = false;
    }
  });

  // ─── Settings link ────────────────────────────────────────────────────────

  settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});
