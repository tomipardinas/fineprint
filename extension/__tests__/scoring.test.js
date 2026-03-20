const {
  normalizeSeverity,
  normalizeFinding,
  normalizeApiResponse,
  computeOverallScore,
  computeScoreLabel
} = require('../scoring');

// ─── normalizeSeverity ──────────────────────────────────────────────────────

describe('normalizeSeverity', () => {
  test('maps "critical" to "red"', () => expect(normalizeSeverity('critical')).toBe('red'));
  test('maps "warning" to "yellow"', () => expect(normalizeSeverity('warning')).toBe('yellow'));
  test('maps "info" to "green"', () => expect(normalizeSeverity('info')).toBe('green'));
  test('passes through "red" unchanged', () => expect(normalizeSeverity('red')).toBe('red'));
  test('passes through "yellow" unchanged', () => expect(normalizeSeverity('yellow')).toBe('yellow'));
  test('passes through "green" unchanged', () => expect(normalizeSeverity('green')).toBe('green'));
  test('passes through unknown values', () => expect(normalizeSeverity('unknown')).toBe('unknown'));
});

// ─── normalizeFinding ───────────────────────────────────────────────────────

describe('normalizeFinding', () => {
  test('maps severity and creates summary from title', () => {
    const f = { severity: 'critical', title: 'Data shared', description: 'Your data is shared with advertisers' };
    normalizeFinding(f);
    expect(f.severity).toBe('red');
    expect(f.summary).toBe('Data shared');
  });

  test('falls back to description if no title', () => {
    const f = { severity: 'warning', description: 'Opt-out only' };
    normalizeFinding(f);
    expect(f.severity).toBe('yellow');
    expect(f.summary).toBe('Opt-out only');
  });

  test('does not overwrite existing summary', () => {
    const f = { severity: 'info', summary: 'Already set', title: 'Different' };
    normalizeFinding(f);
    expect(f.summary).toBe('Already set');
  });

  test('sets empty summary if no title or description', () => {
    const f = { severity: 'info' };
    normalizeFinding(f);
    expect(f.summary).toBe('');
  });

  test('handles already-normalized severity', () => {
    const f = { severity: 'red', title: 'Test' };
    normalizeFinding(f);
    expect(f.severity).toBe('red');
    expect(f.summary).toBe('Test');
  });
});

// ─── normalizeApiResponse ───────────────────────────────────────────────────

describe('normalizeApiResponse', () => {
  test('groups findings by category', () => {
    const raw = {
      findings: [
        { category: 'privacy', severity: 'critical', title: 'Data collection' },
        { category: 'security', severity: 'warning', title: 'Weak encryption' },
        { category: 'behavior', severity: 'info', title: 'Cookie usage' }
      ],
      overall_risk: 'high',
      summary: 'Test summary'
    };

    const result = normalizeApiResponse(raw);
    expect(result.privacy).toHaveLength(1);
    expect(result.security).toHaveLength(1);
    expect(result.behavior).toHaveLength(1);
    expect(result.findings).toHaveLength(3);
    expect(result.overall_risk).toBe('high');
    expect(result.summary).toBe('Test summary');
  });

  test('normalizes severities in grouped findings', () => {
    const raw = {
      findings: [
        { category: 'privacy', severity: 'critical', title: 'P1' },
        { category: 'privacy', severity: 'warning', title: 'P2' },
        { category: 'privacy', severity: 'info', title: 'P3' }
      ]
    };

    const result = normalizeApiResponse(raw);
    expect(result.privacy[0].severity).toBe('red');
    expect(result.privacy[1].severity).toBe('yellow');
    expect(result.privacy[2].severity).toBe('green');
  });

  test('handles empty findings array', () => {
    const result = normalizeApiResponse({ findings: [] });
    expect(result.findings).toHaveLength(0);
    expect(result.privacy).toHaveLength(0);
    expect(result.security).toHaveLength(0);
    expect(result.behavior).toHaveLength(0);
  });

  test('handles missing findings key', () => {
    const result = normalizeApiResponse({});
    expect(result.findings).toHaveLength(0);
    expect(result.overall_risk).toBe('medium');
    expect(result.summary).toBe('');
  });

  test('defaults overall_risk to medium', () => {
    const result = normalizeApiResponse({ findings: [] });
    expect(result.overall_risk).toBe('medium');
  });

  test('defaults summary to empty string', () => {
    const result = normalizeApiResponse({ findings: [] });
    expect(result.summary).toBe('');
  });

  test('puts unknown categories into behavior', () => {
    const raw = {
      findings: [
        { category: 'unknown_category', severity: 'warning', title: 'Weird' }
      ]
    };
    const result = normalizeApiResponse(raw);
    expect(result.behavior).toHaveLength(1);
    expect(result.privacy).toHaveLength(0);
    expect(result.security).toHaveLength(0);
  });

  test('creates summary from title for each finding', () => {
    const raw = {
      findings: [
        { category: 'privacy', severity: 'critical', title: 'Shares data', description: 'Long description' }
      ]
    };
    const result = normalizeApiResponse(raw);
    expect(result.privacy[0].summary).toBe('Shares data');
  });

  test('multiple findings per category', () => {
    const raw = {
      findings: [
        { category: 'privacy', severity: 'critical', title: 'A' },
        { category: 'privacy', severity: 'warning', title: 'B' },
        { category: 'security', severity: 'critical', title: 'C' },
        { category: 'security', severity: 'info', title: 'D' },
        { category: 'behavior', severity: 'warning', title: 'E' }
      ]
    };
    const result = normalizeApiResponse(raw);
    expect(result.privacy).toHaveLength(2);
    expect(result.security).toHaveLength(2);
    expect(result.behavior).toHaveLength(1);
    expect(result.findings).toHaveLength(5);
  });
});

