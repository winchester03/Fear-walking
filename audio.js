// Audio routing for build 0.6.2.
// Menu loops and cutscene ambience use HTMLAudioElement. One-shot horror
// sounds use Web Audio buffers so distance filtering and echoes are reliable.

const clamp = value => Math.max(0, Math.min(1, value));

function makeAudio(src, { loop = false, volume = 1 } = {}) {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.loop = loop;
  audio.volume = clamp(volume);
  audio.playsInline = true;
  return audio;
}

const clips = {
  menu: makeAudio("./assets/audio/menu-theme.mp3", { loop: true, volume: 0 }),
  fire: makeAudio("./assets/audio/fire.mp3", { loop: true, volume: 0 }),
  helicopter: makeAudio("./assets/audio/helicopter.mp3", { loop: true, volume: 0 }),
  treeBreak: makeAudio("./assets/audio/tree-break.mp3", { volume: 0.48 })
};

let menuUnlocked = false;
let rescueActive = false;
let tinnitus = null;
let oneShotContext = null;
let oneShotBuffersPromise = null;
let monsterPlayed = false;
let womanPlayed = false;
const activeFades = new WeakMap();

function cancelFade(audio) {
  const frame = activeFades.get(audio);
  if (frame) cancelAnimationFrame(frame);
  activeFades.delete(audio);
}

function fadeAudio(audio, target, durationMs = 900, pauseAtEnd = false) {
  cancelFade(audio);
  target = clamp(target);
  const start = performance.now();
  const from = audio.volume;

  const step = now => {
    const raw = clamp((now - start) / Math.max(1, durationMs));
    const eased = raw * raw * (3 - 2 * raw);
    audio.volume = from + (target - from) * eased;
    if (raw < 1) {
      activeFades.set(audio, requestAnimationFrame(step));
      return;
    }
    activeFades.delete(audio);
    audio.volume = target;
    if (pauseAtEnd && target <= 0.001) {
      audio.pause();
      audio.currentTime = 0;
    }
  };
  activeFades.set(audio, requestAnimationFrame(step));
}

async function safePlay(audio, restart = false) {
  try {
    if (restart) audio.currentTime = 0;
    await audio.play();
    return true;
  } catch (error) {
    console.warn("Audio playback failed", audio.src, error);
    return false;
  }
}

function stopClip(audio) {
  cancelFade(audio);
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 0;
}

function stopGameplayClipsImmediately() {
  stopClip(clips.fire);
  stopClip(clips.helicopter);
  stopClip(clips.treeBreak);
}

function getAudioContext() {
  if (oneShotContext) return oneShotContext;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  oneShotContext = new AudioContext();
  return oneShotContext;
}

