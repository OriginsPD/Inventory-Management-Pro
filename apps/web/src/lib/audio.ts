/**
 * Browser HTML5 synthesised beep/buzz generators for terminal feedback.
 */

export type AudioToneType = 'sine' | 'square' | 'sawtooth' | 'triangle';

const isSoundEnabled = () => {
  return localStorage.getItem('ims_sound_enabled') !== 'false';
};

export const playAudioTone = (
  frequency: number,
  duration: number,
  type: AudioToneType = 'sine'
) => {
  if (!isSoundEnabled()) return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('AudioContext failed to play tone', e);
  }
};

export const playSuccessBeep = () => {
  playAudioTone(850, 0.08, 'sine');
  setTimeout(() => playAudioTone(1250, 0.1, 'sine'), 70);
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate([50, 30, 50]);
  }
};

export const playErrorBuzz = () => {
  playAudioTone(170, 0.25, 'triangle');
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(200);
  }
};

export const playChirp = () => {
  playAudioTone(950, 0.05, 'sine');
};

export const playNotification = () => {
  playAudioTone(600, 0.1, 'sine');
  setTimeout(() => playAudioTone(900, 0.15, 'sine'), 100);
};
