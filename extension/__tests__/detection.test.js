/**
 * @jest-environment jsdom
 */

const {
  matchesButtonPattern,
  matchesLabelPattern,
  matchesHrefPattern,
  findTosUrl,
  scanForTosElements
} = require('../detection');

// ─── Button Pattern Matching ────────────────────────────────────────────────

describe('matchesButtonPattern', () => {
  // English
  test('matches "Accept"', () => expect(matchesButtonPattern('Accept')).toBe(true));
  test('matches "I Agree"', () => expect(matchesButtonPattern('I Agree')).toBe(true));
  test('matches "Agree and Continue"', () => expect(matchesButtonPattern('Agree and Continue')).toBe(true));
  test('matches "Agree & Continue"', () => expect(matchesButtonPattern('Agree & Continue')).toBe(true));
  test('matches "Accept All"', () => expect(matchesButtonPattern('Accept All')).toBe(true));
  test('matches "Accept Terms"', () => expect(matchesButtonPattern('Accept Terms')).toBe(true));
  test('matches "Accept and Continue"', () => expect(matchesButtonPattern('Accept and Continue')).toBe(true));
  test('case insensitive: "ACCEPT"', () => expect(matchesButtonPattern('ACCEPT')).toBe(true));
  test('case insensitive: "i agree"', () => expect(matchesButtonPattern('i agree')).toBe(true));

  // Spanish
  test('matches "Siguiente"', () => expect(matchesButtonPattern('Siguiente')).toBe(true));
  test('matches "Continuar"', () => expect(matchesButtonPattern('Continuar')).toBe(true));
  test('matches "Aceptar"', () => expect(matchesButtonPattern('Aceptar')).toBe(true));
  test('matches "Acepto"', () => expect(matchesButtonPattern('Acepto')).toBe(true));

  // French
  test('matches "J\'accepte"', () => expect(matchesButtonPattern("J'accepte")).toBe(true));
  test('matches "Accepter"', () => expect(matchesButtonPattern('Accepter')).toBe(true));

  // German
  test('matches "Akzeptieren"', () => expect(matchesButtonPattern('Akzeptieren')).toBe(true));
  test('matches "Ich stimme zu"', () => expect(matchesButtonPattern('Ich stimme zu')).toBe(true));

  // Portuguese
  test('matches "Concordo"', () => expect(matchesButtonPattern('Concordo')).toBe(true));
  test('matches "Aceitar"', () => expect(matchesButtonPattern('Aceitar')).toBe(true));

  // Should NOT match
  test('does not match "Login"', () => expect(matchesButtonPattern('Login')).toBe(false));
  test('does not match "Sign Up"', () => expect(matchesButtonPattern('Sign Up')).toBe(false));
  test('does not match "Submit"', () => expect(matchesButtonPattern('Submit')).toBe(false));
  test('does not match "Cancel"', () => expect(matchesButtonPattern('Cancel')).toBe(false));
  test('does not match "Next"', () => expect(matchesButtonPattern('Next')).toBe(false));
  test('does not match empty string', () => expect(matchesButtonPattern('')).toBe(false));

  // Edge: button text with whitespace
  test('matches "  Accept  " (padded)', () => expect(matchesButtonPattern('  Accept  ')).toBe(true));
});

// ─── Label Pattern Matching ─────────────────────────────────────────────────

