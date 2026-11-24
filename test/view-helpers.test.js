const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

describe('view-helpers', () => {
  /** @type {typeof import('../src/view-helpers.js')} */
  let mod;

  before(async () => {
    mod = await import('../src/view-helpers.js');
  });

  it('stagePercents splits sleep stages', () => {
    assert.deepEqual(mod.stagePercents(null), { deep: 0, rem: 0, light: 0 });
    const p = mod.stagePercents({ totalMinutes: 400, deepMinutes: 80, remMinutes: 100 });
    assert.equal(p.deep, 20);
    assert.equal(p.rem, 25);
    assert.equal(p.light, 55);
  });

  it('qualityBannerClass maps grades', () => {
    assert.equal(mod.qualityBannerClass('A'), 'ok');
    assert.equal(mod.qualityBannerClass('B'), 'ok');
    assert.equal(mod.qualityBannerClass('C'), 'warn');
    assert.equal(mod.qualityBannerClass('F'), 'bad');
  });

  it('averageScore ignores unscored sessions', () => {
    assert.equal(mod.averageScore([]), 0);
    assert.equal(mod.averageScore([{ score: 80 }, { score: 90 }]), 85);
    assert.equal(mod.averageScore([{}, { score: 60 }]), 60);
  });

  it('nextTab cycles tabs', () => {
    const tabs = mod.TABS;
    assert.equal(mod.nextTab(tabs, 'overview', 1).id, 'analysis');
    assert.equal(mod.nextTab(tabs, 'history', 1).id, 'overview');
    assert.equal(mod.nextTab(tabs, 'missing', 1).id, 'overview');
  });

  it('profileOptionsHtml marks selected profile', () => {
    const html = mod.profileOptionsHtml(
      [
        { id: 'adult', icon: '🧑', name: '成年人' },
        { id: 'osa', icon: '🫁', name: 'OSA' },
      ],
      'osa'
    );
    assert.ok(html.includes('selected'));
    assert.ok(html.includes('OSA'));
  });

  it('symptomVisibility toggles condition blocks', () => {
    assert.deepEqual(mod.symptomVisibility({ condition: 'osa' }), {
      showSection: true,
      showOsa: true,
      showParkinson: false,
    });
    assert.deepEqual(mod.symptomVisibility({ condition: 'parkinson' }).showParkinson, true);
    assert.equal(mod.symptomVisibility({}).showSection, false);
  });

  it('trendScoreValues maps recent sessions', () => {
    const scores = mod.trendScoreValues([{ id: 1 }, { id: 2 }], () => 88, 2);
    assert.deepEqual(scores, [88, 88]);
  });

  it('reminderStatusMessage formats sync results', () => {
    assert.equal(mod.reminderStatusMessage({ mode: 'denied' }), '请授予通知权限');
    assert.match(mod.reminderStatusMessage({ scheduled: 3, mode: 'web-fallback' }), /3/);
    assert.equal(mod.reminderStatusMessage({ scheduled: 0, mode: 'none' }), '暂无未来提醒');
  });

  it('healthAvailabilityText covers web and native', () => {
    assert.match(mod.healthAvailabilityText({ available: true, label: 'HK' }), /HK/);
    assert.match(mod.healthAvailabilityText({ platform: 'web' }), /APK/);
    assert.equal(mod.healthAvailabilityText({ available: false, platform: 'ios' }), '健康数据不可用');
  });
});
