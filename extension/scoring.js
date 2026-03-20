// Fineprint - Scoring & Normalization Logic (testable module)
// Extracted from background.js

function normalizeSeverity(severity) {
  if (severity === 'critical') return 'red';
  if (severity === 'warning') return 'yellow';
  if (severity === 'info') return 'green';
  return severity;
}

function normalizeFinding(f) {
  f.severity = normalizeSeverity(f.severity);
  if (!f.summary) f.summary = f.title || f.description || '';
  return f;
}

function normalizeApiResponse(raw) {
  const data = {
    findings: [],
    privacy: [],
    security: [],
    behavior: [],
    overall_risk: raw.overall_risk || 'medium',
    summary: raw.summary || ''
  };
  for (const f of (raw.findings || [])) {
    normalizeFinding(f);
    data.findings.push(f);
    if (f.category === 'privacy') data.privacy.push(f);
    else if (f.category === 'security') data.security.push(f);
    else data.behavior.push(f);
  }
  return data;
}

function computeOverallScore(data) {
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeSeverity,
    normalizeFinding,
    normalizeApiResponse,
    computeOverallScore,
    computeScoreLabel
  };
}