// ─── computeOverallScore ────────────────────────────────────────────────────

describe('computeOverallScore', () => {
  test('returns "red" when any finding is red', () => {
    const data = {
      privacy: [{ severity: 'red' }],
      security: [{ severity: 'green' }],
      behavior: []
    };
    expect(computeOverallScore(data)).toBe('red');
  });

  test('returns "red" when any finding is critical (pre-normalization)', () => {
    const data = {
      privacy: [{ severity: 'critical' }],
      security: [],
      behavior: []
    };
    expect(computeOverallScore(data)).toBe('red');
  });

  test('returns "yellow" when findings have warning but no red', () => {
    const data = {
      privacy: [{ severity: 'yellow' }],
      security: [{ severity: 'green' }],
      behavior: []
    };
    expect(computeOverallScore(data)).toBe('yellow');
  });

  test('returns "yellow" for pre-normalized "warning"', () => {
    const data = {
      privacy: [{ severity: 'warning' }],
      security: [],
      behavior: []
    };
    expect(computeOverallScore(data)).toBe('yellow');
  });

  test('returns "green" when all findings are green/info', () => {
    const data = {
      privacy: [{ severity: 'green' }],
      security: [{ severity: 'green' }],
      behavior: [{ severity: 'green' }]
    };
    expect(computeOverallScore(data)).toBe('green');
  });

  test('returns "green" when no findings', () => {
    const data = { privacy: [], security: [], behavior: [] };
    expect(computeOverallScore(data)).toBe('green');
  });

  test('returns "green" with empty/missing arrays', () => {
    expect(computeOverallScore({})).toBe('green');
  });

  test('red overrides yellow', () => {
    const data = {
      privacy: [{ severity: 'red' }],
      security: [{ severity: 'yellow' }],
      behavior: [{ severity: 'green' }]
    };
    expect(computeOverallScore(data)).toBe('red');
  });
});

// ─── computeScoreLabel ──────────────────────────────────────────────────────

describe('computeScoreLabel', () => {
  test('returns "High Risk" for red score', () => {
    const data = { privacy: [{ severity: 'red' }], security: [], behavior: [] };
    expect(computeScoreLabel(data)).toBe('High Risk');
  });

  test('returns "Some Concerns" for yellow score', () => {
    const data = { privacy: [{ severity: 'yellow' }], security: [], behavior: [] };
    expect(computeScoreLabel(data)).toBe('Some Concerns');
  });

  test('returns "Looks OK" for green score', () => {
    const data = { privacy: [{ severity: 'green' }], security: [], behavior: [] };
    expect(computeScoreLabel(data)).toBe('Looks OK');
  });

  test('returns "Looks OK" for empty data', () => {
    expect(computeScoreLabel({ privacy: [], security: [], behavior: [] })).toBe('Looks OK');
  });
});

// ─── End-to-end: API response → score ───────────────────────────────────────

describe('end-to-end: raw API response to final score', () => {
  test('critical finding → red → High Risk', () => {
    const raw = {
      findings: [
        { category: 'privacy', severity: 'critical', title: 'Sells your data' }
      ],
      overall_risk: 'high'
    };
    const normalized = normalizeApiResponse(raw);
    expect(computeOverallScore(normalized)).toBe('red');
    expect(computeScoreLabel(normalized)).toBe('High Risk');
    expect(normalized.privacy[0].summary).toBe('Sells your data');
    expect(normalized.privacy[0].severity).toBe('red');
  });

  test('warning findings only → yellow → Some Concerns', () => {
    const raw = {
      findings: [
        { category: 'behavior', severity: 'warning', title: 'Dark patterns detected' },
        { category: 'privacy', severity: 'info', title: 'Standard cookies' }
      ],
      overall_risk: 'medium'
    };
    const normalized = normalizeApiResponse(raw);
    expect(computeOverallScore(normalized)).toBe('yellow');
    expect(computeScoreLabel(normalized)).toBe('Some Concerns');
  });

  test('info-only findings → green → Looks OK', () => {
    const raw = {
      findings: [
        { category: 'privacy', severity: 'info', title: 'Standard data collection' },
        { category: 'security', severity: 'info', title: 'Uses HTTPS' }
      ],
      overall_risk: 'low'
    };
    const normalized = normalizeApiResponse(raw);
    expect(computeOverallScore(normalized)).toBe('green');
    expect(computeScoreLabel(normalized)).toBe('Looks OK');
  });

  test('mixed severity → worst wins', () => {
    const raw = {
      findings: [
        { category: 'privacy', severity: 'info', title: 'OK' },
        { category: 'security', severity: 'warning', title: 'Meh' },
        { category: 'behavior', severity: 'critical', title: 'Bad!' }
      ]
    };
    const normalized = normalizeApiResponse(raw);
    expect(computeOverallScore(normalized)).toBe('red');
    expect(computeScoreLabel(normalized)).toBe('High Risk');
  });
});