async function loadBuffer(context, url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}`);
  return context.decodeAudioData(await response.arrayBuffer());
}

function prepareOneShots() {
  const context = getAudioContext();
  if (!context) return Promise.resolve(null);
  context.resume().catch(() => {});
  if (!oneShotBuffersPromise) {
    oneShotBuffersPromise = Promise.all([
      loadBuffer(context, "./assets/audio/monster-screech.mp3"),
      loadBuffer(context, "./assets/audio/woman-scream.mp3")
    ]).then(([monster, woman]) => ({ monster, woman })).catch(error => {
      console.warn("Recorded one-shot preload failed", error);
      return null;
    });
  }
  return oneShotBuffersPromise;
}

function playDistantEcho(buffer, options = {}) {
  const context = getAudioContext();
  if (!context || !buffer) return false;
  context.resume().catch(() => {});

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = options.playbackRate ?? 0.92;

  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = options.cutoff ?? 1850;
  lowpass.Q.value = 0.6;

  // A narrow presence band keeps distant screams sharp enough to cut through
  // tinnitus without making them sound close or clean.
  const presence = context.createBiquadFilter();
  presence.type = "bandpass";
  presence.frequency.value = options.presenceFrequency ?? 2850;
  presence.Q.value = options.presenceQ ?? 1.25;
  const presenceGain = context.createGain();
  presenceGain.gain.value = options.presence ?? 0;

  const dry = context.createGain();
  dry.gain.value = options.dry ?? 0.34;
  const wet = context.createGain();
  wet.gain.value = options.wet ?? 0.46;
  const delay = context.createDelay(2.0);
  delay.delayTime.value = options.delay ?? 0.42;
  const feedback = context.createGain();
  feedback.gain.value = options.feedback ?? 0.42;
  const master = context.createGain();
  master.gain.value = options.volume ?? 0.72;
  const panner = context.createStereoPanner ? context.createStereoPanner() : null;
  if (panner) panner.pan.value = options.pan ?? 0;

  source.connect(lowpass);
  source.connect(presence);
  presence.connect(presenceGain);
  presenceGain.connect(master);
  lowpass.connect(dry);
  lowpass.connect(delay);
  delay.connect(wet);
  delay.connect(feedback);
  feedback.connect(delay);

  dry.connect(master);
  wet.connect(master);
  if (panner) {
    master.connect(panner).connect(context.destination);
  } else {
    master.connect(context.destination);
  }

  source.start();
  return true;
}

export async function startMenuMusic() {
  stopGameplayClipsImmediately();
  rescueActive = false;
  menuUnlocked = true;
  if (clips.menu.paused) {
    clips.menu.volume = 0;
    await safePlay(clips.menu);
  }
  fadeAudio(clips.menu, 0.62, 1200);
  return true;
}

export function stopMenuMusic(immediate = false) {
  if (immediate) stopClip(clips.menu);
  else fadeAudio(clips.menu, 0, 700, true);
}

function createTinnitus() {
  if (tinnitus) return tinnitus;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0;
  master.connect(context.destination);
  const left = context.createOscillator();
  const right = context.createOscillator();
  left.type = "sine";
  right.type = "sine";
  left.frequency.value = 6420;
  right.frequency.value = 6550;
  const merger = context.createChannelMerger(2);
  const leftGain = context.createGain();
  const rightGain = context.createGain();
  leftGain.gain.value = 0.46;
  rightGain.gain.value = 0.39;
  left.connect(leftGain).connect(merger, 0, 0);
  right.connect(rightGain).connect(merger, 0, 1);
  merger.connect(master);
  const wobble = context.createOscillator();
  const wobbleGain = context.createGain();
  wobble.frequency.value = 0.22;
  wobbleGain.gain.value = 34;
  wobble.connect(wobbleGain).connect(right.frequency);
  left.start();
  right.start();
  wobble.start();
  tinnitus = { context, master };
  return tinnitus;
}

function setTinnitus(level, seconds = 0.3) {
  const rig = createTinnitus();
  if (!rig) return;
  rig.context.resume().catch(() => {});
  rig.master.gain.setTargetAtTime(clamp(level) * 0.18, rig.context.currentTime, Math.max(0.01, seconds));
}

export async function beginRescueAudio() {
  rescueActive = true;
  monsterPlayed = false;
  womanPlayed = false;
  stopMenuMusic(true);
  stopGameplayClipsImmediately();

  // Start the loops immediately from the button gesture. Buffer loading happens
  // in parallel and never plays the screech during initialization.
  clips.fire.volume = 0;
  clips.helicopter.volume = 0;
  const oneShotsReady = prepareOneShots();
  await Promise.all([
    safePlay(clips.fire, true),
    safePlay(clips.helicopter, true)
  ]);
  oneShotsReady.catch(() => {});

  fadeAudio(clips.fire, 0.55, 650);
  fadeAudio(clips.helicopter, 0.06, 650);
  setTinnitus(1, 0.08);
}

export function updateRescueAudio(progress) {
  if (!rescueActive) return;
  const t = clamp(progress);
  clips.helicopter.volume = clamp(0.06 + Math.pow(t, 1.4) * 0.89);
  clips.fire.volume = clamp(0.55 - Math.pow(t, 0.92) * 0.47);
  setTinnitus(1 - t * 0.20, 0.12);
}

export function playTreeBreak() {
  if (!rescueActive) return Promise.resolve(false);
  clips.treeBreak.pause();
  clips.treeBreak.currentTime = 0;
  clips.treeBreak.volume = 0.48;
  clips.treeBreak.playbackRate = 0.82;
  return safePlay(clips.treeBreak);
}

export async function playMonsterScreech() {
  if (!rescueActive || monsterPlayed) return false;
  monsterPlayed = true;
  const buffers = await prepareOneShots();
  return playDistantEcho(buffers?.monster, {
    volume: 1.18,
    playbackRate: 0.94,
    cutoff: 2750,
    dry: 0.46,
    wet: 0.48,
    delay: 0.48,
    feedback: 0.42,
    presence: 0.38,
    presenceFrequency: 3150,
    presenceQ: 1.1,
    pan: -0.28
  });
}

export async function beginFinalBlackoutAudio() {
  if (!rescueActive) return;
  fadeAudio(clips.helicopter, 0, 1800, true);
  fadeAudio(clips.fire, 0.02, 1500, true);
  setTinnitus(0.97, 0.15);
}

export async function playWomanScream() {
  if (!rescueActive || womanPlayed) return false;
  womanPlayed = true;
  const buffers = await prepareOneShots();
  return playDistantEcho(buffers?.woman, {
    volume: 0.60,
    playbackRate: 0.94,
    cutoff: 2050,
    dry: 0.48,
    wet: 0.22,
    delay: 0.34,
    feedback: 0.18,
    pan: 0.22
  });
}

export function endRescueAudio() {
  rescueActive = false;
  fadeAudio(clips.helicopter, 0, 500, true);
  fadeAudio(clips.fire, 0, 500, true);
  setTinnitus(0, 0.5);
}

export async function beginFreeRoamAudio() {
  rescueActive = false;
  stopMenuMusic(true);
  stopGameplayClipsImmediately();
  clips.fire.volume = 0.38;
  await safePlay(clips.fire, true);
  setTinnitus(0, 0.15);
}

export function isMenuAudioReady() {
  return menuUnlocked;
}
