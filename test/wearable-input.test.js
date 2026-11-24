const { describe, it, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

describe('wearable-input', () => {
  /** @type {typeof import('../src/wearable-input.js')} */
  let mod;
  /** @type {typeof import('../src/wearable-input.js').createWearableInput} */
  let createWearableInput;

  const saved = {};

  before(async () => {
    mod = await import('../src/wearable-input.js');
    createWearableInput = mod.createWearableInput;
  });

  beforeEach(() => {
    saved.addEventListener = global.window?.addEventListener;
    saved.removeEventListener = global.window?.removeEventListener;
    global.window = {
      addEventListener(type, fn) {
        this[`_${type}`] = fn;
      },
      removeEventListener(type) {
        delete this[`_${type}`];
      },
    };
    global.DeviceOrientationEvent = { requestPermission: async () => 'granted' };
    global.DeviceMotionEvent = { requestPermission: async () => 'granted' };
  });

  afterEach(() => {
    if (saved.addEventListener) global.window.addEventListener = saved.addEventListener;
    if (saved.removeEventListener) global.window.removeEventListener = saved.removeEventListener;
  });

  it('registers orientation and motion listeners on start/stop', () => {
    const input = createWearableInput({});
    assert.equal(input.isListening(), false);
    input.start();
    assert.equal(input.isListening(), true);
    assert.ok(global.window._deviceorientation);
    assert.ok(global.window._devicemotion);
    input.stop();
    assert.equal(input.isListening(), false);
  });

  it('ring shake triggers handler after throttle frames', () => {
    let shakes = 0;
    const input = createWearableInput({ onRingShake: () => shakes++ });
    input.start();
    const handler = global.window._deviceorientation;
    for (let i = 0; i < 8; i++) handler({ beta: i * 30, gamma: i * 30 });
    assert.equal(shakes, 1);
    input.stop();
  });

  it('ring tilt directions fire handlers', () => {
    const events = [];
    const input = createWearableInput({
      onRingTiltUp: () => events.push('up'),
      onRingTiltDown: () => events.push('down'),
      onRingTiltLeft: () => events.push('left'),
      onRingTiltRight: () => events.push('right'),
    });
    input.start();
    const handler = global.window._deviceorientation;
    for (let i = 0; i < 8; i++) handler({ beta: 10, gamma: 0 });
    for (let i = 0; i < 8; i++) handler({ beta: -10, gamma: 0 });
    for (let i = 0; i < 8; i++) handler({ beta: 0, gamma: 10 });
    for (let i = 0; i < 8; i++) handler({ beta: 0, gamma: -10 });
    assert.ok(events.includes('down'));
    assert.ok(events.includes('up'));
    assert.ok(events.includes('right'));
    assert.ok(events.includes('left'));
    input.stop();
  });

  it('cane tap detects acceleration spike', () => {
    let taps = 0;
    const input = createWearableInput({ onCaneTap: () => taps++ });
    input.start();
    const handler = global.window._devicemotion;
    for (let i = 0; i < 6; i++) handler({ accelerationIncludingGravity: { x: 0, y: 0, z: 20 } });
    assert.equal(taps, 1);
    input.stop();
  });

  it('requestPermission resolves on web without APIs', async () => {
    delete global.DeviceOrientationEvent.requestPermission;
    delete global.DeviceMotionEvent.requestPermission;
    const input = createWearableInput({});
    assert.equal(await input.requestPermission(), true);
  });

  it('requestPermission handles denied orientation', async () => {
    global.DeviceOrientationEvent.requestPermission = async () => 'denied';
    const input = createWearableInput({});
    assert.equal(await input.requestPermission(), false);
  });

  it('requestPermission handles motion permission errors', async () => {
    global.DeviceOrientationEvent.requestPermission = async () => {
      throw new Error('denied');
    };
    global.DeviceMotionEvent.requestPermission = async () => 'granted';
    const input = createWearableInput({});
    assert.equal(await input.requestPermission(), false);
  });

  it('cane handler ignores missing acceleration', () => {
    let taps = 0;
    const input = createWearableInput({ onCaneTap: () => taps++ });
    input.start();
    for (let i = 0; i < 6; i++) global.window._devicemotion({});
    assert.equal(taps, 0);
    input.stop();
  });
});
