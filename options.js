// Fineprint - Options Script

const DEFAULTS = {
  apiKey: '',
  autoAnalyze: true,
  showOverlay: true,
  privacyLevel: 3,
  blockAdSharing: true,
  alertManipulation: true
};

const fields = {
  apiKey:           document.getElementById('api-key'),
  autoAnalyze:      document.getElementById('auto-analyze'),
  showOverlay:      document.getElementById('show-overlay'),
  privacyLevel:     document.getElementById('privacy-level'),
  privacyLevelVal:  document.getElementById('privacy-level-val'),
  blockAdSharing:   document.getElementById('block-ad-sharing'),
  alertManipulation: document.getElementById('alert-manipulation'),
  saveBtn:          document.getElementById('save-btn'),
  saveStatus:       document.getElementById('save-status')
};

// ─── Load saved settings ──────────────────────────────────────────────────

chrome.storage.sync.get(DEFAULTS, (settings) => {
  fields.apiKey.value               = settings.apiKey || '';
  fields.autoAnalyze.checked        = settings.autoAnalyze;
  fields.showOverlay.checked        = settings.showOverlay;
  fields.privacyLevel.value         = settings.privacyLevel;
  fields.privacyLevelVal.textContent = settings.privacyLevel;
  fields.blockAdSharing.checked     = settings.blockAdSharing;
  fields.alertManipulation.checked  = settings.alertManipulation;
});

// ─── Live slider value display ────────────────────────────────────────────

fields.privacyLevel.addEventListener('input', () => {
  fields.privacyLevelVal.textContent = fields.privacyLevel.value;
});

// ─── Save ─────────────────────────────────────────────────────────────────

fields.saveBtn.addEventListener('click', () => {
  const settings = {
    apiKey:            fields.apiKey.value.trim(),
    autoAnalyze:       fields.autoAnalyze.checked,
    showOverlay:       fields.showOverlay.checked,
    privacyLevel:      parseInt(fields.privacyLevel.value, 10),
    blockAdSharing:    fields.blockAdSharing.checked,
    alertManipulation: fields.alertManipulation.checked
  };

  chrome.storage.sync.set(settings, () => {
    fields.saveStatus.textContent = '✅ Settings saved!';
    setTimeout(() => {
      fields.saveStatus.textContent = '';
    }, 2500);
  });
});
