const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { createMockDom, createMockStorage } = require('./helpers.js');

describe('app boot integration', () => {
  const saved = {};
  let importCounter = 0;

  before(() => {
    saved.document = global.document;
    saved.window = global.window;
    saved.localStorage = global.localStorage;
    saved.confirm = global.confirm;
    saved.setInterval = global.setInterval;
    saved.clearInterval = global.clearInterval;
    saved.requestAnimationFrame = global.requestAnimationFrame;
    saved.cancelAnimationFrame = global.cancelAnimationFrame;
    global.__SHUYANGYANG_TEST__ = true;
  });

  after(() => {
    global.document = saved.document;
    global.window = saved.window;
    global.localStorage = saved.localStorage;
    global.confirm = saved.confirm;
    global.setInterval = saved.setInterval;
    global.clearInterval = saved.clearInterval;
    global.requestAnimationFrame = saved.requestAnimationFrame;
    global.cancelAnimationFrame = saved.cancelAnimationFrame;
    delete global.__SHUYANGYANG_TEST__;
  });

  afterEach(() => {
    if (global.__appInterval) clearInterval(global.__appInterval);
  });

  function setupDom() {
    const { document, map } = createMockDom();
    global.document = document;
    global.window = {
      document,
      addEventListener: () => {},
      AudioContext: class {
        createGain() {
          return { gain: { value: 0, setTargetAtTime() {} }, connect() {} };
        }
        createOscillator() {
          return { connect() {}, start() {}, stop() {}, disconnect() {}, frequency: { value: 0 }, type: 'sine' };
        }
        get currentTime() {
          return 0;
        }
        resume() {
          return Promise.resolve();
        }
      },
    };
    global.localStorage = createMockStorage();
    global.confirm = () => true;
    global.setInterval = (fn, ms) => {
      global.__appInterval = saved.setInterval ? saved.setInterval(fn, ms) : 0;
      return global.__appInterval;
    };
    global.clearInterval = (id) => {
      if (saved.clearInterval) saved.clearInterval(id);
    };
    global.requestAnimationFrame = () => 0;
    global.cancelAnimationFrame = () => {};
    return map;
  }

  async function loadApp() {
    importCounter += 1;
    return import(`../src/app.js?test=${importCounter}`);
  }

  it('boot renders empty state and logs simulated session', async () => {
    const map = setupDom();
    const { boot } = await loadApp();
    boot();

    assert.match(map.get('grade-label').textContent, /暂无|记录/);
    map.get('btn-log').click();
    assert.notEqual(map.get('score-value').textContent, '—');
    assert.ok(Number(map.get('score-value').textContent) > 0);

    map.get('btn-week').click();
    assert.ok(map.get('history-list').children.length > 0 || map.get('history-list').innerHTML.includes('hist'));

    map.get('btn-sim-great').click();
    map.get('btn-sim-poor').click();
    map.get('btn-clear').click();
    assert.match(map.get('grade-label').textContent, /暂无|记录/);
  });

  it('profile change and symptom toggles update UI', async () => {
    const map = setupDom();
    const { boot } = await loadApp();
    boot();

    const profile = map.get('profile-select');
    profile.innerHTML = '<option value="adult">adult</option><option value="osa">osa</option>';
    profile.value = 'osa';
    profile.change(false);

    map.get('symptom-snoring').change(true);
    assert.equal(map.get('symptom-snoring').checked, true);

    map.get('bed-hour').value = '22';
    map.get('bed-hour').change();
    map.get('wake-hour').value = '6';
    map.get('wake-hour').change();
    map.get('bedtime-reminder').change(false);
    map.get('wake-natural').change(true);
    map.get('wake-lead').value = '20';
    map.get('wake-lead').change();
    map.get('btn-reminders').click();
  });

  it('renders loaded OSA session with analysis', async () => {
    const map = setupDom();
    const storage = global.localStorage;
    const { saveSessions, saveSettings } = await import('../src/store.js');
    saveSettings({ profileId: 'osa', symptoms: { snoring: true } }, storage);
    saveSessions(
      [
        {
          totalMinutes: 360,
          timeInBedMinutes: 420,
          deepMinutes: 50,
          remMinutes: 55,
          awakenings: 5,
          spo2Min: 87,
          wakeTime: Date.now(),
        },
      ],
      storage
    );

    const { boot } = await loadApp();
    boot();

    assert.notEqual(map.get('grade-badge').textContent, '—');
    const analysis = map.get('analysis-list');
    assert.ok(analysis.innerHTML.length > 0 || analysis.children.length > 0);
    map.get('btn-health').click();
    map.get('btn-sensors').click();
  });
});
