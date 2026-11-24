/** CommonJS mirror for health mappers */
function uid() {
  return `s_${Date.now().toString(36)}`;
}

function dateKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mapHealthKitSleepSamples(samples, settings = {}) {
  const sessions = [];
  for (const row of samples || []) {
    const start = row.startDate ? new Date(row.startDate).getTime() : null;
    const end = row.endDate ? new Date(row.endDate).getTime() : null;
    if (!start || !end || end <= start) continue;
    const totalMinutes = Math.round((end - start) / 60000);
    sessions.push({
      wakeDate: dateKey(end),
      totalMinutes,
      source: 'healthkit',
    });
  }
  return sessions;
}

module.exports = { mapHealthKitSleepSamples };