describe('matchesLabelPattern', () => {
  // English
  test('matches "terms"', () => expect(matchesLabelPattern('terms')).toBe(true));
  test('matches "privacy"', () => expect(matchesLabelPattern('privacy')).toBe(true));
  test('matches "Terms of Service"', () => expect(matchesLabelPattern('Terms of Service')).toBe(true));
  test('matches "terms and conditions"', () => expect(matchesLabelPattern('terms and conditions')).toBe(true));
  test('matches "privacy policy"', () => expect(matchesLabelPattern('privacy policy')).toBe(true));
  test('matches "agree"', () => expect(matchesLabelPattern('agree')).toBe(true));
  test('matches "tos"', () => expect(matchesLabelPattern('tos')).toBe(true));

  // Spanish
  test('matches "términos"', () => expect(matchesLabelPattern('términos')).toBe(true));
  test('matches "condiciones"', () => expect(matchesLabelPattern('condiciones')).toBe(true));
  test('matches "privacidad"', () => expect(matchesLabelPattern('privacidad')).toBe(true));

  // French
  test('matches "politique de confidentialité"', () => expect(matchesLabelPattern('politique de confidentialité')).toBe(true));
  test('matches "conditions d\'utilisation"', () => expect(matchesLabelPattern("conditions d'utilisation")).toBe(true));

  // German
  test('matches "datenschutz"', () => expect(matchesLabelPattern('datenschutz')).toBe(true));
  test('matches "nutzungsbedingungen"', () => expect(matchesLabelPattern('nutzungsbedingungen')).toBe(true));

  // Portuguese
  test('matches "termos"', () => expect(matchesLabelPattern('termos')).toBe(true));
  test('matches "privacidade"', () => expect(matchesLabelPattern('privacidade')).toBe(true));

  // In context (Yahoo-style text)
  test('matches "Al hacer clic en Siguiente, aceptas los Términos"', () => {
    expect(matchesLabelPattern('Al hacer clic en Siguiente, aceptas los Términos y la Política de privacidad de Yahoo')).toBe(true);
  });

  // Should NOT match
  test('does not match "Login form"', () => expect(matchesLabelPattern('Login form')).toBe(false));
  test('does not match "Create account"', () => expect(matchesLabelPattern('Create account')).toBe(false));
});

// ─── Href Pattern Matching ──────────────────────────────────────────────────

describe('matchesHrefPattern', () => {
  // English paths
  test('matches /terms', () => expect(matchesHrefPattern('/terms')).toBe(true));
  test('matches /privacy', () => expect(matchesHrefPattern('/privacy')).toBe(true));
  test('matches /tos', () => expect(matchesHrefPattern('/tos')).toBe(true));
  test('matches /legal', () => expect(matchesHrefPattern('/legal')).toBe(true));
  test('matches /conditions', () => expect(matchesHrefPattern('/conditions')).toBe(true));
  test('matches /eula', () => expect(matchesHrefPattern('/eula')).toBe(true));
  test('matches /user-agreement', () => expect(matchesHrefPattern('/user-agreement')).toBe(true));

  // Spanish paths
  test('matches /terminos', () => expect(matchesHrefPattern('/terminos')).toBe(true));
  test('matches /privacidad', () => expect(matchesHrefPattern('/privacidad')).toBe(true));

  // German paths
  test('matches /datenschutz', () => expect(matchesHrefPattern('/datenschutz')).toBe(true));

  // French paths
  test('matches /politique', () => expect(matchesHrefPattern('/politique')).toBe(true));
  test('matches /confidentialite', () => expect(matchesHrefPattern('/confidentialite')).toBe(true));

  // Legal subdomains
  test('matches legal.yahoo.com', () => expect(matchesHrefPattern('https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html')).toBe(true));
  test('matches legal.google.com', () => expect(matchesHrefPattern('https://legal.google.com/terms')).toBe(true));
  test('matches legal.spotify.com', () => expect(matchesHrefPattern('https://legal.spotify.com/privacy')).toBe(true));

  // Full URLs with paths
  test('matches https://example.com/terms', () => expect(matchesHrefPattern('https://example.com/terms')).toBe(true));
  test('matches https://example.com/privacy-policy', () => expect(matchesHrefPattern('https://example.com/privacy-policy')).toBe(true));
  test('matches https://example.com/legal/terms', () => expect(matchesHrefPattern('https://example.com/legal/terms')).toBe(true));

  // Should NOT match
  test('does not match /about', () => expect(matchesHrefPattern('/about')).toBe(false));
  test('does not match /login', () => expect(matchesHrefPattern('/login')).toBe(false));
  test('does not match /signup', () => expect(matchesHrefPattern('/signup')).toBe(false));
  test('does not match https://example.com/', () => expect(matchesHrefPattern('https://example.com/')).toBe(false));
});

