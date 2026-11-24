/** Pure scheduling logic for bedtime / natural wake notifications. */

export const NOTIF_IDS = {
  BEDTIME: 1001,
  WAKE_LEAD: 1100, // 1101..1199 for lead steps
  WAKE_FINAL: 1200,
};

export const DEFAULT_WAKE_LEAD_MINUTES = 30;

/** Minutes before wake time for gentle escalation. */
export const WAKE_ESCALATION = [
  { offsetMin: 30, title: '数羊羊 · 晨光渐近', body: '还有 30 分钟，身体可以慢慢苏醒。' },
  { offsetMin: 15, title: '数羊羊 · 轻柔唤醒', body: '15 分钟后起床，深呼吸，伸个懒腰。' },
  { offsetMin: 5, title: '数羊羊 · 即将起床', body: '5 分钟后，让自然光唤醒你。' },
  { offsetMin: 0, title: '数羊羊 · 早安', body: '该起床啦，祝你今天精神饱满。' },
];

export const BEDTIME_MESSAGES = {
  title: '数羊羊 · 就寝提醒',
  body: '该准备休息了：调暗灯光，远离屏幕，放松身心。',
};

/**
 * Build notification schedule entries for the next `daysAhead` days.
 * @returns {{ id: number, at: Date, title: string, body: string, channelId: string }[]}
 */
export function buildReminderSchedule(settings, now = new Date(), daysAhead = 7) {
  const list = [];
  const bedHour = Number(settings.targetBedHour ?? 23);
  const wakeHour = Number(settings.targetWakeHour ?? 7);
  const wakeLead = Number(settings.wakeLeadMinutes ?? DEFAULT_WAKE_LEAD_MINUTES);
  const bedtimeOn = settings.bedtimeReminderEnabled !== false;
  const wakeOn = settings.wakeNaturalEnabled !== false;

  for (let d = 0; d < daysAhead; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    day.setSeconds(0, 0);

    if (bedtimeOn) {
      const bed = new Date(day);
      bed.setHours(bedHour, 0, 0, 0);
      if (bed <= now && d === 0) {
        // skip past today
      } else if (bed > now) {
        list.push({
          id: NOTIF_IDS.BEDTIME + d,
          at: bed,
          title: BEDTIME_MESSAGES.title,
          body: BEDTIME_MESSAGES.body,
          channelId: 'bedtime',
        });
      }
    }

    if (wakeOn) {
      const wake = new Date(day);
      wake.setDate(wake.getDate() + (wakeHour <= bedHour ? 1 : 0));
      wake.setHours(wakeHour, 0, 0, 0);
      if (wake <= now) continue;

      const steps = pickWakeSteps(wakeLead);
      steps.forEach((step, i) => {
        const at = new Date(wake.getTime() - step.offsetMin * 60 * 1000);
        if (at <= now) return;
        list.push({
          id: NOTIF_IDS.WAKE_LEAD + d * 10 + i,
          at,
          title: step.title,
          body: step.body,
          channelId: 'natural-wake',
          wakeAt: wake.getTime(),
          offsetMin: step.offsetMin,
        });
      });
    }
  }

  return list.sort((a, b) => a.at - b.at);
}

/** Pick wake escalation steps that fit within wakeLeadMinutes. */
export function pickWakeSteps(wakeLeadMinutes) {
  return WAKE_ESCALATION.filter((s) => s.offsetMin <= wakeLeadMinutes);
}

/** All notification ids we manage (for cancel). */
export function allManagedIds(daysAhead = 7) {
  const ids = [];
  for (let d = 0; d < daysAhead; d++) {
    ids.push(NOTIF_IDS.BEDTIME + d);
    for (let i = 0; i < WAKE_ESCALATION.length; i++) {
      ids.push(NOTIF_IDS.WAKE_LEAD + d * 10 + i);
    }
  }
  ids.push(NOTIF_IDS.WAKE_FINAL);
  return ids;
}

/** Is `now` within natural wake window (foreground audio/haptics)? */
export function isInWakeWindow(settings, now = new Date()) {
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

/** Progress 0..1 through wake window for audio ramp. */
export function wakeWindowProgress(settings, now = new Date()) {
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
