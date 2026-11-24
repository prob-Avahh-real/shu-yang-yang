/** Sleep quality benchmarks by profile (adults default). */

export const GRADES = {
  A: { label: '优质', color: '#5ec4a0', emoji: '🌙' },
  B: { label: '良好', color: '#7eb8da', emoji: '✨' },
  C: { label: '一般', color: '#d4a853', emoji: '💤' },
  D: { label: '欠佳', color: '#e07b54', emoji: '😴' },
  F: { label: '需改善', color: '#c94b4b', emoji: '⚠️' },
};

export const PROFILES = [
  {
    id: 'adult',
    name: '成年人',
    icon: '🧑',
    targetBedHour: 23,
    targetWakeHour: 7,
    limits: {
      totalMinutes: { min: 420, max: 540, weight: 18, ideal: 480 },
      deepPct: { min: 15, max: 28, weight: 16, ideal: 20 },
      remPct: { min: 18, max: 28, weight: 14, ideal: 22 },
      efficiency: { min: 85, max: 100, weight: 16, ideal: 92 },
      awakenings: { min: 0, max: 3, weight: 12, ideal: 1, invert: true },
      sleepOnsetMinutes: { min: 0, max: 25, weight: 10, ideal: 10, invert: true },
      restingHrBpm: { min: 45, max: 72, weight: 8, ideal: 58 },
      bedtimeDriftMin: { min: 0, max: 45, weight: 6, ideal: 0, invert: true },
    },
  },
  {
    id: 'senior',
    name: '长者',
    icon: '👴',
    targetBedHour: 22,
    targetWakeHour: 6,
    limits: {
      totalMinutes: { min: 360, max: 480, weight: 18, ideal: 420 },
      deepPct: { min: 10, max: 22, weight: 14, ideal: 15 },
      remPct: { min: 15, max: 25, weight: 12, ideal: 18 },
      efficiency: { min: 80, max: 100, weight: 16, ideal: 88 },
      awakenings: { min: 0, max: 5, weight: 14, ideal: 2, invert: true },
      sleepOnsetMinutes: { min: 0, max: 35, weight: 10, ideal: 15, invert: true },
      restingHrBpm: { min: 50, max: 78, weight: 8, ideal: 62 },
      bedtimeDriftMin: { min: 0, max: 60, weight: 8, ideal: 0, invert: true },
    },
  },
  {
    id: 'teen',
    name: '青少年',
    icon: '🧒',
    targetBedHour: 22,
    targetWakeHour: 7,
    limits: {
      totalMinutes: { min: 480, max: 600, weight: 20, ideal: 540 },
      deepPct: { min: 18, max: 30, weight: 14, ideal: 22 },
      remPct: { min: 20, max: 30, weight: 14, ideal: 24 },
      efficiency: { min: 85, max: 100, weight: 14, ideal: 93 },
      awakenings: { min: 0, max: 2, weight: 10, ideal: 1, invert: true },
      sleepOnsetMinutes: { min: 0, max: 20, weight: 10, ideal: 8, invert: true },
      restingHrBpm: { min: 48, max: 75, weight: 8, ideal: 60 },
      bedtimeDriftMin: { min: 0, max: 30, weight: 10, ideal: 0, invert: true },
    },
  },
  {
    id: 'osa',
    name: '呼吸暂停 (OSA)',
    icon: '🫁',
    condition: 'osa',
    targetBedHour: 23,
    targetWakeHour: 7,
    limits: {
      totalMinutes: { min: 360, max: 480, weight: 10, ideal: 420 },
      deepPct: { min: 10, max: 24, weight: 10, ideal: 16 },
      remPct: { min: 14, max: 24, weight: 8, ideal: 18 },
      efficiency: { min: 80, max: 100, weight: 18, ideal: 90 },
      awakenings: { min: 0, max: 2, weight: 18, ideal: 0, invert: true },
      sleepOnsetMinutes: { min: 0, max: 20, weight: 6, ideal: 8, invert: true },
      restingHrBpm: { min: 45, max: 68, weight: 12, ideal: 55 },
      bedtimeDriftMin: { min: 0, max: 30, weight: 6, ideal: 0, invert: true },
      spo2Min: { min: 92, max: 100, weight: 12, ideal: 96, optional: true },
    },
  },
  {
    id: 'parkinson',
    name: '帕金森',
    icon: '🧠',
    condition: 'parkinson',
    targetBedHour: 22,
    targetWakeHour: 6,
    limits: {
      totalMinutes: { min: 360, max: 510, weight: 12, ideal: 450 },
      deepPct: { min: 8, max: 22, weight: 10, ideal: 14 },
      remPct: { min: 12, max: 26, weight: 16, ideal: 20 },
      efficiency: { min: 78, max: 100, weight: 12, ideal: 88 },
      awakenings: { min: 0, max: 3, weight: 14, ideal: 1, invert: true },
      sleepOnsetMinutes: { min: 0, max: 30, weight: 10, ideal: 12, invert: true },
      restingHrBpm: { min: 48, max: 75, weight: 6, ideal: 62 },
      bedtimeDriftMin: { min: 0, max: 45, weight: 4, ideal: 0, invert: true },
      fragmentationIndex: { min: 0, max: 30, weight: 10, ideal: 12, invert: true },
      earlyWakeMinutes: { min: 0, max: 30, weight: 6, ideal: 0, invert: true, optional: true },
    },
  },
];

