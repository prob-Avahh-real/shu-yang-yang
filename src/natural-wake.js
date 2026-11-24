import { isInWakeWindow, wakeWindowProgress } from './reminders.js';

let audioCtx = null;
let gainNode = null;
let oscNodes = [];
let rafId = null;
let running = false;

function getAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0;
    gainNode.connect(audioCtx.destination);
  }
  return { audioCtx, gainNode };
}

/** Gentle dual-tone sunrise ramp using Web Audio. */
function ensureOscillators() {
  const { audioCtx, gainNode } = getAudio();
  if (oscNodes.length) return;
  for (const freq of [220, 330]) {
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gainNode);
    osc.start();
    oscNodes.push(osc);
  }
}

function stopOscillators() {
  for (const osc of oscNodes) {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      /* already stopped */
    }
  }
  oscNodes = [];
}

async function pulseHaptic(intensity = 'light') {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const style = intensity === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light;
    await Haptics.impact({ style });
  } catch {
    /* web / no haptics */
  }
}

function tick(settings) {
  if (!isInWakeWindow(settings)) {
    stopNaturalWake();
    return;
  }
  const progress = wakeWindowProgress(settings);
  const { gainNode } = getAudio();
  ensureOscillators();
  const vol = Math.min(0.35, 0.02 + progress * 0.33);
  gainNode.gain.setTargetAtTime(vol, getAudio().audioCtx.currentTime, 0.3);

  if (progress > 0.5 && Math.floor(Date.now() / 8000) !== tick._lastPulse) {
    tick._lastPulse = Math.floor(Date.now() / 8000);
    pulseHaptic(progress > 0.85 ? 'medium' : 'light');
  }

  rafId = requestAnimationFrame(() => tick(settings));
}

/** Start in-app natural wake (audio + haptics) when in wake window. */
export function startNaturalWakeLoop(settings) {
  if (running) return;
  if (!isInWakeWindow(settings)) return;
  running = true;
  try {
    getAudio().audioCtx.resume();
  } catch {
    /* ignore */
  }
  tick(settings);
}

export function stopNaturalWake() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  if (gainNode) gainNode.gain.value = 0;
  stopOscillators();
}

/** Poll every minute for wake window when app open. */
export function attachNaturalWakeMonitor(settingsRef, intervalMs = 60000) {
  const check = () => {
    const s = typeof settingsRef === 'function' ? settingsRef() : settingsRef;
    if (isInWakeWindow(s)) startNaturalWakeLoop(s);
    else stopNaturalWake();
  };
  check();
  return setInterval(check, intervalMs);
}

export { isInWakeWindow, wakeWindowProgress };
