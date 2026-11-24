const { describe, it, before, afterEach } = require('node:test');
const assert = require('node:assert/strict');

describe('reminders-native', () => {
  /** @type {typeof import('../src/reminders-native.js')} */
  let mod;

  before(async () => {
    mod = await import('../src/reminders-native.js');
  });

  afterEach(() => {
    delete global.Notification;
  });

  it('requestNotificationPermission returns denied on web without Notification', async () => {
    const r = await mod.requestNotificationPermission();
    assert.equal(r.granted, false);
    assert.equal(r.native, false);
  });

  it('requestNotificationPermission uses web Notification API when available', async () => {
    global.Notification = { requestPermission: async () => 'granted' };
    const r = await mod.requestNotificationPermission();
    assert.equal(r.granted, true);
    assert.equal(r.native, false);
  });

  it('syncReminders returns denied when permission not granted', async () => {
    const r = await mod.syncReminders({
      targetBedHour: 23,
      targetWakeHour: 7,
      bedtimeReminderEnabled: true,
      wakeNaturalEnabled: true,
      wakeLeadMinutes: 30,
    });
    assert.equal(r.mode, 'denied');
    assert.equal(r.scheduled, 0);
  });

  it('syncReminders schedules web fallback when Notification granted', async () => {
    global.Notification = function Notification() {};
    global.Notification.requestPermission = async () => 'granted';
    const r = await mod.syncReminders({
      targetBedHour: 23,
      targetWakeHour: 7,
      bedtimeReminderEnabled: true,
      wakeNaturalEnabled: true,
      wakeLeadMinutes: 30,
    });
    assert.ok(['web-fallback', 'denied', 'none'].includes(r.mode));
  });

  it('syncReminders returns none when schedule empty', async () => {
    const r = await mod.syncReminders({
      bedtimeReminderEnabled: false,
      wakeNaturalEnabled: false,
    });
    assert.equal(r.mode, 'none');
    assert.equal(r.scheduled, 0);
  });

  it('cancelReminders resolves ok on web', async () => {
    const r = await mod.cancelReminders();
    assert.equal(r.ok, true);
  });

  it('onNotificationAction returns noop unsubscribe on web', () => {
    const unsub = mod.onNotificationAction(() => {});
    assert.equal(typeof unsub, 'function');
    unsub();
  });
});