export const MEDICAL_DISCLAIMER =
  '本应用仅供健康监测与生活方式参考，不构成医疗诊断。如有呼吸暂停、帕金森或睡眠障碍相关症状，请咨询专业医生。';

export const ADVICE_LIBRARY = {
  duration_short: {
    title: '延长睡眠时长',
    tips: [
      '尽量固定就寝时间，提前 30 分钟开始睡前放松（调暗灯光、远离屏幕）。',
      '若工作日睡眠不足，周末补觉不超过 1 小时，避免打乱生物钟。',
      '下午 2 点后避免咖啡因；晚餐不宜过饱或过晚。',
    ],
  },
  duration_long: {
    title: '睡眠时长偏长',
    tips: [
      '超过 9 小时仍感疲倦，建议排查睡眠呼吸暂停或抑郁等潜在因素。',
      '保持规律起床时间，白天适度日照与运动可提升睡眠效率。',
    ],
  },
  deep_low: {
    title: '深睡不足',
    tips: [
      '睡前 1 小时避免剧烈运动与大量酒精；保持卧室凉爽（约 18–22℃）。',
      '规律力量训练与适度有氧可提升深睡比例，但避免睡前 3 小时内高强度训练。',
      '镁元素与规律作息有助于慢波睡眠；若长期偏低可咨询睡眠专科。',
    ],
  },
  rem_low: {
    title: 'REM 睡眠偏少',
    tips: [
      '减少睡前酒精与某些助眠药物，它们会抑制 REM。',
      '保持完整睡眠周期，避免过早闹钟打断后半夜 REM 集中期。',
      '压力管理与 REM 密切相关，可尝试冥想或写「担忧清单」再入睡。',
    ],
  },
  efficiency_low: {
    title: '睡眠效率偏低',
    tips: [
      '只在困倦时上床；若 20 分钟内未入睡，起床做安静活动后再回床（刺激控制法）。',
      '床仅用于睡眠与亲密，不在床上工作、刷手机。',
      '缩短在床清醒时间，逐步重建「床=睡着」的条件反射。',
    ],
  },
  awakenings_high: {
    title: '夜间觉醒过多',
    tips: [
      '检查环境：遮光窗帘、白噪音、适宜湿度；减少夜尿可睡前 2 小时限液。',
      '若伴打鼾或呼吸暂停，需做睡眠监测排查 OSA。',
      '记录觉醒诱因（压力、噪音、温度），逐项排除。',
    ],
  },
  onset_slow: {
    title: '入睡困难',
    tips: [
      '建立固定睡前仪式：温水澡、阅读、4-7-8 呼吸法。',
      '蓝光过滤与「数字宵禁」：睡前 60 分钟不用手机/电脑。',
      '若超过 3 周每周 ≥3 晚入睡困难，考虑 CBT-I 认知行为疗法。',
    ],
  },
  hr_elevated: {
    title: '静息心率偏高',
    tips: [
      '睡前避免大量咖啡因、酒精与激烈争论；尝试渐进式肌肉放松。',
      '白天规律运动可降低夜间静息心率，但避免睡前 3 小时剧烈运动。',
      '持续偏高伴心悸，建议心内科与睡眠科联合评估。',
    ],
  },
  schedule_drift: {
    title: '作息不规律',
    tips: [
      '固定起床时间（含周末），比固定入睡时间更能稳定生物钟。',
      '早晨接触自然光 15–30 分钟，帮助重置昼夜节律。',
      '夜班或跨时区可用逐步调整法，每天偏移不超过 1 小时。',
    ],
  },
  general_good: {
    title: '保持优质睡眠',
    tips: [
      '继续维持规律作息与当前睡前习惯。',
      '每周回顾一次睡眠趋势，季节变化时微调就寝时间。',
      '白天适度活动、晚间适度放松，是长期睡眠健康的基石。',
    ],
  },
  general_improve: {
    title: '综合改善建议',
    tips: [
      '优先解决得分最低的 1–2 项指标，不要同时改变太多习惯。',
      '连续记录 7–14 晚再评估，单次波动不代表长期趋势。',
      '若自我调整 4 周无改善，建议专业睡眠监测或 CBT-I。',
    ],
  },
  osa_cpap: {
    title: 'CPAP 治疗依从性',
    tips: [
      '已确诊 OSA 者请坚持每晚使用 CPAP，目标使用时长 ≥4 小时/晚。',
      '定期清洁面罩与管路，更换老化配件以维持密封性。',
      '若感到不适，记录具体症状并与睡眠科医师调整压力或面罩型号。',
    ],
  },
  osa_position: {
    title: '体位疗法',
    tips: [
      '侧睡可减轻部分患者的上气道阻塞；可用背部防翻身枕或简易报警。',
      '抬高床头 15–30° 有助于减少仰卧位呼吸暂停事件。',
      '避免睡前饮酒，酒精会松弛上气道肌肉并加重 OSA。',
    ],
  },
  osa_weight: {
    title: '体重与生活方式',
    tips: [
      '超重是 OSA 重要风险因素；减重 5–10% 可显著降低 AHI。',
      '规律中等强度运动改善上气道张力，但避免睡前 3 小时剧烈运动。',
      '戒烟可减轻上气道炎症与水肿。',
    ],
  },
  osa_referral: {
    title: '专科随访建议',
    tips: [
      '若夜间频繁觉醒伴打鼾、日间嗜睡，建议多导睡眠监测（PSG）或家庭睡眠呼吸监测。',
      '血氧饱和度反复低于 90% 需尽快耳鼻喉或睡眠专科评估。',
      'ENT 评估可排查鼻中隔偏曲、扁桃体肥大等可手术因素。',
    ],
  },
  osa_study: {
    title: '睡眠监测跟进',
    tips: [
      '治疗 3 个月后复查睡眠监测，评估 CPAP 压力是否合适。',
      '记录 CPAP 使用数据（时长、漏气、AHI 残余），复诊时带给医生。',
      '症状未改善时考虑双水平呼吸机或口腔矫治器等其他方案。',
    ],
  },
  pd_medication: {
    title: '药物与服药时间',
    tips: [
      '左旋多巴等 PD 药物可能影响睡眠结构；与神经科医生讨论就寝前最后一次服药时间。',
      '避免在傍晚加量多巴胺能药物，可能加重夜间异动或失眠。',
      '记录药物调整与睡眠质量变化，复诊时提供睡眠日记。',
    ],
  },
  pd_hygiene: {
    title: 'PD 睡眠卫生',
    tips: [
      '固定就寝与起床时间，白天适度日照有助于稳定昼夜节律。',
      '睡前 1 小时调暗灯光，减少屏幕蓝光刺激褪黑素分泌。',
      '夜尿频繁者可睡前 2 小时限液，并在床边备好安全通道。',
    ],
  },
  pd_rbd: {
    title: 'REM 行为障碍 (RBD) 安全',
    tips: [
      '若在梦中「演梦」、踢打或坠床，移除 bedside 尖锐物，必要时使用低床或床边护栏。',
      '伴侣分床睡可降低互相伤害风险，直至 RBD 获得治疗。',
      'RBD 可能是 PD 早期信号，建议神经科行 polysomnography 确认。',
    ],
  },
  pd_neurologist: {
    title: '神经科随访',
    tips: [
      '睡眠碎片化加重、REM 占比持续偏低，请与神经科医生讨论方案调整。',
      '日间过度嗜睡或夜间频繁觉醒可能是 PD 进展或药物副作用，需专业评估。',
      '定期 UPDRS 与睡眠问卷联合评估，优于仅凭主观感受判断。',
    ],
  },
  pd_exercise: {
    title: '运动与日间活动',
    tips: [
      '白天规律有氧与平衡训练可改善 PD 夜间睡眠质量，但避免睡前 3 小时高强度运动。',
      '下午适度户外活动有助于重置生物钟，减轻早醒。',
      '太极、散步等低冲击运动对 PD 患者睡眠与运动症状均有帮助。',
    ],
  },
};

