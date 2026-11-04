let audioContext = null;
let masterGain = null;
let noiseSource = null;
let isRunning = false;
let currentVolume = .32;

export function getAirportAudioVolume() {
  return currentVolume;
}

export function setAirportAudioVolume(value) {
  const parsed = Number(value);
  currentVolume = Number.isFinite(parsed) ? Math.max(0, Math.min(.8, parsed)) : currentVolume;
  if (masterGain && audioContext) {
    masterGain.gain.setTargetAtTime(currentVolume, audioContext.currentTime, .18);
  }
  return currentVolume;
}

function createNoise(context) {
  const length = context.sampleRate * 4;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const channel = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + .018 * white) / 1.018;
    channel[i] = last * 3.2;
  }
  return buffer;
}

export function startAirportAudio() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return false;
  try {
    if (!audioContext) {
      audioContext = new Audio();
      masterGain = audioContext.createGain();
      masterGain.gain.value = currentVolume;
      masterGain.connect(audioContext.destination);

      const noise = audioContext.createBufferSource();
      noise.buffer = createNoise(audioContext);
      noise.loop = true;
      const highPass = audioContext.createBiquadFilter();
      highPass.type = 'highpass';
      highPass.frequency.value = 85;
      const lowPass = audioContext.createBiquadFilter();
      lowPass.type = 'lowpass';
      lowPass.frequency.value = 470;
      const windGain = audioContext.createGain();
      windGain.gain.value = .25;
      noise.connect(highPass);
      highPass.connect(lowPass);
      lowPass.connect(windGain);
      windGain.connect(masterGain);
      noise.start();
      noiseSource = noise;

      const ventilation = audioContext.createOscillator();
      ventilation.type = 'sine';
      ventilation.frequency.value = 58;
      const ventilationGain = audioContext.createGain();
      ventilationGain.gain.value = .025;
      ventilation.connect(ventilationGain);
      ventilationGain.connect(masterGain);
      ventilation.start();

      const terminalHum = audioContext.createOscillator();
      terminalHum.type = 'triangle';
      terminalHum.frequency.value = 91.5;
      const terminalFilter = audioContext.createBiquadFilter();
      terminalFilter.type = 'lowpass';
      terminalFilter.frequency.value = 180;
      const terminalGain = audioContext.createGain();
      terminalGain.gain.value = .012;
      terminalHum.connect(terminalFilter);
      terminalFilter.connect(terminalGain);
      terminalGain.connect(masterGain);
      terminalHum.start();

      const modulation = audioContext.createOscillator();
      modulation.frequency.value = .075;
      const modulationGain = audioContext.createGain();
      modulationGain.gain.value = .009;
      modulation.connect(modulationGain);
      modulationGain.connect(windGain.gain);
      modulation.start();

      audioContext.addEventListener?.('statechange', () => {
        isRunning = audioContext?.state === 'running';
      });
    }
    setAirportAudioVolume(currentVolume);
    audioContext.resume();
    isRunning = true;
    return true;
  } catch (error) {
    console.warn('Airport ambience could not be started:', error);
    return false;
  }
}

export function stopAirportAudio() {
  if (!audioContext || !masterGain) {
    isRunning = false;
    return true;
  }
  masterGain.gain.setTargetAtTime(0, audioContext.currentTime, .12);
  audioContext.suspend();
  isRunning = false;
  return true;
}

export function isAirportAudioRunning() {
  return isRunning && audioContext?.state === 'running';
}
