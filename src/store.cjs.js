/** CommonJS mirror of store.js for node:test */

function uid() {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSession(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const totalMinutes = raw.totalMinutes == null ? null : Number(raw.totalMinutes);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return null;
  return {
    id: String(raw.id || uid()),
    totalMinutes,
    deepMinutes: Number(raw.deepMinutes) || 0,
    remMinutes: Number(raw.remMinutes) || 0,
    timeInBedMinutes: Number(raw.timeInBedMinutes) || totalMinutes,
    awakenings: Number(raw.awakenings) || 0,
    sleepOnsetMinutes: Number(raw.sleepOnsetMinutes) || 0,
    restingHrBpm: raw.restingHrBpm == null ? null : Number(raw.restingHrBpm),
    bedtimeDriftMin: Number(raw.bedtimeDriftMin) || 0,
    wakeTime: Number(raw.wakeTime) || Date.now(),
  };
}

function addSession(sessions, session) {
  const next = normalizeSession(session);
  if (!next) return sessions.slice();
  return [next, ...sessions.filter((s) => s.id !== next.id)].slice(0, 365);
}

module.exports = { normalizeSession, addSession, uid };
