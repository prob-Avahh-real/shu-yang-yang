import {
  ADVICE_LIBRARY,
  GRADES,
  MEDICAL_DISCLAIMER,
  deriveMetrics,
  getProfile,
  scoreToGrade,
} from './standards.js';

function scoreMetric(value, spec) {
  if (value == null || !Number.isFinite(value)) {
    if (spec.optional) {
      return { score: 70, ok: true, note: '无数据', weight: spec.weight || 10 };
    }
    return { score: 50, ok: false, note: '无数据', weight: spec.weight || 10 };
  }

  const { min, max, ideal, weight, invert } = spec;
  let ok = true;
  let score = 100;

  if (invert) {
    if (value > max) {
      ok = false;
      const gap = value - max;
      score = Math.max(0, 100 - gap * (max <= 5 ? 25 : 8));
    }
  } else {
    if (min != null && value < min) {
      ok = false;
      const gap = min - value;
      score = Math.max(0, 100 - gap * (min > 50 ? 0.4 : 6));
    }
    if (max != null && value > max) {
      ok = false;
      const gap = value - max;
      score = Math.max(0, 100 - gap * (max > 50 ? 0.4 : 6));
    }
  }

  if (ideal != null && Number.isFinite(ideal)) {
    const dist = Math.abs(value - ideal);
    const range = max != null && min != null ? (max - min) / 2 : ideal * 0.2 || 1;
    const proximity = Math.max(0, 1 - dist / range);
    score = Math.round(score * 0.6 + proximity * 100 * 0.4);
  }

  return { score: Math.min(100, Math.max(0, Math.round(score))), ok, weight: weight || 10, note: ok ? '正常' : '待改善' };
}

const METRIC_LABELS = {
  totalMinutes: '睡眠时长',
  deepPct: '深睡占比',
  remPct: 'REM 占比',
  efficiency: '睡眠效率',
  awakenings: '夜间觉醒',
  sleepOnsetMinutes: '入睡耗时',
  restingHrBpm: '静息心率',
  bedtimeDriftMin: '就寝偏移',
  spo2Min: '最低血氧',
  fragmentationIndex: '睡眠碎片化',
  earlyWakeMinutes: '早醒时长',
};

const METRIC_UNITS = {
  totalMinutes: '分钟',
  deepPct: '%',
  remPct: '%',
  efficiency: '%',
  awakenings: '次',
  sleepOnsetMinutes: '分钟',
  restingHrBpm: 'bpm',
  bedtimeDriftMin: '分钟',
  spo2Min: '%',
  fragmentationIndex: '指数',
  earlyWakeMinutes: '分钟',
};

