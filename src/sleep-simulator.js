import { getProfile } from './standards.js';
import { computeBedtimeDrift, dateKey, uid } from './store.js';

const QUALITY_PRESETS = [
  { id: 'great', label: '优质', scoreBias: 12 },
  { id: 'good', label: '良好', scoreBias: 4 },
  { id: 'average', label: '一般', scoreBias: -6 },
  { id: 'poor', label: '欠佳', scoreBias: -18 },
];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

function jitter(base, spread) {
  return base + rand(-spread, spread);
}

/**
 * Generate a realistic sleep session for demo / quick log.
 */
export function generateSleepSession(settings = {}, qualityId = 'good') {
  const profile = getProfile(settings.profileId || 'adult');
  const preset = QUALITY_PRESETS.find((q) => q.id === qualityId) || QUALITY_PRESETS[1];
  const bias = preset.scoreBias;

  const wake = new Date();
  wake.setHours(settings.targetWakeHour ?? profile.targetWakeHour, randInt(0, 25), 0, 0);
  if (wake > Date.now()) wake.setDate(wake.getDate() - 1);

  const idealTotal = profile.limits.totalMinutes.ideal || 480;
  const totalMinutes = Math.round(jitter(idealTotal + bias * 3, 45));
  const efficiency = Math.min(98, Math.max(72, jitter(90 + bias * 0.5, 6)));
  const timeInBedMinutes = Math.round(totalMinutes / (efficiency / 100));
  const sleepOnsetMinutes = Math.max(3, Math.round(jitter(12 - bias * 0.3, 8)));

  const deepPct = Math.max(8, jitter((profile.limits.deepPct.ideal || 20) + bias * 0.15, 4));
  const remPct = Math.max(10, jitter((profile.limits.remPct.ideal || 22) + bias * 0.12, 3));
  const deepMinutes = Math.round((totalMinutes * deepPct) / 100);
  const remMinutes = Math.round((totalMinutes * remPct) / 100);
  const lightMinutes = Math.max(0, totalMinutes - deepMinutes - remMinutes);

  const awakenings = Math.max(0, randInt(0, preset.id === 'poor' ? 7 : preset.id === 'great' ? 1 : 4));
  const restingHrBpm = Math.round(jitter(58 - bias * 0.2, 6));

  const bedTime = wake.getTime() - timeInBedMinutes * 60 * 1000;
  const bedtimeDriftMin = computeBedtimeDrift(bedTime, settings.targetBedHour ?? profile.targetBedHour);

  return {
    id: uid(),
    wakeDate: dateKey(wake.getTime()),
    bedTime,
    wakeTime: wake.getTime(),
    totalMinutes,
    timeInBedMinutes,
    deepMinutes,
    remMinutes,
    lightMinutes,
    awakenings,
    sleepOnsetMinutes,
    restingHrBpm,
    bedtimeDriftMin,
    source: 'simulated',
    label: `模拟 · ${preset.label}`,
    createdAt: Date.now(),
  };
}

export function generateWeekHistory(settings = {}) {
  const qualities = ['good', 'great', 'average', 'good', 'poor', 'good', 'great'];
  const sessions = [];
  for (let i = 0; i < 7; i++) {
    const s = generateSleepSession(settings, qualities[i]);
    const day = new Date();
    day.setDate(day.getDate() - i);
    day.setHours(settings.targetWakeHour ?? 7, randInt(0, 30), 0, 0);
    s.wakeTime = day.getTime();
    s.wakeDate = dateKey(day.getTime());
    s.bedTime = s.wakeTime - s.timeInBedMinutes * 60 * 1000;
    s.createdAt = s.wakeTime;
    sessions.push(s);
  }
  return sessions;
}

export { QUALITY_PRESETS };
