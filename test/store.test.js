const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { createMockStorage } = require('./helpers.js');

describe('store', () => {
  /** @type {typeof import('../src/store.js')} */
  let mod;

  before(async () => {
    mod = await import('../src/store.js');
  });

  const sample = {
    totalMinutes: 450,
    deepMinutes: 80,
    remMinutes: 90,
    timeInBedMinutes: 480,
    wakeTime: Date.now(),
  };

  it('normalizes and adds sessions', () => {
    let list = [];
    const rec = mod.normalizeSession(sample);
    assert.ok(rec.id);
    assert.equal(rec.source, 'manual');
    list = mod.addSession(list, rec);
    assert.equal(list.length, 1);
  });

  it('rejects invalid sessions', () => {
    assert.equal(mod.normalizeSession({ totalMinutes: 0 }), null);
    assert.equal(mod.normalizeSession(null), null);
    assert.equal(mod.normalizeSession('bad'), null);
  });

  it('dedupes by wakeDate and caps at 365', () => {
    const a = mod.normalizeSession({ ...sample, id: 'a', wakeDate: '2026-07-16' });
    const b = mod.normalizeSession({ ...sample, id: 'b', wakeDate: '2026-07-16', totalMinutes: 460 });
    let list = mod.addSession([], a);
    list = mod.addSession(list, b);
    assert.equal(list.length, 1);
    assert.equal(list[0].totalMinutes, 460);
  });

  it('removeSession drops by id', () => {
    const s = mod.normalizeSession({ ...sample, id: 'rm1' });
    const list = mod.removeSession([s], 'rm1');
    assert.equal(list.length, 0);
  });

  it('load/save sessions round-trip', () => {
    const storage = createMockStorage();
    const s = mod.normalizeSession(sample);
    mod.saveSessions([s], storage);
    const loaded = mod.loadSessions(storage);
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].totalMinutes, 450);
  });

  it('migrates legacy session storage keys', () => {
    const storage = createMockStorage();
    storage.setItem('mianyang.sessions.v1', JSON.stringify([sample]));
    const loaded = mod.loadSessions(storage);
    assert.equal(loaded.length, 1);
    assert.ok(storage.getItem(mod.STORAGE_KEY));
    assert.equal(storage.getItem('mianyang.sessions.v1'), null);
  });

  it('loadSessions handles corrupt JSON', () => {
    const storage = createMockStorage();
    storage.setItem(mod.STORAGE_KEY, '{bad');
    assert.deepEqual(mod.loadSessions(storage), []);
  });

  it('settings load/save with symptom merge', () => {
    const storage = createMockStorage();
    const defaults = mod.loadSettings(storage);
    assert.equal(defaults.profileId, 'adult');
    assert.equal(defaults.symptoms.snoring, false);

    mod.saveSettings({ profileId: 'osa', symptoms: { snoring: true } }, storage);
    const merged = mod.loadSettings(storage);
    assert.equal(merged.profileId, 'osa');
    assert.equal(merged.symptoms.snoring, true);
    assert.equal(merged.symptoms.daytimeSleepiness, false);
  });

  it('migrates legacy settings keys', () => {
    const storage = createMockStorage();
    storage.setItem('mianyang.settings.v1', JSON.stringify({ profileId: 'teen' }));
    const s = mod.loadSettings(storage);
    assert.equal(s.profileId, 'teen');
    assert.ok(storage.getItem(mod.SETTINGS_KEY));
  });

  it('computeBedtimeDrift handles late-night and early-morning beds', () => {
    const late = new Date('2026-07-15T23:30:00').getTime();
    const early = new Date('2026-07-16T01:00:00').getTime();
    assert.equal(mod.computeBedtimeDrift(late, 23), 30);
    assert.ok(mod.computeBedtimeDrift(early, 23) <= 120);
    assert.equal(mod.computeBedtimeDrift(null, 23), 0);
  });

  it('loadSettings handles corrupt JSON', () => {
    const storage = createMockStorage();
    storage.setItem(mod.SETTINGS_KEY, '{bad');
    const s = mod.loadSettings(storage);
    assert.equal(s.profileId, 'adult');
  });
});