// ─── findTosUrl (DOM-based) ─────────────────────────────────────────────────

describe('findTosUrl', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('finds link with /terms href', () => {
    document.body.innerHTML = '<a href="https://example.com/terms">Terms</a>';
    expect(findTosUrl(document)).toBe('https://example.com/terms');
  });

  test('finds link with /privacy href', () => {
    document.body.innerHTML = '<a href="https://example.com/privacy">Privacy</a>';
    expect(findTosUrl(document)).toBe('https://example.com/privacy');
  });

  test('finds Yahoo legal subdomain link', () => {
    document.body.innerHTML = '<a href="https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html">Términos</a>';
    expect(findTosUrl(document)).toBe('https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html');
  });

  test('finds first matching link when multiple exist', () => {
    document.body.innerHTML = `
      <a href="https://example.com/about">About</a>
      <a href="https://example.com/terms">Terms</a>
      <a href="https://example.com/privacy">Privacy</a>
    `;
    expect(findTosUrl(document)).toBe('https://example.com/terms');
  });

  test('returns null when no ToS links found', () => {
    document.body.innerHTML = '<a href="https://example.com/about">About</a>';
    expect(findTosUrl(document)).toBeNull();
  });

  test('finds /legal path link', () => {
    document.body.innerHTML = '<a href="https://example.com/legal/notice">Legal</a>';
    expect(findTosUrl(document)).toBe('https://example.com/legal/notice');
  });

  test('finds /eula link', () => {
    document.body.innerHTML = '<a href="https://example.com/eula">EULA</a>';
    expect(findTosUrl(document)).toBe('https://example.com/eula');
  });
});

// ─── scanForTosElements (DOM-based) ─────────────────────────────────────────

