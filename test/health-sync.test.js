const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

describe('health-sync', () => {
  /** @type {typeof import('../src/health-sync.js')} */
  let mod;

  before(async () => {
    mod = await import('../src/health-sync.js');
  });

  it('maps HealthKit sleep rows', () => {
    const rows = mod.mapHealthKitSleepSamples(
      [
        {
          startDate: '2026-07-15T23:30:00.000Z',
          endDate: '2026-07-16T07:00:00.000Z',
          deepMinutes: 90,
          remMinutes: 100,
          restingHrBpm: 56,
        },
      ],
      { targetBedHour: 23 }
    );
    assert.equal(rows.length, 1);
    assert.ok(rows[0].totalMinutes >= 400);
    assert.equal(rows[0].source, 'health');
    assert.equal(rows[0].label, 'Apple 健康');
    assert.ok(rows[0].rbdRiskScore != null);
  });

  it('skips invalid HealthKit rows', () => {
    assert.deepEqual(mod.mapHealthKitSleepSamples([{ startDate: 'x', endDate: 'y' }]), []);
    assert.deepEqual(mod.mapHealthKitSleepSamples(null), []);
  });

  it('enrichSessionFromHealth adds OSA and RBD fields', () => {
    const base = {
      totalMinutes: 400,
      remMinutes: 30,
      awakenings: 5,
      bedTime: Date.now() - 8 * 3600000,
      wakeTime: Date.now(),
    };
    const enriched = mod.enrichSessionFromHealth(
      { spo2Min: 88, spo2Avg: 92, hypopneaIndex: 20, apneaEvents: 8 },
      base
    );
    assert.equal(enriched.spo2Min, 88);
    assert.equal(enriched.source, 'health');
    assert.equal(enriched.remBehaviorFlag, true);
    assert.ok(enriched.rbdRiskScore >= 60);
  });

  it('maps Health Connect records with stages', () => {
    const records = mod.mapHealthConnectSleep(
      [
        {
          startTime: '2026-07-15T22:00:00.000Z',
          endTime: '2026-07-16T06:30:00.000Z',
          stages: [
            { startTime: '2026-07-15T22:00:00.000Z', endTime: '2026-07-15T23:00:00.000Z', stage: 'light' },
            { startTime: '2026-07-15T23:00:00.000Z', endTime: '2026-07-16T01:00:00.000Z', stage: 'deep' },
            { startTime: '2026-07-16T01:00:00.000Z', endTime: '2026-07-16T02:00:00.000Z', stage: 'rem' },
            { startTime: '2026-07-16T02:00:00.000Z', endTime: '2026-07-16T02:10:00.000Z', stage: 'awake' },
          ],
          oxygenSaturation: { minimum: 89, average: 94 },
          apneaHypopneaIndex: 12,
        },
      ],
      { targetBedHour: 22 }
    );
    assert.equal(records.length, 1);
    assert.equal(records[0].source, 'health');
    assert.equal(records[0].label, 'Health Connect');
    assert.equal(records[0].spo2Min, 89);
    assert.ok(records[0].deepMinutes >= 60);
    assert.ok(records[0].awakenings >= 1);
  });

  it('Health Connect falls back to estimated stages', () => {
    const records = mod.mapHealthConnectSleep(
      [{ startTime: '2026-07-15T22:00:00.000Z', endTime: '2026-07-16T06:00:00.000Z' }],
      {}
    );
    assert.equal(records.length, 1);
    assert.ok(records[0].deepMinutes > 0);
    assert.ok(records[0].remMinutes > 0);
  });

  it('importHealthSleep returns web error on non-native', async () => {
    const r = await mod.importHealthSleep({}, 14);
    assert.equal(r.platform, 'web');
    assert.ok(r.error);
    assert.deepEqual(r.sessions, []);
  });

  it('checkHealthAvailability reports web unavailable', async () => {
    const h = await mod.checkHealthAvailability();
    assert.equal(h.available, false);
    assert.equal(h.platform, 'web');
  });

  it('skips short HealthKit and Health Connect sessions', () => {
    assert.deepEqual(
      mod.mapHealthKitSleepSamples([
        { startDate: '2026-07-16T07:00:00.000Z', endDate: '2026-07-16T07:20:00.000Z' },
      ]),
      []
    );
    assert.deepEqual(
      mod.mapHealthConnectSleep([
        { startTime: '2026-07-16T07:00:00.000Z', endTime: '2026-07-16T07:20:00.000Z' },
      ]),
      []
    );
  });

  it('normalizeHealthKitRow parses sleep states', () => {
    const deep = mod.normalizeHealthKitRow({
      startDate: '2026-07-16T00:00:00.000Z',
      endDate: '2026-07-16T01:00:00.000Z',
      sleepState: 'deep',
    });
    assert.equal(deep.deepMinutes, 60);

    const rem = mod.normalizeHealthKitRow({ sleepState: 'rem', duration: 0.5 });
    assert.equal(rem.remMinutes, 30);

    const awake = mod.normalizeHealthKitRow({ value: 'awake', duration: 0.25 });
    assert.equal(awake.awakenings, 1);
  });

  it('groupSpO2ByNight aggregates nightly values', () => {
    const grouped = mod.groupSpO2ByNight([
      { startDate: '2026-07-16T02:00:00.000Z', value: 0.92 },
      { startDate: '2026-07-16T03:00:00.000Z', value: 0.88 },
      { startDate: '2026-07-16T04:00:00.000Z', value: 95 },
    ]);
    const key = Object.keys(grouped)[0];
    assert.ok(grouped[key].min <= 90);
    assert.ok(grouped[key].avg >= 88);
  });

  it('computeRbdRiskScore and early wake helpers cover branches', () => {
    assert.equal(mod.computeRbdRiskScore(14, 2, 50), 20);
    assert.equal(mod.computeRbdRiskScore(20, 4, 50), 12);
    assert.equal(mod.computeEarlyWakeMinutes(null, 1, 400), null);
    const bed = Date.now() - 10 * 3600000;
    const wakeOnTime = bed + 400 * 60000;
    assert.equal(mod.computeEarlyWakeMinutes(bed, wakeOnTime, 400), 0);
    assert.ok(mod.computeEarlyWakeMinutes(bed, wakeOnTime + 90 * 60000, 400) >= 85);
  });

  it('enrichSessionFromHealth sets respiratory rate when HR missing', () => {
    const enriched = mod.enrichSessionFromHealth(
      { respiratoryRate: 14 },
      { totalMinutes: 420, remMinutes: 90, awakenings: 1, bedTime: 1, wakeTime: 2 }
    );
    assert.equal(enriched.respiratoryRate, 14);
  });
});
