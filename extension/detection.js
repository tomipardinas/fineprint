// Fineprint - Detection Logic (testable module)
// Extracted from content.js so it can be unit tested

const TOS_BUTTON_PATTERNS = /\b(accept|i agree|agree and continue|agree & continue|accept all|accept terms|accept and continue|siguiente|continuar|aceptar|acepto|j'accepte|accepter|akzeptieren|ich stimme zu|concordo|aceitar)\b/i;
const TOS_LABEL_PATTERNS = /(?:^|\s|[,.])(terms|privacy|agree|tos|terms of service|terms and conditions|privacy policy|términos|condiciones|privacidad|politique de confidentialité|conditions d'utilisation|datenschutz|nutzungsbedingungen|termos|privacidade)(?:\s|[,.]|$)/i;
const TOS_HREF_PATTERNS = /\/(terms|privacy|tos|legal|conditions|eula|user-agreement|terminos|privacidad|datenschutz|nutzungsbedingungen|politique|confidentialite)|legal\.\w+\.\w+/i;

function matchesButtonPattern(text) {
  return TOS_BUTTON_PATTERNS.test(text.trim());
}

function matchesLabelPattern(text) {
  return TOS_LABEL_PATTERNS.test(text);
}

function matchesHrefPattern(href) {
  return TOS_HREF_PATTERNS.test(href);
}

function isNearTosText(el) {
  const parent = el.closest('form, section, div, label') || el.parentElement;
  if (!parent) return false;
  return TOS_LABEL_PATTERNS.test(parent.innerText || parent.textContent || '');
}

function findTosUrl(doc) {
  const links = doc.querySelectorAll('a[href]');
  for (const link of links) {
    if (TOS_HREF_PATTERNS.test(link.href)) {
      return link.href;
    }
  }
  return null;
}

function scanForTosElements(doc, overlayActive) {
  if (overlayActive) return null;

  // 1. Buttons with accept-like text
  const buttons = doc.querySelectorAll('button, input[type="submit"], input[type="button"], a[role="button"]');
  for (const btn of buttons) {
    const text = btn.textContent || btn.value || '';
    if (TOS_BUTTON_PATTERNS.test(text.trim())) {
      return btn;
    }
  }

  // 2. Buttons near terms/privacy text
  for (const btn of buttons) {
    if (isNearTosText(btn)) {
      return btn;
    }
  }

  // 3. Checkboxes near terms text
  const checkboxes = doc.querySelectorAll('input[type="checkbox"]');
  for (const cb of checkboxes) {
    if (isNearTosText(cb)) {
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TOS_BUTTON_PATTERNS,
    TOS_LABEL_PATTERNS,
    TOS_HREF_PATTERNS,
    matchesButtonPattern,
    matchesLabelPattern,
    matchesHrefPattern,
    isNearTosText,
    findTosUrl,
    scanForTosElements
  };
}
