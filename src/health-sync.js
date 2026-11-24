import { Capacitor } from '@capacitor/core';
import { dateKey, uid, computeBedtimeDrift } from './store.js';

function isNative() {
  return Capacitor.isNativePlatform();
}

function platform() {
  return Capacitor.getPlatform();
}

function computeRbdRiskScore(remPct, awakenings, remMinutes) {
  let score = 0;
  if (remPct != null && remPct < 12) score += 35;
  else if (remPct != null && remPct < 15) score += 20;
  if (awakenings >= 5) score += 25;
  else if (awakenings >= 3) score += 12;
  if (remMinutes != null && remMinutes < 45) score += 15;
  return Math.min(100, score);
}

function computeEarlyWakeMinutes(bedTime, wakeTime, totalMinutes) {
  if (!bedTime || !wakeTime || !totalMinutes) return null;
  const expectedEnd = bedTime + totalMinutes * 60000;
  const gap = wakeTime - expectedEnd;
  return gap > 5 * 60000 ? Math.round(gap / 60000) : 0;
}

/** Attach condition-relevant optional fields to a session object. */
export function enrichSessionFromHealth(row, session) {
  const enriched = { ...session, source: 'health' };

  if (row.spo2Min != null) enriched.spo2Min = Number(row.spo2Min);
  if (row.spo2Avg != null) enriched.spo2Avg = Number(row.spo2Avg);
  if (row.apneaEvents != null) enriched.apneaEvents = Number(row.apneaEvents);
  if (row.hypopneaIndex != null) enriched.hypopneaIndex = Number(row.hypopneaIndex);
  if (row.respiratoryRate != null && enriched.restingHrBpm == null) {
    enriched.respiratoryRate = Number(row.respiratoryRate);
  }

  const remPct = session.totalMinutes ? (session.remMinutes / session.totalMinutes) * 100 : null;
  enriched.rbdRiskScore = computeRbdRiskScore(remPct, session.awakenings, session.remMinutes);
  enriched.remBehaviorFlag = enriched.rbdRiskScore >= 60;
  enriched.earlyWakeMinutes = computeEarlyWakeMinutes(session.bedTime, session.wakeTime, session.totalMinutes);

  return enriched;
}

/** Map HealthKit sleep samples to app session objects. */
export function mapHealthKitSleepSamples(samples, settings = {}) {
  const sessions = [];
  for (const row of samples || []) {
    const start = row.startDate ? new Date(row.startDate).getTime() : null;
    const end = row.endDate ? new Date(row.endDate).getTime() : null;
    if (!start || !end || end <= start) continue;

    const totalMinutes = Math.round((end - start) / 60000);
    if (totalMinutes < 30) continue;

    const deepMinutes = row.deepSleepMinutes ?? row.deepMinutes ?? Math.round(totalMinutes * 0.2);
    const remMinutes = row.remSleepMinutes ?? row.remMinutes ?? Math.round(totalMinutes * 0.22);
    const lightMinutes = Math.max(0, totalMinutes - deepMinutes - remMinutes);

    const base = {
      id: uid(),
      wakeDate: dateKey(end),
      bedTime: start,
      wakeTime: end,
      totalMinutes,
      timeInBedMinutes: row.timeInBedMinutes ?? totalMinutes,
      deepMinutes,
      remMinutes,
      lightMinutes,
      awakenings: row.awakenings ?? 0,
      sleepOnsetMinutes: row.sleepOnsetMinutes ?? 0,
      restingHrBpm: row.restingHrBpm ?? null,
      bedtimeDriftMin: computeBedtimeDrift(start, settings.targetBedHour),
      label: 'Apple 健康',
      createdAt: end,
    };

    sessions.push(enrichSessionFromHealth(row, base));
  }
  return sessions.sort((a, b) => b.wakeTime - a.wakeTime);
}

