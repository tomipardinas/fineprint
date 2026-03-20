/**
 * @jest-environment jsdom
 */

// Tests for overlay rendering logic
// We import detection for scanForTosElements and scoring for normalization,
// then test the overlay rendering logic extracted here.

const { normalizeApiResponse } = require('../scoring');

// ─── Overlay HTML structure ─────────────────────────────────────────────────

function createOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'fineprint-overlay';
  overlay.innerHTML = `
    <div class="fp-backdrop"></div>
    <div class="fp-card" role="dialog" aria-modal="true" aria-label="Fineprint ToS Analysis">
      <div class="fp-header">
        <span class="fp-logo">Fineprint</span>
      </div>
      <div class="fp-body">
        <div class="fp-loading" id="fp-loading">
          <div class="fp-spinner"></div>
          <p>Analyzing Terms of Service...</p>
        </div>
        <div class="fp-results" id="fp-results" style="display:none;">
          <div class="fp-section" id="fp-privacy-section">
            <h3>Privacy</h3>
            <ul class="fp-findings" id="fp-privacy-findings"></ul>
          </div>
          <div class="fp-section" id="fp-security-section">
            <h3>Security</h3>
            <ul class="fp-findings" id="fp-security-findings"></ul>
          </div>
          <div class="fp-section" id="fp-behavior-section">
            <h3>Behavior</h3>
            <ul class="fp-findings" id="fp-behavior-findings"></ul>
          </div>
        </div>
        <div class="fp-error" id="fp-error" style="display:none;">
          <p>Could not analyze this Terms of Service.</p>
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

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('overlay creation', () => {
  test('creates overlay with correct id', () => {
    const overlay = createOverlay();
    expect(overlay.id).toBe('fineprint-overlay');
  });

  test('has backdrop element', () => {
    const overlay = createOverlay();
    expect(overlay.querySelector('.fp-backdrop')).not.toBeNull();
  });

  test('has dialog card with correct role', () => {
    const overlay = createOverlay();
    const card = overlay.querySelector('.fp-card');
    expect(card).not.toBeNull();
    expect(card.getAttribute('role')).toBe('dialog');
    expect(card.getAttribute('aria-modal')).toBe('true');
  });

  test('has loading spinner visible by default', () => {
    const overlay = createOverlay();
    const loading = overlay.querySelector('#fp-loading');
    expect(loading).not.toBeNull();
    expect(loading.style.display).not.toBe('none');
  });

  test('has results hidden by default', () => {
    const overlay = createOverlay();
    const results = overlay.querySelector('#fp-results');
    expect(results.style.display).toBe('none');
  });

  test('has error hidden by default', () => {
    const overlay = createOverlay();
    const error = overlay.querySelector('#fp-error');
    expect(error.style.display).toBe('none');
  });

  test('has both action buttons', () => {
    const overlay = createOverlay();
    expect(overlay.querySelector('#fp-accept-anyway')).not.toBeNull();
    expect(overlay.querySelector('#fp-block-me')).not.toBeNull();
  });

  test('has three finding sections', () => {
    const overlay = createOverlay();
    expect(overlay.querySelector('#fp-privacy-section')).not.toBeNull();
    expect(overlay.querySelector('#fp-security-section')).not.toBeNull();
    expect(overlay.querySelector('#fp-behavior-section')).not.toBeNull();
  });
});

describe('renderFindings', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.appendChild(createOverlay());
  });

  test('renders findings with correct severity dot class', () => {
    const findings = [
      { severity: 'red', summary: 'Bad thing' },
      { severity: 'yellow', summary: 'Meh thing' },
      { severity: 'green', summary: 'OK thing' }
    ];
    renderFindings(findings, 'fp-privacy-findings');
    const dots = document.querySelectorAll('#fp-privacy-findings .fp-dot');
    expect(dots[0].classList.contains('fp-dot-red')).toBe(true);
    expect(dots[1].classList.contains('fp-dot-yellow')).toBe(true);
    expect(dots[2].classList.contains('fp-dot-green')).toBe(true);
  });

  test('renders finding summary text', () => {
    renderFindings([{ severity: 'red', summary: 'Data sold to advertisers' }], 'fp-privacy-findings');
    const text = document.querySelector('#fp-privacy-findings .fp-finding-text');
    expect(text.textContent).toBe('Data sold to advertisers');
  });

  test('renders clause details when present', () => {
    renderFindings([{
      severity: 'red',
      summary: 'Bad clause',
      clause: 'We may share your data with anyone.'
    }], 'fp-privacy-findings');

    const details = document.querySelector('#fp-privacy-findings .fp-clause');
    expect(details).not.toBeNull();
    expect(details.querySelector('p').textContent).toBe('We may share your data with anyone.');
  });

  test('does not render clause details when absent', () => {
    renderFindings([{ severity: 'green', summary: 'Fine' }], 'fp-privacy-findings');
    expect(document.querySelector('#fp-privacy-findings .fp-clause')).toBeNull();
  });

  test('hides section when findings array is empty', () => {
    renderFindings([], 'fp-privacy-findings');
    const section = document.getElementById('fp-privacy-section');
    expect(section.style.display).toBe('none');
  });

  test('hides section when findings is null', () => {
    renderFindings(null, 'fp-privacy-findings');
    const section = document.getElementById('fp-privacy-section');
    expect(section.style.display).toBe('none');
  });

  test('defaults severity dot to yellow when missing', () => {
    renderFindings([{ summary: 'No severity' }], 'fp-privacy-findings');
    const dot = document.querySelector('#fp-privacy-findings .fp-dot');
    expect(dot.classList.contains('fp-dot-yellow')).toBe(true);
  });

  test('renders multiple findings in order', () => {
    const findings = [
      { severity: 'red', summary: 'First' },
      { severity: 'yellow', summary: 'Second' },
      { severity: 'green', summary: 'Third' }
    ];
    renderFindings(findings, 'fp-security-findings');
    const texts = document.querySelectorAll('#fp-security-findings .fp-finding-text');
    expect(texts).toHaveLength(3);
    expect(texts[0].textContent).toBe('First');
    expect(texts[1].textContent).toBe('Second');
    expect(texts[2].textContent).toBe('Third');
  });
});

describe('showResults', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.appendChild(createOverlay());
  });

  test('hides loading and shows results', () => {
    showResults({ privacy: [], security: [], behavior: [] });
    expect(document.getElementById('fp-loading').style.display).toBe('none');
    expect(document.getElementById('fp-results').style.display).toBe('block');
  });

  test('renders findings across all sections', () => {
    const data = {
      privacy: [{ severity: 'red', summary: 'Privacy issue' }],
      security: [{ severity: 'yellow', summary: 'Security issue' }],
      behavior: [{ severity: 'green', summary: 'Behavior note' }]
    };
    showResults(data);

    expect(document.querySelector('#fp-privacy-findings .fp-finding-text').textContent).toBe('Privacy issue');
    expect(document.querySelector('#fp-security-findings .fp-finding-text').textContent).toBe('Security issue');
    expect(document.querySelector('#fp-behavior-findings .fp-finding-text').textContent).toBe('Behavior note');
  });

  test('hides sections with no findings', () => {
    showResults({ privacy: [{ severity: 'red', summary: 'Issue' }], security: [], behavior: [] });
    expect(document.getElementById('fp-privacy-section').style.display).not.toBe('none');
    expect(document.getElementById('fp-security-section').style.display).toBe('none');
    expect(document.getElementById('fp-behavior-section').style.display).toBe('none');
  });
});

describe('showError', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.appendChild(createOverlay());
  });

  test('hides loading and shows error', () => {
    showError();
    expect(document.getElementById('fp-loading').style.display).toBe('none');
    expect(document.getElementById('fp-error').style.display).toBe('block');
  });

  test('results remain hidden on error', () => {
    showError();
    expect(document.getElementById('fp-results').style.display).toBe('none');
  });
});

// ─── Integration: API response → overlay rendering ─────────────────────────

describe('integration: normalizeApiResponse → overlay rendering', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.appendChild(createOverlay());
  });

  test('full pipeline: raw API response renders correctly in overlay', () => {
    const raw = {
      findings: [
        { category: 'privacy', severity: 'critical', title: 'Shares data with advertisers', description: 'Your personal data is sold', clause: 'We share data with third-party advertisers.' },
        { category: 'security', severity: 'warning', title: 'No breach notification', description: 'No guarantee of timely notification' },
        { category: 'behavior', severity: 'info', title: 'Standard cookies', description: 'Uses standard tracking cookies' }
      ],
      overall_risk: 'high',
      summary: 'This service has significant privacy concerns.'
    };

    const normalized = normalizeApiResponse(raw);
    showResults(normalized);

    // Check privacy section
    const privacyText = document.querySelector('#fp-privacy-findings .fp-finding-text');
    expect(privacyText.textContent).toBe('Shares data with advertisers');
    const privacyDot = document.querySelector('#fp-privacy-findings .fp-dot');
    expect(privacyDot.classList.contains('fp-dot-red')).toBe(true);
    const clause = document.querySelector('#fp-privacy-findings .fp-clause p');
    expect(clause.textContent).toBe('We share data with third-party advertisers.');

    // Check security section
    const securityDot = document.querySelector('#fp-security-findings .fp-dot');
    expect(securityDot.classList.contains('fp-dot-yellow')).toBe(true);

    // Check behavior section
    const behaviorDot = document.querySelector('#fp-behavior-findings .fp-dot');
    expect(behaviorDot.classList.contains('fp-dot-green')).toBe(true);
  });

  test('empty API response hides all sections', () => {
    const normalized = normalizeApiResponse({ findings: [] });
    showResults(normalized);

    expect(document.getElementById('fp-privacy-section').style.display).toBe('none');
    expect(document.getElementById('fp-security-section').style.display).toBe('none');
    expect(document.getElementById('fp-behavior-section').style.display).toBe('none');
  });
});
