const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

describe('sleep-simulator', () => {
  /** @type {typeof import('../src/sleep-simulator.js')} */
  let mod;

  before(async () => {
    mod = await import('../src/sleep-simulator.js');
  });

  it('generateSleepSession returns valid session for each quality', () => {
    for (const q of mod.QUALITY_PRESETS) {
      const s = mod.generateSleepSession({ profileId: 'adult', targetWakeHour: 7, targetBedHour: 23 }, q.id);
      assert.ok(s.totalMinutes > 0);
      assert.ok(s.id);
      assert.equal(s.source, 'simulated');
      assert.ok(s.label.includes(q.label));
      assert.ok(s.bedtimeDriftMin >= 0);
    }
  });

  it('generateWeekHistory returns 7 sessions on distinct dates', () => {
    const week = mod.generateWeekHistory({ targetWakeHour: 7 });
    assert.equal(week.length, 7);
    const dates = new Set(week.map((s) => s.wakeDate));
    assert.equal(dates.size, 7);
    assert.ok(week.every((s) => s.totalMinutes > 0));
  });

  it('respects profile targets', () => {
    const s = mod.generateSleepSession({ profileId: 'teen' }, 'good');
    assert.ok(s.totalMinutes >= 400);
  });
});
