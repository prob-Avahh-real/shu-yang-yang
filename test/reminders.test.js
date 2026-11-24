const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

describe('reminders', () => {
  /** @type {typeof import('../src/reminders.js')} */
  let mod;

  before(async () => {
    mod = await import('../src/reminders.js');
  });

  it('pickWakeSteps respects lead minutes', () => {
    assert.equal(mod.pickWakeSteps(0).length, 1);
    assert.equal(mod.pickWakeSteps(10).length, 2);
    assert.equal(mod.pickWakeSteps(30).length, 4);
  });

  it('builds future bedtime and wake notifications', () => {
    const now = new Date('2026-07-16T12:00:00');
    const list = mod.buildReminderSchedule(
      {
        targetBedHour: 23,
        targetWakeHour: 7,
        bedtimeReminderEnabled: true,
        wakeNaturalEnabled: true,
        wakeLeadMinutes: 30,
      },
      now,
      2
    );
    assert.ok(list.length >= 2);
    assert.ok(list.every((n) => n.at > now));
    assert.ok(list[0].at <= list[list.length - 1].at);
  });

  it('skips disabled reminders and past bedtime today', () => {
    const noon = new Date('2026-07-16T12:00:00');
    const none = mod.buildReminderSchedule(
      { bedtimeReminderEnabled: false, wakeNaturalEnabled: false },
      noon,
      3
    );
    assert.equal(none.length, 0);

    const lateNight = new Date('2026-07-16T23:30:00');
    const bedOnly = mod.buildReminderSchedule({ targetBedHour: 23, bedtimeReminderEnabled: true, wakeNaturalEnabled: false }, lateNight, 1);
    assert.equal(bedOnly.length, 0);
  });

  it('detects wake window and progress', () => {
    const settings = { wakeNaturalEnabled: true, targetWakeHour: 7, wakeLeadMinutes: 30 };
    const inWindow = new Date('2026-07-16T06:45:00');
    const before = new Date('2026-07-16T06:00:00');
    const after = new Date('2026-07-16T07:30:00');
    assert.equal(mod.isInWakeWindow(settings, inWindow), true);
    assert.equal(mod.isInWakeWindow(settings, before), false);
    assert.equal(mod.isInWakeWindow({ ...settings, wakeNaturalEnabled: false }, inWindow), false);
    assert.ok(mod.wakeWindowProgress(settings, inWindow) > 0);
    assert.equal(mod.wakeWindowProgress(settings, before), 0);
    assert.equal(mod.wakeWindowProgress(settings, after), 1);
  });

  it('allManagedIds returns bedtime and wake ids', () => {
    const ids = mod.allManagedIds(2);
    assert.ok(ids.includes(mod.NOTIF_IDS.BEDTIME));
    assert.ok(ids.includes(mod.NOTIF_IDS.BEDTIME + 1));
    assert.ok(ids.includes(mod.NOTIF_IDS.WAKE_FINAL));
  });

  it('schedules wake after bedtime when wake hour <= bed hour', () => {
    const now = new Date('2026-07-16T08:00:00');
    const list = mod.buildReminderSchedule(
      { targetBedHour: 23, targetWakeHour: 7, wakeNaturalEnabled: true, wakeLeadMinutes: 15, bedtimeReminderEnabled: false },
      now,
      1
    );
    assert.ok(list.length > 0);
    assert.ok(list.every((n) => n.channelId === 'natural-wake'));
  });
});