/** Map Health Connect sleep session records (when available). */
export function mapHealthConnectSleep(records, settings = {}) {
  const sessions = [];
  for (const rec of records || []) {
    const start = rec.startTime ? new Date(rec.startTime).getTime() : null;
    const end = rec.endTime ? new Date(rec.endTime).getTime() : null;
    if (!start || !end) continue;
    const totalMinutes = Math.round((end - start) / 60000);
    if (totalMinutes < 30) continue;

    let deep = 0;
    let rem = 0;
    let light = 0;
    let awakenings = 0;
    for (const stage of rec.stages || []) {
      const mins = Math.round((new Date(stage.endTime) - new Date(stage.startTime)) / 60000);
      const t = (stage.stage || stage.type || '').toLowerCase();
      if (t.includes('awake') || t.includes('wake')) awakenings += 1;
      else if (t.includes('deep')) deep += mins;
      else if (t.includes('rem')) rem += mins;
      else light += mins;
    }
    if (!deep && !rem) {
      deep = Math.round(totalMinutes * 0.2);
      rem = Math.round(totalMinutes * 0.22);
      light = totalMinutes - deep - rem;
    }

    const healthRow = {
      spo2Min: rec.oxygenSaturation?.minimum ?? rec.spo2Min ?? null,
      spo2Avg: rec.oxygenSaturation?.average ?? rec.spo2Avg ?? null,
      hypopneaIndex: rec.apneaHypopneaIndex ?? rec.ahi ?? null,
      apneaEvents: rec.apneaEventCount ?? null,
      respiratoryRate: rec.respiratoryRate ?? null,
    };

    const base = {
      id: uid(),
      wakeDate: dateKey(end),
      bedTime: start,
      wakeTime: end,
      totalMinutes,
      timeInBedMinutes: rec.timeInBedMinutes ?? totalMinutes,
      deepMinutes: deep,
      remMinutes: rem,
      lightMinutes: light,
      awakenings,
      sleepOnsetMinutes: rec.sleepOnsetMinutes ?? 0,
      restingHrBpm: rec.restingHeartRate ?? rec.restingHrBpm ?? null,
      bedtimeDriftMin: computeBedtimeDrift(start, settings.targetBedHour),
      label: 'Health Connect',
      createdAt: end,
    };

    sessions.push(enrichSessionFromHealth(healthRow, base));
  }
  return sessions.sort((a, b) => b.wakeTime - a.wakeTime);
}

async function importFromHealthKit(settings, days = 14) {
  const { CapacitorHealthkit } = await import('@perfood/capacitor-healthkit');
  await CapacitorHealthkit.isAvailable();
  await CapacitorHealthkit.requestAuthorization({
    read: ['sleepAnalysis', 'oxygenSaturation', 'respiratoryRate', 'heartRate'],
    write: [],
    all: [],
  });

  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const queryOptions = {
    sampleName: 'sleepAnalysis',
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    limit: 0,
  };

  const out = await CapacitorHealthkit.queryHKitSampleType(queryOptions);
  const rows = (out?.resultData || []).map(normalizeHealthKitRow);

  let spo2ByNight = {};
  try {
    const spo2Out = await CapacitorHealthkit.queryHKitSampleType({
      sampleName: 'oxygenSaturation',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: 0,
    });
    spo2ByNight = groupSpO2ByNight(spo2Out?.resultData || []);
  } catch {
    /* SpO2 optional */
  }

  for (const row of rows) {
    const nightKey = row.endDate ? dateKey(new Date(row.endDate).getTime()) : null;
    if (nightKey && spo2ByNight[nightKey]) {
      row.spo2Min = spo2ByNight[nightKey].min;
      row.spo2Avg = spo2ByNight[nightKey].avg;
    }
  }

  return mapHealthKitSleepSamples(rows, settings);
}

function groupSpO2ByNight(samples) {
  const byNight = {};
  for (const s of samples) {
    const ts = s.startDate || s.start;
    if (!ts) continue;
    const key = dateKey(new Date(ts).getTime());
    const val = Number(s.value ?? s.quantity ?? s.oxygenSaturation);
    if (!Number.isFinite(val)) continue;
    const pct = val <= 1 ? val * 100 : val;
    if (!byNight[key]) byNight[key] = { min: pct, sum: 0, n: 0 };
    byNight[key].min = Math.min(byNight[key].min, pct);
    byNight[key].sum += pct;
    byNight[key].n += 1;
  }
  for (const k of Object.keys(byNight)) {
    byNight[k].avg = Math.round(byNight[k].sum / byNight[k].n);
  }
  return byNight;
}

