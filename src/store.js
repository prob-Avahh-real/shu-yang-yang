export const STORAGE_KEY = 'shuyangyang.sessions.v1';
export const SETTINGS_KEY = 'shuyangyang.settings.v1';
const LEGACY_SESSIONS_KEY = 'mianyang.sessions.v1';
const LEGACY_SETTINGS_KEY = 'mianyang.settings.v1';

function readStorageKey(storage, key, legacyKey) {
  const raw = storage?.getItem?.(key);
  if (raw != null) return raw;
  const legacy = storage?.getItem?.(legacyKey);
  if (legacy != null) {
    storage?.setItem?.(key, legacy);
    storage?.removeItem?.(legacyKey);
    return legacy;
  }
  return null;
}

function uid() {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeSession(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const totalMinutes = raw.totalMinutes == null ? null : Number(raw.totalMinutes);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return null;

  return {
    id: String(raw.id || uid()),
    wakeDate: String(raw.wakeDate || dateKey(raw.wakeTime || Date.now())),
    bedTime: Number(raw.bedTime) || null,
    wakeTime: Number(raw.wakeTime) || Date.now(),
    totalMinutes,
    timeInBedMinutes: Number(raw.timeInBedMinutes) || totalMinutes,
    deepMinutes: Number(raw.deepMinutes) || 0,
    remMinutes: Number(raw.remMinutes) || 0,
    lightMinutes: Number(raw.lightMinutes) || Math.max(0, totalMinutes - (raw.deepMinutes || 0) - (raw.remMinutes || 0)),
    awakenings: Number(raw.awakenings) || 0,
    sleepOnsetMinutes: Number(raw.sleepOnsetMinutes) || 0,
    restingHrBpm: raw.restingHrBpm == null ? null : Number(raw.restingHrBpm),
    bedtimeDriftMin: Number(raw.bedtimeDriftMin) || 0,
    spo2Min: raw.spo2Min == null ? null : Number(raw.spo2Min),
    spo2Avg: raw.spo2Avg == null ? null : Number(raw.spo2Avg),
    apneaEvents: raw.apneaEvents == null ? null : Number(raw.apneaEvents),
    hypopneaIndex: raw.hypopneaIndex == null ? null : Number(raw.hypopneaIndex),
    remBehaviorFlag: Boolean(raw.remBehaviorFlag),
    rbdRiskScore: raw.rbdRiskScore == null ? null : Number(raw.rbdRiskScore),
    fragmentationIndex: raw.fragmentationIndex == null ? null : Number(raw.fragmentationIndex),
    earlyWakeMinutes: raw.earlyWakeMinutes == null ? null : Number(raw.earlyWakeMinutes),
    source: String(raw.source || 'manual'),
    label: String(raw.label || '').trim(),
    score: raw.score == null ? null : Number(raw.score),
    grade: raw.grade || null,
    createdAt: Number(raw.createdAt) || Date.now(),
  };
}

function dateKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function loadSessions(storage = globalThis.localStorage) {
  try {
    const raw = readStorageKey(storage, STORAGE_KEY, LEGACY_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeSession).filter(Boolean);
  } catch {
    return [];
  }
}

export function saveSessions(sessions, storage = globalThis.localStorage) {
  const cleaned = (sessions || []).map(normalizeSession).filter(Boolean);
  storage?.setItem?.(STORAGE_KEY, JSON.stringify(cleaned));
  return cleaned;
}

export function addSession(sessions, session) {
  const next = normalizeSession(session);
  if (!next) return sessions.slice();
  return [next, ...sessions.filter((s) => s.id !== next.id && s.wakeDate !== next.wakeDate)].slice(0, 365);
}

export function removeSession(sessions, id) {
  return sessions.filter((s) => s.id !== id);
}

export function loadSettings(storage = globalThis.localStorage) {
  try {
    const raw = readStorageKey(storage, SETTINGS_KEY, LEGACY_SETTINGS_KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw);
    const base = defaultSettings();
    return {
      ...base,
      ...parsed,
      symptoms: { ...base.symptoms, ...(parsed.symptoms || {}) },
    };
  } catch {
    return defaultSettings();
  }
}

function defaultSettings() {
  return {
    profileId: 'adult',
    targetBedHour: 23,
    targetWakeHour: 7,
    activeTab: 'overview',
    bedtimeReminderEnabled: true,
    wakeNaturalEnabled: true,
    wakeLeadMinutes: 30,
    healthSyncEnabled: false,
    remindersSyncedAt: null,
    symptoms: {
      snoring: false,
      daytimeSleepiness: false,
      tremorAtNight: false,
      actingOutDreams: false,
    },
  };
}

export function saveSettings(settings, storage = globalThis.localStorage) {
  const merged = { ...defaultSettings(), ...settings };
  storage?.setItem?.(SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}

export function computeBedtimeDrift(bedTime, targetBedHour) {
  if (!bedTime || targetBedHour == null) return 0;
  const d = new Date(bedTime);
  let bedMin = d.getHours() * 60 + d.getMinutes();
  let targetMin = targetBedHour * 60;
  if (bedMin < 12 * 60) bedMin += 24 * 60;
  if (targetMin < 12 * 60) targetMin += 24 * 60;
  return Math.abs(bedMin - targetMin);
}

export { uid, dateKey };