function pickAdviceKeys(checks, grade, profile) {
  const keys = [];
  const weak = checks.filter((c) => !c.ok).sort((a, b) => a.score - b.score);

  for (const c of weak) {
    switch (c.id) {
      case 'totalMinutes':
        keys.push(c.value < (c.spec?.min ?? 420) ? 'duration_short' : 'duration_long');
        break;
      case 'deepPct':
        keys.push('deep_low');
        break;
      case 'remPct':
        keys.push('rem_low');
        break;
      case 'efficiency':
        keys.push('efficiency_low');
        break;
      case 'awakenings':
        keys.push('awakenings_high');
        break;
      case 'sleepOnsetMinutes':
        keys.push('onset_slow');
        break;
      case 'restingHrBpm':
        keys.push('hr_elevated');
        break;
      case 'bedtimeDriftMin':
        keys.push('schedule_drift');
        break;
      default:
        break;
    }
  }

  if (profile?.condition === 'osa') {
    if (weak.some((c) => ['awakenings', 'efficiency', 'spo2Min', 'restingHrBpm'].includes(c.id))) {
      keys.push('osa_cpap', 'osa_position');
    }
    if (weak.some((c) => c.id === 'efficiency' || c.id === 'totalMinutes')) keys.push('osa_weight');
    if (grade === 'D' || grade === 'F') keys.push('osa_referral', 'osa_study');
  }

  if (profile?.condition === 'parkinson') {
    if (weak.some((c) => ['remPct', 'fragmentationIndex', 'awakenings'].includes(c.id))) {
      keys.push('pd_medication', 'pd_hygiene');
    }
    if (weak.some((c) => c.id === 'remPct' || c.id === 'earlyWakeMinutes')) keys.push('pd_rbd');
    if (grade === 'C' || grade === 'D' || grade === 'F') keys.push('pd_neurologist', 'pd_exercise');
  }

  if (grade === 'A' || grade === 'B') keys.unshift('general_good');
  if (keys.length === 0 || (keys.length === 1 && keys[0] === 'general_good')) {
    if (grade === 'C' || grade === 'D' || grade === 'F') keys.push('general_improve');
  }

  return [...new Set(keys)].slice(0, 6);
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
      risks.push({
        id: 'osa_suspected',
        level: spo2Low || metrics.hypopneaIndex > 15 ? 'high' : 'moderate',
        title: '疑似阻塞性睡眠呼吸暂停',
        detail: spo2Low
          ? `夜间觉醒 ${metrics.awakenings} 次、效率 ${metrics.efficiency.toFixed(0)}%、最低血氧 ${metrics.spo2Min}% — 建议睡眠监测。`
          : `频繁觉醒（${metrics.awakenings} 次）与低效率（${metrics.efficiency.toFixed(0)}%）符合 OSA 常见模式。`,
      });
    }
    if (metrics.spo2Min != null && metrics.spo2Min < 88) {
      risks.push({
        id: 'desaturation',
        level: 'high',
        title: '血氧去饱和',
        detail: `最低 SpO₂ ${metrics.spo2Min}% 低于安全阈值，请尽快咨询医生。`,
      });
    }
    if (session.hypopneaIndex > 15 || session.apneaEvents >= 5) {
      risks.push({
        id: 'ahi_elevated',
        level: 'high',
        title: '呼吸事件指数偏高',
        detail: `AHI 代理值 ${session.hypopneaIndex ?? session.apneaEvents}，需专业睡眠监测确认。`,
      });
    }
  }

  if (profile.condition === 'parkinson') {
    const lowRem = metrics.remPct < 12;
    const fragmented = metrics.fragmentationIndex > 35 || metrics.awakenings >= 4;
    const earlyWake = metrics.earlyWakeMinutes != null && metrics.earlyWakeMinutes > 45;
    const rbdProxy =
      session.rbdRiskScore > 60 ||
      session.remBehaviorFlag ||
      (symptoms.actingOutDreams && lowRem);
    if ((lowRem && fragmented) || (earlyWake && fragmented)) {
      risks.push({
        id: 'pd_sleep_concern',
        level: rbdProxy ? 'high' : 'moderate',
        title: 'PD 相关睡眠障碍模式',
        detail: `REM 占比 ${metrics.remPct.toFixed(1)}%、碎片化指数 ${metrics.fragmentationIndex.toFixed(0)}，符合 PD 常见睡眠改变。`,
      });
    }
    if (rbdProxy) {
      risks.push({
        id: 'rbd_risk',
        level: 'high',
        title: 'REM 行为障碍风险',
        detail: '梦中动作或 REM 占比异常，建议神经科 polysomnography 筛查 RBD。',
      });
    }
  }

  return risks;
}

function buildClinicalSummary(profile, metrics, gradeInfo, grade, risks, checks) {
  if (!profile?.condition) return null;

  const weakest = [...checks].sort((a, b) => a.score - b.score).slice(0, 2);
  const focus = weakest.map((w) => w.label).join('、');

  if (profile.condition === 'osa') {
    const riskNote = risks.length ? `筛查提示：${risks.map((r) => r.title).join('；')}。` : '未见明显高危呼吸暂停模式。';
    return grade === 'A' || grade === 'B'
      ? `OSA 档案 · 昨夜${gradeInfo.label}。${riskNote}（健康筛查，非诊断）`
      : `OSA 档案 · 昨夜${gradeInfo.label}，关注 ${focus}。${riskNote}（健康筛查，非诊断）`;
  }

  if (profile.condition === 'parkinson') {
    const riskNote = risks.length ? `筛查提示：${risks.map((r) => r.title).join('；')}。` : '未见明显 RBD/碎片化高危模式。';
    return grade === 'A' || grade === 'B'
      ? `帕金森档案 · 昨夜${gradeInfo.label}。${riskNote}（健康筛查，非诊断）`
      : `帕金森档案 · 昨夜${gradeInfo.label}，关注 ${focus}。${riskNote}（健康筛查，非诊断）`;
  }

  return null;
}

function buildConditionCallouts(profile, metrics, session) {
  if (!profile?.condition) return [];
  const callouts = [];

  if (profile.condition === 'osa') {
    if (metrics.spo2Min != null) {
      callouts.push({ label: '最低血氧 SpO₂', value: `${metrics.spo2Min}%`, warn: metrics.spo2Min < 90 });
    }
    if (metrics.spo2Avg != null) {
      callouts.push({ label: '平均血氧', value: `${metrics.spo2Avg}%`, warn: metrics.spo2Avg < 92 });
    }
    if (session.hypopneaIndex != null) {
      callouts.push({ label: 'AHI 代理', value: String(session.hypopneaIndex), warn: session.hypopneaIndex > 15 });
    }
    if (session.apneaEvents != null) {
      callouts.push({ label: '呼吸暂停事件', value: `${session.apneaEvents} 次`, warn: session.apneaEvents >= 5 });
    }
  }

  if (profile.condition === 'parkinson') {
    callouts.push({
      label: '碎片化指数',
      value: metrics.fragmentationIndex.toFixed(0),
      warn: metrics.fragmentationIndex > 30,
    });
    if (metrics.earlyWakeMinutes != null) {
      callouts.push({
        label: '早醒时长',
        value: `${Math.round(metrics.earlyWakeMinutes)} 分钟`,
        warn: metrics.earlyWakeMinutes > 30,
      });
    }
    if (session.rbdRiskScore != null) {
      callouts.push({ label: 'RBD 风险分', value: String(session.rbdRiskScore), warn: session.rbdRiskScore > 60 });
    }
  }

  return callouts;
}

