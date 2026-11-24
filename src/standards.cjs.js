/** CommonJS mirror of standards.js for node:test */

const GRADES = {
  A: { label: '优质', color: '#5ec4a0', emoji: '🌙' },
  B: { label: '良好', color: '#7eb8da', emoji: '✨' },
  C: { label: '一般', color: '#d4a853', emoji: '💤' },
  D: { label: '欠佳', color: '#e07b54', emoji: '😴' },
  F: { label: '需改善', color: '#c94b4b', emoji: '⚠️' },
};

const MEDICAL_DISCLAIMER =
  '本应用仅供健康监测与生活方式参考，不构成医疗诊断。如有呼吸暂停、帕金森或睡眠障碍相关症状，请咨询专业医生。';

const PROFILES = [
  {
    id: 'adult',
    name: '成年人',
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
    id: 'osa',
    name: '呼吸暂停 (OSA)',
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

function getProfile(profileId = 'adult') {
  return PROFILES.find((p) => p.id === profileId) || PROFILES[0];
}

function scoreToGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function deriveMetrics(session) {
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

module.exports = { GRADES, PROFILES, MEDICAL_DISCLAIMER, getProfile, scoreToGrade, deriveMetrics };
