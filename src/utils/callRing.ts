let ringCtx: AudioContext | null = null;
let ringGain: GainNode | null = null;
let ringOsc: OscillatorNode | null = null;
let ringInterval: number | null = null;
let ringOn = false;

export function playGlobalRingTone(onMs = 1000, offMs = 1000, freq = 800) {
  if (ringOn) return;
  
  try {
    const Ctx = (window as typeof window & { webkitAudioContext?: typeof AudioContext }).AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx: AudioContext = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    
    ringCtx = ctx;
    ringOsc = osc;
    ringGain = gain;
    ringOn = true;
    
    let on = false;
    ringInterval = window.setInterval(() => {
      on = !on;
      if (ringGain) ringGain.gain.value = on ? 0.2 : 0;
    }, onMs + offMs);
    
    setTimeout(() => {
      if (ringGain) {
        ringGain.gain.value = 0.2;
        setTimeout(() => {
          if (ringGain) ringGain.gain.value = 0;
        }, onMs);
      }
    }, 0);
    
  } catch (err) {
    console.error('❌ [GLOBAL] Ring error:', err);
  }
}

export function stopGlobalRingTone() {
  try {
    if (ringInterval) {
      window.clearInterval(ringInterval);
      ringInterval = null;
    }
    
    if (ringGain) {
      ringGain.gain.value = 0;
    }
    
    if (ringOsc) {
      try {
        ringOsc.stop();
      } catch {}
      ringOsc.disconnect();
      ringOsc = null;
    }
    
    if (ringCtx) {
      try {
        ringCtx.close();
      } catch {}
      ringCtx = null;
    }
    
    ringGain = null;
    ringOn = false;
    
  } catch (err) {
    console.error('❌ [GLOBAL] Stop ring error:', err);
  }
}

