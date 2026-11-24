const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

describe('assess', () => {
  /** @type {typeof import('../src/assess.js')} */
  let mod;

  before(async () => {
    mod = await import('../src/assess.js');
  });

  const goodSession = {
    totalMinutes: 480,
    timeInBedMinutes: 510,
    deepMinutes: 96,
    remMinutes: 105,
    awakenings: 1,
    sleepOnsetMinutes: 10,
    restingHrBpm: 58,
    bedtimeDriftMin: 15,
  };

  it('grades good sleep as A or B', () => {
    const r = mod.assessSession(goodSession);
    assert.ok(['A', 'B'].includes(r.grade));
    assert.equal(r.pass, true);
    assert.ok(r.score >= 80);
    assert.ok(r.summary.includes('优质') || r.summary.includes('良好') || r.summary.includes('稳定'));
    assert.equal(r.disclaimer, null);
  });

  it('flags poor sleep', () => {
    const r = mod.assessSession({
      totalMinutes: 300,
      timeInBedMinutes: 420,
      deepMinutes: 30,
      remMinutes: 40,
      awakenings: 6,
      sleepOnsetMinutes: 45,
      restingHrBpm: 78,
      bedtimeDriftMin: 90,
    });
    assert.ok(['D', 'F'].includes(r.grade));
    assert.equal(r.pass, false);
    assert.ok(r.warnings.length > 0);
    assert.ok(r.advice.length > 0);
  });

  it('OSA profile flags risk patterns and advice', () => {
    const r = mod.assessSession(
      {
        totalMinutes: 360,
        timeInBedMinutes: 480,
        deepMinutes: 50,
        remMinutes: 55,
        awakenings: 6,
        sleepOnsetMinutes: 25,
        restingHrBpm: 72,
        spo2Min: 87,
        bedtimeDriftMin: 40,
        hypopneaIndex: 18,
        apneaEvents: 6,
      },
      'osa',
      { symptoms: { snoring: true, daytimeSleepiness: true } }
    );
    assert.ok(['C', 'D', 'F'].includes(r.grade));
    assert.ok(r.risks.some((x) => x.id === 'osa_suspected' || x.id === 'desaturation'));
    assert.equal(r.condition, 'osa');
    assert.ok(r.disclaimer);
    assert.ok(r.conditionAdvice.length > 0);
    assert.ok(r.conditionCallouts.length > 0);
    assert.ok(r.clinicalSummary.includes('OSA'));
  });

  it('Parkinson profile scores fragmented low-REM sleep', () => {
    const r = mod.assessSession(
      {
        totalMinutes: 380,
        timeInBedMinutes: 450,
        deepMinutes: 40,
        remMinutes: 30,
        awakenings: 5,
        sleepOnsetMinutes: 35,
        restingHrBpm: 68,
        fragmentationIndex: 42,
        earlyWakeMinutes: 50,
        rbdRiskScore: 70,
        remBehaviorFlag: true,
      },
      'parkinson',
      { symptoms: { actingOutDreams: true, tremorAtNight: true } }
    );
    assert.ok(['C', 'D', 'F'].includes(r.grade));
    assert.ok(r.risks.some((x) => x.id === 'pd_sleep_concern' || x.id === 'rbd_risk'));
    assert.equal(r.condition, 'parkinson');
    assert.ok(r.metrics.remPct < 12);
    assert.ok(r.clinicalSummary.includes('帕金森'));
  });

  it('senior and teen profiles produce checks', () => {
    const senior = mod.assessSession({ ...goodSession, totalMinutes: 420 }, 'senior');
    const teen = mod.assessSession({ ...goodSession, totalMinutes: 540 }, 'teen');
    assert.equal(senior.profileId, 'senior');
    assert.equal(teen.profileId, 'teen');
    assert.ok(senior.checks.length > 0);
    assert.ok(teen.checks.length > 0);
  });

  it('formatMetric formats values and nulls', () => {
    assert.equal(mod.formatMetric('totalMinutes', null), '—');
    assert.equal(mod.formatMetric('totalMinutes', 90), '1h 30m');
    assert.equal(mod.formatMetric('totalMinutes', 45), '45m');
    assert.equal(mod.formatMetric('deepPct', 20.456), '20.5');
    assert.equal(mod.formatMetric('restingHrBpm', 58.7), '59');
    assert.equal(mod.formatMetric('awakenings', 2.2), '2');
    assert.equal(mod.formatMetric('fragmentationIndex', 33.7), '34');
    assert.equal(mod.formatMetric('spo2Min', 91.2), '91');
    assert.equal(mod.formatMetric('earlyWakeMinutes', 12.8), '13');
    assert.equal(mod.formatMetric('unknown', 42), '42');
  });

  it('formatTime and formatDate handle missing and valid timestamps', () => {
    assert.equal(mod.formatTime(null), '—');
    assert.equal(mod.formatDate(null), '—');
    const ts = new Date('2026-07-16T07:30:00').getTime();
    assert.ok(mod.formatTime(ts).includes('07') || mod.formatTime(ts).includes('7'));
    assert.ok(mod.formatDate(ts).length > 3);
  });

  it('optional metrics score without penalty when missing', () => {
    const r = mod.assessSession(
      {
        totalMinutes: 420,
        timeInBedMinutes: 450,
        deepMinutes: 70,
        remMinutes: 80,
        awakenings: 1,
        sleepOnsetMinutes: 10,
        restingHrBpm: 58,
        bedtimeDriftMin: 10,
      },
      'parkinson'
    );
    const earlyWake = r.checks.find((c) => c.id === 'earlyWakeMinutes');
    assert.ok(earlyWake);
    assert.equal(earlyWake.note, '无数据');
  });

  it('OSA ahi_elevated risk when hypopnea index high', () => {
    const r = mod.assessSession(
      {
        totalMinutes: 400,
        timeInBedMinutes: 460,
        deepMinutes: 60,
        remMinutes: 70,
        awakenings: 2,
        sleepOnsetMinutes: 10,
        restingHrBpm: 60,
        bedtimeDriftMin: 10,
        hypopneaIndex: 20,
      },
      'osa'
    );
    assert.ok(r.risks.some((x) => x.id === 'ahi_elevated'));
  });
});
