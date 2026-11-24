/** CommonJS mirror of assess.js for node:test */
const { GRADES, getProfile, scoreToGrade, deriveMetrics, MEDICAL_DISCLAIMER } = require('./standards.cjs.js');

function scoreMetric(value, spec) {
  if (value == null || !Number.isFinite(value)) {
    if (spec.optional) return { score: 70, ok: true, weight: spec.weight || 10 };
    return { score: 50, ok: false, weight: spec.weight || 10 };
  }
  const { min, max, ideal, weight, invert } = spec;
  let ok = true;
  let score = 100;
  if (invert) {
    if (value > max) {
      ok = false;
      score = Math.max(0, 100 - (value - max) * (max <= 5 ? 25 : 8));
    }
  } else {
    if (min != null && value < min) {
      ok = false;
      score = Math.max(0, 100 - (min - value) * (min > 50 ? 0.4 : 6));
    }
    if (max != null && value > max) {
      ok = false;
      score = Math.max(0, 100 - (value - max) * (max > 50 ? 0.4 : 6));
    }
  }
  if (ideal != null) {
    const dist = Math.abs(value - ideal);
    const range = max != null && min != null ? (max - min) / 2 : ideal * 0.2;
    score = Math.round(score * 0.6 + Math.max(0, 1 - dist / range) * 100 * 0.4);
  }
  return { score: Math.min(100, Math.max(0, Math.round(score))), ok, weight: weight || 10 };
}

function applySymptomAdjustments(score, profile, symptoms = {}) {
  if (!profile?.condition || !symptoms) return score;
  let adj = score;
  if (profile.condition === 'osa') {
    if (symptoms.snoring) adj -= 8;
    if (symptoms.daytimeSleepiness) adj -= 10;
  }
  if (profile.condition === 'parkinson') {
    if (symptoms.tremorAtNight) adj -= 6;
    if (symptoms.actingOutDreams) adj -= 12;
  }
  return Math.max(0, Math.min(100, adj));
}

function detectConditionRisks(profile, metrics, session, symptoms = {}) {
  const risks = [];
  if (!profile?.condition) return risks;

  if (profile.condition === 'osa') {
    const spo2Low = metrics.spo2Min != null && metrics.spo2Min < 90;
    const pattern =
      metrics.awakenings >= 5 && metrics.efficiency < 75 && (spo2Low || metrics.restingHrBpm > 68);
    const symptomBoost = symptoms.snoring && symptoms.daytimeSleepiness;
    if (pattern || (metrics.awakenings >= 4 && metrics.efficiency < 80 && symptomBoost)) {
      risks.push({ id: 'osa_suspected', level: spo2Low ? 'high' : 'moderate', title: '疑似阻塞性睡眠呼吸暂停' });
    }
    if (metrics.spo2Min != null && metrics.spo2Min < 88) {
      risks.push({ id: 'desaturation', level: 'high', title: '血氧去饱和' });
    }
  }

  if (profile.condition === 'parkinson') {
    const lowRem = metrics.remPct < 12;
    const fragmented = metrics.fragmentationIndex > 35 || metrics.awakenings >= 4;
    const rbdProxy = session.rbdRiskScore > 60 || session.remBehaviorFlag || (symptoms.actingOutDreams && lowRem);
    if (lowRem && fragmented) {
      risks.push({ id: 'pd_sleep_concern', level: rbdProxy ? 'high' : 'moderate', title: 'PD 相关睡眠障碍模式' });
    }
    if (rbdProxy) {
      risks.push({ id: 'rbd_risk', level: 'high', title: 'REM 行为障碍风险' });
    }
  }

  return risks;
}

function assessSession(session, profileId = 'adult', options = {}) {
  const profile = getProfile(profileId);
  const symptoms = options.symptoms || {};
  const metrics = deriveMetrics(session);
  const checks = [];
  for (const [key, spec] of Object.entries(profile.limits)) {
    const value = metrics[key];
    const result = scoreMetric(value, spec);
    checks.push({ id: key, score: result.score, ok: result.ok, weight: result.weight });
  }
  let totalWeight = 0;
  let weighted = 0;
  for (const c of checks) {
    totalWeight += c.weight;
    weighted += c.score * c.weight;
  }
  let score = totalWeight ? Math.round(weighted / totalWeight) : 0;
  score = applySymptomAdjustments(score, profile, symptoms);
  const grade = scoreToGrade(score);
  const risks = detectConditionRisks(profile, metrics, session, symptoms);
  return {
    score,
    grade,
    pass: grade !== 'F',
    checks,
    metrics,
    risks,
    condition: profile.condition || null,
    disclaimer: profile.condition ? MEDICAL_DISCLAIMER : null,
  };
}

module.exports = { assessSession };