function normalizeHealthKitRow(row) {
  const startDate = row.startDate || row.start;
  const endDate = row.endDate || row.end;
  const durationHours = row.duration || (startDate && endDate ? (new Date(endDate) - new Date(startDate)) / 3600000 : 0);
  const totalMin = durationHours * 60;

  let deepMinutes = 0;
  let remMinutes = 0;
  let awakenings = 0;
  const state = (row.sleepState || row.value || '').toString().toLowerCase();
  if (state.includes('deep')) deepMinutes = totalMin;
  else if (state.includes('rem')) remMinutes = totalMin;
  else if (state.includes('awake')) awakenings = 1;

  return {
    startDate,
    endDate,
    sleepState: row.sleepState,
    durationMin: totalMin,
    deepMinutes: deepMinutes || undefined,
    remMinutes: remMinutes || undefined,
    awakenings: awakenings || undefined,
    restingHrBpm: row.restingHrBpm ?? null,
    spo2Min: row.spo2Min ?? null,
    spo2Avg: row.spo2Avg ?? null,
  };
}

async function importFromHealthConnect(settings, days = 14) {
  const { HealthConnect } = await import('capacitor-health-connect');
  const avail = await HealthConnect.checkAvailability();
  if (avail !== 'Available' && avail?.availability !== 'Available') {
    throw new Error('Health Connect 未安装或不支持');
  }

  await HealthConnect.requestHealthPermissions({
    read: ['SleepSession', 'OxygenSaturation', 'RespiratoryRate'],
    write: [],
  });

  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const result = await HealthConnect.readRecords({
    type: 'SleepSession',
    timeRangeFilter: { type: 'between', startTime: start, endTime: end },
    ascendingOrder: false,
    pageSize: 50,
  });

  const records = result?.records || result?.result?.records || [];
  return mapHealthConnectSleep(records, settings);
}

/**
 * Import sleep sessions from platform health store.
 * @returns {{ sessions, platform, error? }}
 */
export async function importHealthSleep(settings, days = 14) {
  if (!isNative()) {
    return { sessions: [], platform: 'web', error: '请在 iOS/Android 应用中导入健康数据' };
  }

  const plat = platform();
  try {
    if (plat === 'ios') {
      const sessions = await importFromHealthKit(settings, days);
      return { sessions, platform: 'ios' };
    }
    if (plat === 'android') {
      try {
        const sessions = await importFromHealthConnect(settings, days);
        return { sessions, platform: 'android' };
      } catch (err) {
        return {
          sessions: [],
          platform: 'android',
          error: err.message || 'Android 需安装 Health Connect 并授权睡眠数据',
        };
      }
    }
    return { sessions: [], platform: plat, error: '当前平台不支持' };
  } catch (err) {
    return { sessions: [], platform: plat, error: err.message || String(err) };
  }
}

export async function checkHealthAvailability() {
  if (!isNative()) return { available: false, platform: 'web' };
  const plat = platform();
  if (plat === 'ios') {
    try {
      const { CapacitorHealthkit } = await import('@perfood/capacitor-healthkit');
      await CapacitorHealthkit.isAvailable();
      return { available: true, platform: 'ios', label: 'Apple HealthKit' };
    } catch {
      return { available: false, platform: 'ios' };
    }
  }
  if (plat === 'android') {
    try {
      const { HealthConnect } = await import('capacitor-health-connect');
      const a = await HealthConnect.checkAvailability();
      const ok = a === 'Available' || a?.availability === 'Available';
      return { available: ok, platform: 'android', label: 'Health Connect' };
    } catch {
      return { available: false, platform: 'android' };
    }
  }
  return { available: false, platform: plat };
}

export { normalizeHealthKitRow, groupSpO2ByNight, computeRbdRiskScore, computeEarlyWakeMinutes };