describe('scanForTosElements', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  // Strategy 1: Accept-like button text
  test('detects "Accept" button', () => {
    document.body.innerHTML = '<button>Accept</button>';
    const el = scanForTosElements(document, false);
    expect(el).not.toBeNull();
    expect(el.textContent).toBe('Accept');
  });

  test('detects "I Agree" button', () => {
    document.body.innerHTML = '<button>I Agree</button>';
    const el = scanForTosElements(document, false);
    expect(el).not.toBeNull();
  });

  test('detects "Aceptar" button (Spanish)', () => {
    document.body.innerHTML = '<button>Aceptar</button>';
    const el = scanForTosElements(document, false);
    expect(el).not.toBeNull();
  });

  test('detects "Accepter" button (French)', () => {
    document.body.innerHTML = '<button>Accepter</button>';
    const el = scanForTosElements(document, false);
    expect(el).not.toBeNull();
  });

  test('detects "Akzeptieren" button (German)', () => {
    document.body.innerHTML = '<button>Akzeptieren</button>';
    const el = scanForTosElements(document, false);
    expect(el).not.toBeNull();
  });

  test('detects input[type="submit"] with accept value', () => {
    document.body.innerHTML = '<input type="submit" value="Accept Terms" />';
    const el = scanForTosElements(document, false);
    expect(el).not.toBeNull();
  });

  test('detects a[role="button"] with accept text', () => {
    document.body.innerHTML = '<a role="button">Accept All</a>';
    const el = scanForTosElements(document, false);
    expect(el).not.toBeNull();
  });

  // Strategy 2: Button near ToS text (Yahoo pattern)
  test('detects "Siguiente" button near "Términos" text (Yahoo signup)', () => {
    document.body.innerHTML = `
      <div>
        <p>Al hacer clic en Siguiente, aceptas los <a href="https://legal.yahoo.com/terms">Términos</a></p>
        <button>Siguiente</button>
      </div>
    `;
    const el = scanForTosElements(document, false);
    expect(el).not.toBeNull();
    expect(el.textContent).toBe('Siguiente');
  });

  test('detects "Next" button near "terms" text', () => {
    document.body.innerHTML = `
      <div>
        <p>By clicking Next, you agree to the <a href="/terms">terms of service</a></p>
        <button>Next</button>
      </div>
    `;
    const el = scanForTosElements(document, false);
    expect(el).not.toBeNull();
    expect(el.textContent).toBe('Next');
  });

  test('detects "Submit" button near "privacy policy" text', () => {
    document.body.innerHTML = `
      <form>
        <p>I agree to the <a href="/privacy">privacy policy</a></p>
        <button>Submit</button>
      </form>
    `;
    const el = scanForTosElements(document, false);
    expect(el).not.toBeNull();
    expect(el.textContent).toBe('Submit');
  });

  test('detects "Continuar" button near "condiciones" text (Spanish)', () => {
    document.body.innerHTML = `
      <div>
        <p>Acepta las condiciones de uso</p>
        <button>Continuar</button>
      </div>
    `;
    const el = scanForTosElements(document, false);
    // "Continuar" matches button pattern directly
    const el2 = scanForTosElements(document, false);
    expect(el2).not.toBeNull();
  });

  // Strategy 3: Checkbox near terms text
  test('detects checkbox near "terms" with submit button in form', () => {
    document.body.innerHTML = `
      <form>
        <label>
          <input type="checkbox" /> I agree to the terms and conditions
        </label>
        <button type="submit">Submit</button>
      </form>
    `;
    const el = scanForTosElements(document, false);
    expect(el).not.toBeNull();
    expect(el.tagName).toBe('BUTTON');
    expect(el.type).toBe('submit');
  });

  test('detects checkbox near "privacy policy" text', () => {
    document.body.innerHTML = `
      <div>
        <label>
          <input type="checkbox" /> I accept the privacy policy
        </label>
      </div>
    `;
    const el = scanForTosElements(document, false);
    expect(el).not.toBeNull();
    expect(el.type).toBe('checkbox');
  });

  // Should NOT detect
  test('does not detect regular login button', () => {
    document.body.innerHTML = '<button>Log In</button>';
    expect(scanForTosElements(document, false)).toBeNull();
  });

  test('does not detect signup button without ToS text nearby', () => {
    document.body.innerHTML = `
      <form>
        <input type="text" placeholder="Email" />
        <button>Sign Up</button>
      </form>
    `;
    expect(scanForTosElements(document, false)).toBeNull();
  });

  test('returns null when overlayActive is true', () => {
    document.body.innerHTML = '<button>Accept</button>';
    expect(scanForTosElements(document, true)).toBeNull();
  });

  test('does not detect checkbox without ToS text nearby', () => {
    document.body.innerHTML = `
      <form>
        <label><input type="checkbox" /> Remember me</label>
        <button type="submit">Login</button>
      </form>
    `;
    expect(scanForTosElements(document, false)).toBeNull();
  });
});

// ─── Real-world page simulations ────────────────────────────────────────────

