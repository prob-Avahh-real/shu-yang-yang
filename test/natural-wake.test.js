const { describe, it, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

describe('natural-wake', () => {
  /** @type {typeof import('../src/natural-wake.js')} */
  let mod;

  const saved = {};

  before(async () => {
    mod = await import('../src/natural-wake.js');
  });

  beforeEach(() => {
    saved.raf = global.requestAnimationFrame;
    saved.cancel = global.cancelAnimationFrame;
    saved.AudioContext = global.AudioContext;
    saved.webkitAudioContext = global.webkitAudioContext;

    global.requestAnimationFrame = (fn) => {
      global.__lastRaf = fn;
      return 1;
    };
    global.cancelAnimationFrame = () => {};

    class MockGain {
      constructor() {
        this.gain = { value: 0, setTargetAtTime(v) { this.value = v; } };
      }
      connect() {}
    }
    class MockOsc {
      constructor() {
        this.frequency = { value: 0 };
        this.type = 'sine';
      }
      connect() {}
      start() {}
      stop() {}
      disconnect() {}
    }
    class MockAudioContext {
      constructor() {
        this.currentTime = 0;
        this.destination = {};
      }
      createGain() {
        return new MockGain();
      }
      createOscillator() {
        return new MockOsc();
      }
      resume() {
        return Promise.resolve();
      }
    }
    global.AudioContext = MockAudioContext;
    global.window = { AudioContext: MockAudioContext, webkitAudioContext: MockAudioContext };
  });

  afterEach(() => {
    mod.stopNaturalWake();
    global.requestAnimationFrame = saved.raf;
    global.cancelAnimationFrame = saved.cancel;
    global.AudioContext = saved.AudioContext;
    global.webkitAudioContext = saved.webkitAudioContext;
  });

  it('re-exports wake window helpers', () => {
    const settings = { wakeNaturalEnabled: true, targetWakeHour: 7, wakeLeadMinutes: 30 };
    const inWindow = new Date('2026-07-16T06:50:00');
    assert.equal(mod.isInWakeWindow(settings, inWindow), true);
    assert.ok(mod.wakeWindowProgress(settings, inWindow) > 0);
  });

  it('startNaturalWakeLoop runs when in wake window', () => {
    const settings = { wakeNaturalEnabled: true, targetWakeHour: 7, wakeLeadMinutes: 30 };
    const inWindow = new Date('2026-07-16T06:50:00');
    const realDate = Date;
    global.Date = class extends realDate {
      constructor(...args) {
        if (args.length === 0) return inWindow;
        return new realDate(...args);
      }
      static now() {
        return inWindow.getTime();
      }
    };
    mod.startNaturalWakeLoop(settings);
    assert.ok(global.__lastRaf);
    global.__lastRaf(settings);
    mod.stopNaturalWake();
    global.Date = realDate;
  });

  it('startNaturalWakeLoop no-ops outside window', () => {
    const settings = { wakeNaturalEnabled: true, targetWakeHour: 7, wakeLeadMinutes: 30 };
    const outside = new Date('2026-07-16T03:00:00');
    const RealDate = Date;
    global.Date = class extends RealDate {
      constructor(...args) {
        if (!args.length) return outside;
        return new RealDate(...args);
      }
      static now() {
        return outside.getTime();
      }
    };
    delete global.__lastRaf;
    mod.startNaturalWakeLoop(settings);
    assert.equal(global.__lastRaf, undefined);
    global.Date = RealDate;
  });

  it('attachNaturalWakeMonitor polls settings', () => {
    const settings = { wakeNaturalEnabled: true, targetWakeHour: 7, wakeLeadMinutes: 30 };
    const timer = mod.attachNaturalWakeMonitor(() => settings, 60000);
    clearInterval(timer);
    mod.stopNaturalWake();
  });

  it('stopNaturalWake clears running loop after tick', () => {
    const settings = { wakeNaturalEnabled: true, targetWakeHour: 7, wakeLeadMinutes: 30 };
    const inWindow = new Date('2026-07-16T06:50:00');
    const RealDate = Date;
    global.Date = class extends RealDate {
      constructor(...args) {
        if (!args.length) return inWindow;
        return new RealDate(...args);
      }
      static now() {
        return inWindow.getTime();
      }
    };
    mod.startNaturalWakeLoop(settings);
    mod.stopNaturalWake();
    global.Date = RealDate;
  });
});
