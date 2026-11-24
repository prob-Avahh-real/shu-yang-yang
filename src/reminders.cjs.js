/** CommonJS mirror of reminders.js for node:test */

const NOTIF_IDS = { BEDTIME: 1001, WAKE_LEAD: 1100, WAKE_FINAL: 1200 };
const DEFAULT_WAKE_LEAD_MINUTES = 30;
const WAKE_ESCALATION = [
  { offsetMin: 30, title: 'a', body: 'b' },
  { offsetMin: 15, title: 'a', body: 'b' },
  { offsetMin: 5, title: 'a', body: 'b' },
  { offsetMin: 0, title: 'a', body: 'b' },
];
const BEDTIME_MESSAGES = { title: 't', body: 'b' };

function pickWakeSteps(wakeLeadMinutes) {
  return WAKE_ESCALATION.filter((s) => s.offsetMin <= wakeLeadMinutes);
}

function buildReminderSchedule(settings, now = new Date(), daysAhead = 7) {
  const list = [];
  const bedHour = Number(settings.targetBedHour ?? 23);
  const wakeHour = Number(settings.targetWakeHour ?? 7);
  const bedtimeOn = settings.bedtimeReminderEnabled !== false;
  const wakeOn = settings.wakeNaturalEnabled !== false;

  for (let d = 0; d < daysAhead; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    day.setSeconds(0, 0);

    if (bedtimeOn) {
      const bed = new Date(day);
      bed.setHours(bedHour, 0, 0, 0);
      if (bed > now) {
        list.push({ id: NOTIF_IDS.BEDTIME + d, at: bed, channelId: 'bedtime' });
      }
    }

    if (wakeOn) {
      const wake = new Date(day);
      wake.setDate(wake.getDate() + (wakeHour <= bedHour ? 1 : 0));
      wake.setHours(wakeHour, 0, 0, 0);
      if (wake <= now) continue;
      pickWakeSteps(Number(settings.wakeLeadMinutes ?? DEFAULT_WAKE_LEAD_MINUTES)).forEach((step, i) => {
        const at = new Date(wake.getTime() - step.offsetMin * 60 * 1000);
        if (at > now) list.push({ id: NOTIF_IDS.WAKE_LEAD + d * 10 + i, at, channelId: 'natural-wake' });
      });
    }
  }
  return list.sort((a, b) => a.at - b.at);
}

function isInWakeWindow(settings, now = new Date()) {
  if (!settings.wakeNaturalEnabled) return false;
  const wakeHour = Number(settings.targetWakeHour ?? 7);
  const lead = Number(settings.wakeLeadMinutes ?? DEFAULT_WAKE_LEAD_MINUTES);
  const wake = new Date(now);
  wake.setHours(wakeHour, 0, 0, 0);
  wake.setSeconds(0, 0);
  const start = new Date(wake.getTime() - lead * 60 * 1000);
  const end = new Date(wake.getTime() + 15 * 60 * 1000);
  if (now < start || now > end) return false;
  return true;
}

function wakeWindowProgress(settings, now = new Date()) {
  const wakeHour = Number(settings.targetWakeHour ?? 7);
  const lead = Number(settings.wakeLeadMinutes ?? DEFAULT_WAKE_LEAD_MINUTES);
  const wake = new Date(now);
  wake.setHours(wakeHour, 0, 0, 0);
  wake.setSeconds(0, 0);
  const start = wake.getTime() - lead * 60 * 1000;
  const end = wake.getTime();
  if (now < start) return 0;
  if (now >= end) return 1;
  return (now - start) / (end - start);
}

module.exports = {
  NOTIF_IDS,
  DEFAULT_WAKE_LEAD_MINUTES,
  buildReminderSchedule,
  pickWakeSteps,
  isInWakeWindow,
  wakeWindowProgress,
};
