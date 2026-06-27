/**
 * Synthesizes a mobile-like haptic feedback sound using Web Audio API.
 * This does not require external audio files and works immediately.
 */
let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

export const playHapticFeedback = (type: 'click' | 'success' | 'warning' | 'heavy' = 'click') => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'click') {
      // Small, clean tactile click sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
      
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'heavy') {
      // Deep, mechanical thud click
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'success') {
      // High-end dual confirmation beep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1200, now + 0.07);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'warning') {
      // Lower pitched cautionary buzz
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.setValueAtTime(110, now + 0.1);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.start(now);
      osc.stop(now + 0.2);
    }

    // Attempt actual hardware vibration if supported by mobile browser
    if (navigator.vibrate) {
      if (type === 'click') navigator.vibrate(10);
      else if (type === 'heavy') navigator.vibrate(25);
      else if (type === 'success') navigator.vibrate([15, 30, 15]);
      else if (type === 'warning') navigator.vibrate([40, 40, 40]);
    }
  } catch (e) {
    // Fail silently if audio context is not allowed or supported yet
  }
};