describe('real-world page simulations', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('Yahoo signup page (Spanish)', () => {
    document.body.innerHTML = `
      <div>
        <h1>Crear una cuenta de Yahoo</h1>
        <form>
          <input type="text" placeholder="Nombre" />
          <input type="text" placeholder="Apellidos" />
          <input type="email" placeholder="correo electronico" />
          <input type="password" placeholder="Contrasena" />
          <p>Al hacer clic en <strong>Siguiente</strong>, aceptas los
            <a href="https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html">Términos</a>
            y la <a href="https://legal.yahoo.com/us/en/yahoo/privacy/index.html">Política de privacidad</a> de Yahoo
          </p>
          <button>Siguiente</button>
        </form>
      </div>
    `;

    // Should detect the button
    const el = scanForTosElements(document, false);
    expect(el).not.toBeNull();
    expect(el.textContent).toBe('Siguiente');

    // Should find the ToS URL
    const url = findTosUrl(document);
    expect(url).toBe('https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html');
  });

  test('Google-style signup (English)', () => {
    document.body.innerHTML = `
      <div>
        <h1>Create your Google Account</h1>
        <form>
          <input type="text" placeholder="Username" />
          <input type="password" placeholder="Password" />
          <p>By clicking Agree, you agree to the
            <a href="https://policies.google.com/terms">Google Terms of Service</a>.
          </p>
          <button>Agree</button>
        </form>
      </div>
    `;

    const el = scanForTosElements(document, false);
    expect(el).not.toBeNull();

    const url = findTosUrl(document);
    expect(url).toContain('/terms');
  });

  test('Cookie consent banner', () => {
    document.body.innerHTML = `
      <div class="cookie-banner">
        <p>We use cookies. See our <a href="/privacy">privacy policy</a>.</p>
        <button>Accept All</button>
        <button>Manage Preferences</button>
      </div>
    `;

    const el = scanForTosElements(document, false);
    expect(el).not.toBeNull();
    expect(el.textContent).toBe('Accept All');
  });

  test('GDPR consent form (German)', () => {
    document.body.innerHTML = `
      <div>
        <h2>Datenschutz</h2>
        <p>Bitte lesen Sie unsere <a href="/datenschutz">Datenschutzrichtlinien</a>.</p>
        <button>Akzeptieren</button>
      </div>
    `;

    const el = scanForTosElements(document, false);
    expect(el).not.toBeNull();

    const url = findTosUrl(document);
    expect(url).toContain('/datenschutz');
  });

  test('French terms acceptance', () => {
    document.body.innerHTML = `
      <div>
        <p>En continuant, vous acceptez les <a href="/conditions">conditions d'utilisation</a>
        et la <a href="/confidentialite">politique de confidentialité</a>.</p>
        <button>Accepter</button>
      </div>
    `;

    const el = scanForTosElements(document, false);
    expect(el).not.toBeNull();

    const url = findTosUrl(document);
    expect(url).toContain('/conditions');
  });

  test('Checkbox-based consent (common pattern)', () => {
    document.body.innerHTML = `
      <form>
        <div>
          <label>
            <input type="checkbox" id="agree" />
            I have read and agree to the <a href="/terms">Terms of Service</a>
            and <a href="/privacy">Privacy Policy</a>.
          </label>
        </div>
        <button type="submit">Create Account</button>
      </form>
    `;

    const el = scanForTosElements(document, false);
    expect(el).not.toBeNull();
    // Should return the submit button (not the checkbox)
    expect(el.tagName).toBe('BUTTON');

    const url = findTosUrl(document);
    expect(url).toContain('/terms');
  });

  test('SPA with dynamically-rendered ToS (simulated)', () => {
    // Initially empty
    expect(scanForTosElements(document, false)).toBeNull();

    // Then ToS appears
    document.body.innerHTML = `
      <div id="modal">
        <h2>Terms of Service</h2>
        <p>Please accept our terms to continue.</p>
        <button>I Agree</button>
      </div>
    `;
    const el = scanForTosElements(document, false);
    expect(el).not.toBeNull();
    expect(el.textContent).toBe('I Agree');
  });

  test('Page with NO ToS elements', () => {
    document.body.innerHTML = `
      <div>
        <h1>Welcome to our blog</h1>
        <p>Read our latest articles.</p>
        <a href="/about">About Us</a>
        <a href="/contact">Contact</a>
        <button>Subscribe to Newsletter</button>
      </div>
    `;

    expect(scanForTosElements(document, false)).toBeNull();
    expect(findTosUrl(document)).toBeNull();
  });

  test('Portuguese signup page', () => {
    document.body.innerHTML = `
      <div>
        <p>Ao continuar, você aceita os <a href="/termos">termos de uso</a>
        e a <a href="/privacidade">política de privacidade</a>.</p>
        <button>Concordo</button>
      </div>
    `;

    const el = scanForTosElements(document, false);
    expect(el).not.toBeNull();
    expect(el.textContent).toBe('Concordo');
  });
});