export function getProfile(profileId = 'adult') {
  return PROFILES.find((p) => p.id === profileId) || PROFILES[0];
}

export function scoreToGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export function deriveMetrics(session) {
  const total = session.totalMinutes || 0;
  const inBed = session.timeInBedMinutes || total;
  const deep = session.deepMinutes || 0;
  const rem = session.remMinutes || 0;
  const awakenings = session.awakenings ?? 0;
  const fragmentationIndex =
    session.fragmentationIndex ??
    (total ? Math.min(100, (awakenings / Math.max(1, total / 60)) * 25 + (inBed > total ? ((inBed - total) / inBed) * 40 : 0)) : 0);
  return {
    totalMinutes: total,
    deepPct: total ? (deep / total) * 100 : 0,
    remPct: total ? (rem / total) * 100 : 0,
    efficiency: inBed ? (total / inBed) * 100 : 0,
    awakenings,
    sleepOnsetMinutes: session.sleepOnsetMinutes ?? 0,
    restingHrBpm: session.restingHrBpm ?? null,
    bedtimeDriftMin: session.bedtimeDriftMin ?? 0,
    spo2Min: session.spo2Min ?? null,
    spo2Avg: session.spo2Avg ?? null,
    fragmentationIndex,
    earlyWakeMinutes: session.earlyWakeMinutes ?? null,
    hypopneaIndex: session.hypopneaIndex ?? null,
    apneaEvents: session.apneaEvents ?? null,
    rbdRiskScore: session.rbdRiskScore ?? null,
  };
}
