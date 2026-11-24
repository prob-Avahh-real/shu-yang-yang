const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

describe('standards', () => {
  /** @type {typeof import('../src/standards.js')} */
  let mod;

  before(async () => {
    mod = await import('../src/standards.js');
  });

  it('getProfile returns adult by default and for unknown ids', () => {
    assert.equal(mod.getProfile().id, 'adult');
    assert.equal(mod.getProfile('unknown').id, 'adult');
    assert.equal(mod.getProfile('osa').condition, 'osa');
    assert.equal(mod.getProfile('parkinson').condition, 'parkinson');
    assert.equal(mod.getProfile('senior').id, 'senior');
    assert.equal(mod.getProfile('teen').id, 'teen');
  });

  it('scoreToGrade maps thresholds', () => {
    assert.equal(mod.scoreToGrade(95), 'A');
    assert.equal(mod.scoreToGrade(90), 'A');
    assert.equal(mod.scoreToGrade(85), 'B');
    assert.equal(mod.scoreToGrade(80), 'B');
    assert.equal(mod.scoreToGrade(70), 'C');
    assert.equal(mod.scoreToGrade(65), 'C');
    assert.equal(mod.scoreToGrade(55), 'D');
    assert.equal(mod.scoreToGrade(50), 'D');
    assert.equal(mod.scoreToGrade(30), 'F');
  });

  it('deriveMetrics computes percentages and derived fragmentation', () => {
    const m = mod.deriveMetrics({
      totalMinutes: 480,
      deepMinutes: 96,
      remMinutes: 105,
      timeInBedMinutes: 510,
      awakenings: 2,
      sleepOnsetMinutes: 12,
      restingHrBpm: 60,
      bedtimeDriftMin: 20,
      spo2Min: 94,
      spo2Avg: 96,
    });
    assert.equal(m.deepPct, 20);
    assert.equal(m.remPct, 21.875);
    assert.ok(m.efficiency > 94);
    assert.ok(m.fragmentationIndex > 0);
  });

  it('deriveMetrics handles empty session', () => {
    const m = mod.deriveMetrics({});
    assert.equal(m.totalMinutes, 0);
    assert.equal(m.deepPct, 0);
    assert.equal(m.efficiency, 0);
    assert.equal(m.fragmentationIndex, 0);
  });

  it('deriveMetrics uses provided fragmentationIndex', () => {
    const m = mod.deriveMetrics({ totalMinutes: 400, fragmentationIndex: 22 });
    assert.equal(m.fragmentationIndex, 22);
  });

  it('exports grades, profiles, disclaimer, advice library', () => {
    assert.ok(mod.GRADES.A.label);
    assert.ok(mod.PROFILES.length >= 5);
    assert.ok(mod.MEDICAL_DISCLAIMER.includes('医疗'));
    assert.ok(mod.ADVICE_LIBRARY.duration_short.tips.length > 0);
    assert.ok(mod.ADVICE_LIBRARY.osa_cpap.tips.length > 0);
    assert.ok(mod.ADVICE_LIBRARY.pd_rbd.tips.length > 0);
  });
});
