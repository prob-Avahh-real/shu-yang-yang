import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { buildReminderSchedule, allManagedIds } from './reminders.js';

const CHANNELS = [
  {
    id: 'bedtime',
    name: '就寝提醒',
    description: '睡前放松与就寝时间提醒',
    importance: 4,
    sound: 'default',
    vibration: true,
  },
  {
    id: 'natural-wake',
    name: '自然唤醒',
    description: '渐进式起床提醒',
    importance: 5,
    sound: 'default',
    vibration: true,
  },
];

function isNative() {
  return Capacitor.isNativePlatform();
}

/** Request notification permission; returns { granted, native }. */
export async function requestNotificationPermission() {
  if (!isNative()) {
    if (typeof Notification !== 'undefined' && Notification.requestPermission) {
      const p = await Notification.requestPermission();
      return { granted: p === 'granted', native: false };
    }
    return { granted: false, native: false, reason: 'web-no-api' };
  }
  const perm = await LocalNotifications.requestPermissions();
  return { granted: perm.display === 'granted', native: true };
}

async function ensureChannels() {
  if (!isNative()) return;
  try {
    await LocalNotifications.createChannel(CHANNELS[0]);
    await LocalNotifications.createChannel(CHANNELS[1]);
  } catch {
    /* iOS has no channels */
  }
}

/** Schedule bedtime + natural wake notifications for next 7 days. */
export async function syncReminders(settings) {
  const entries = buildReminderSchedule(settings);
  if (!entries.length) return { scheduled: 0, mode: 'none' };

  const perm = await requestNotificationPermission();
  if (!perm.granted) return { scheduled: 0, mode: 'denied', ...perm };

  if (!isNative()) {
    return scheduleWebFallback(entries);
  }

  await ensureChannels();
  await LocalNotifications.cancel({ notifications: allManagedIds().map((id) => ({ id })) });

  const notifications = entries.map((e) => ({
    id: e.id,
    title: e.title,
    body: e.body,
    schedule: { at: e.at, allowWhileIdle: true },
    channelId: e.channelId,
    smallIcon: 'ic_stat_icon_config_sample',
    extra: { wakeAt: e.wakeAt, offsetMin: e.offsetMin },
  }));

  await LocalNotifications.schedule({ notifications });
  return { scheduled: notifications.length, mode: 'native' };
}

function scheduleWebFallback(entries) {
  if (typeof Notification === 'undefined') {
    return { scheduled: 0, mode: 'web-unsupported' };
  }
  const future = entries.filter((e) => e.at > new Date()).slice(0, 3);
  for (const e of future) {
    const delay = e.at.getTime() - Date.now();
    const timer = setTimeout(() => {
      try {
        new Notification(e.title, { body: e.body, tag: String(e.id) });
      } catch {
        /* ignore */
      }
    }, delay);
    if (timer.unref) timer.unref();
  }
  return { scheduled: future.length, mode: 'web-fallback' };
}

/** Cancel all managed reminders. */
export async function cancelReminders() {
  if (isNative()) {
    await LocalNotifications.cancel({ notifications: allManagedIds().map((id) => ({ id })) });
  }
  return { ok: true };
}

/** Listen for notification tap (e.g. open app at wake). */
export function onNotificationAction(handler) {
  if (!isNative()) return () => {};
  const sub = LocalNotifications.addListener('localNotificationActionPerformed', (ev) => {
    handler(ev.notification);
  });
  return () => sub.remove();
}

export { buildReminderSchedule };