/**
 * Assess a sleep session. Returns score, grade, checks, advice blocks, summary.
 */
export function assessSession(session, profileId = 'adult', options = {}) {
  const profile = getProfile(profileId);
  const symptoms = options.symptoms || {};
  const metrics = deriveMetrics(session);
  const checks = [];

  for (const [key, spec] of Object.entries(profile.limits)) {
    const value = metrics[key];
    const result = scoreMetric(value, spec);
    checks.push({
      id: key,
      label: METRIC_LABELS[key] || key,
      value,
      unit: METRIC_UNITS[key] || '',
      ok: result.ok,
      note: result.note,
      weight: result.weight,
      score: result.score,
      spec,
    });
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
  const gradeInfo = GRADES[grade];

  const risks = detectConditionRisks(profile, metrics, session, symptoms);
  const clinicalSummary = buildClinicalSummary(profile, metrics, gradeInfo, grade, risks, checks);
  const conditionCallouts = buildConditionCallouts(profile, metrics, session);

  const adviceKeys = pickAdviceKeys(checks, grade, profile);
  const advice = adviceKeys.map((k) => ADVICE_LIBRARY[k]).filter(Boolean);

  const conditionAdvice = [];
  if (profile?.condition === 'osa') {
    conditionAdvice.push({
      title: 'OSA 专项建议',
      tips: [
        '坚持 CPAP 或医嘱方案，记录每夜使用时长。',
        '侧睡、减重、限酒可辅助减轻上气道阻塞。',
        '血氧或 AHI 异常时尽快预约睡眠专科。',
      ],
    });
  }
  if (profile?.condition === 'parkinson') {
    conditionAdvice.push({
      title: '帕金森睡眠专项',
      tips: [
        '与神经科医生协调左旋多巴等药物的夜间服药时间。',
        'RBD 患者需做好卧室安全防护。',
        '白天规律低冲击运动，避免傍晚高强度训练。',
      ],
    });
  }

  const weakest = [...checks].sort((a, b) => a.score - b.score).slice(0, 2);
  const summary =
    clinicalSummary ||
    (grade === 'A' || grade === 'B'
      ? `昨夜睡眠质量${gradeInfo.label}，核心指标稳定。`
      : `昨夜睡眠${gradeInfo.label}，主要短板：${weakest.map((w) => w.label).join('、')}。`);

  const warnings = [];
  if (metrics.totalMinutes < 300) warnings.push('睡眠严重不足（<5小时）');
  if (metrics.efficiency < 70) warnings.push('睡眠效率过低，可能存在失眠倾向');
  if (metrics.awakenings >= 6) warnings.push('频繁觉醒，建议排查环境或呼吸问题');
  for (const r of risks) {
    if (r.level === 'high') warnings.push(`${r.title}：${r.detail}`);
  }

  return {
    profileId: profile.id,
    profileName: profile.name,
    condition: profile.condition || null,
    score,
    grade,
    gradeInfo,
    checks,
    metrics,
    advice,
    conditionAdvice,
    summary,
    clinicalSummary,
    warnings,
    risks,
    conditionCallouts,
    disclaimer: profile.condition ? MEDICAL_DISCLAIMER : null,
    pass: grade !== 'F',
  };
}

export function formatMetric(key, value) {
  if (value == null || !Number.isFinite(value)) return '—';
  if (key === 'totalMinutes') {
    const h = Math.floor(value / 60);
    const m = Math.round(value % 60);
    return h ? `${h}h ${m}m` : `${m}m`;
  }
  if (key === 'deepPct' || key === 'remPct' || key === 'efficiency') return value.toFixed(1);
  if (key === 'restingHrBpm') return String(Math.round(value));
  if (key === 'sleepOnsetMinutes' || key === 'bedtimeDriftMin' || key === 'awakenings') {
    return String(Math.round(value));
  }
  if (key === 'fragmentationIndex') return value.toFixed(0);
  if (key === 'spo2Min' || key === 'spo2Avg') return value.toFixed(0);
  if (key === 'earlyWakeMinutes') return String(Math.round(value));
  return String(value);
}

export function formatTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' });
}
