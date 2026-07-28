import {
  updateRescueAudio,
  playTreeBreak,
  playMonsterScreech,
  beginFinalBlackoutAudio,
  playWomanScream,
  endRescueAudio
} from "./audio.js";

// Rescue cinematic with constant-rate ascent and a temporary concussion effect.

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function tween(scene, durationMs, update, smooth = true) {
  return new Promise(resolve => {
    let elapsed = 0;
    const observer = scene.onBeforeRenderObservable.add(() => {
      elapsed += scene.getEngine().getDeltaTime();
      const raw = BABYLON.Scalar.Clamp(elapsed / durationMs, 0, 1);
      const t = smooth ? raw * raw * (3 - 2 * raw) : raw;
      update(t, raw);
      if (raw >= 1) {
        scene.onBeforeRenderObservable.remove(observer);
        resolve();
      }
    });
  });
}

function makeFadeLayer() {
  let overlay = document.getElementById("cinematicFade");
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.id = "cinematicFade";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    background: "#000",
    opacity: "1",
    zIndex: "1000",
    pointerEvents: "none"
  });
  document.body.appendChild(overlay);
  return overlay;
}

async function fade(scene, overlay, from, to, durationMs) {
  overlay.style.opacity = String(from);
  await tween(scene, durationMs, t => {
    overlay.style.opacity = String(BABYLON.Scalar.Lerp(from, to, t));
  });
}

function setControls(camera, enabled) {
  camera.metadata = camera.metadata || {};
  camera.metadata.controlsEnabled = enabled;
  document.querySelectorAll("[data-player-control='true']").forEach(button => {
    button.style.display = enabled ? "" : "none";
  });
}

function createConcussionPostProcess(camera) {
  BABYLON.Effect.ShadersStore.concussionFragmentShader = `
    precision highp float;
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform float amount;
    uniform float time;
    void main(void) {
      vec2 pulse = vec2(
        sin(time * 1.7) * 0.0045,
        cos(time * 1.13) * 0.0025
      ) * amount;
      vec4 center = texture2D(textureSampler, vUV);
      vec4 leftEye = texture2D(textureSampler, vUV + pulse);
      vec4 rightEye = texture2D(textureSampler, vUV - pulse * 0.72);
      vec4 blurA = texture2D(textureSampler, vUV + vec2(0.0018, 0.0) * amount);
      vec4 blurB = texture2D(textureSampler, vUV - vec2(0.0018, 0.0) * amount);
      vec4 mixed = center * 0.50 + leftEye * 0.19 + rightEye * 0.19 + blurA * 0.06 + blurB * 0.06;
      mixed.rgb += vec3(leftEye.r - rightEye.r, 0.0, rightEye.b - leftEye.b) * 0.10 * amount;
      gl_FragColor = mixed;
    }
  `;

  const post = new BABYLON.PostProcess(
    "concussionVision",
    "concussion",
    ["amount", "time"],
    null,
    1,
    camera
  );
  post.metadata = { amount: 0.92, time: 0 };
  post.onApply = effect => {
    effect.setFloat("amount", post.metadata.amount);
    effect.setFloat("time", post.metadata.time);
  };
  return post;
}

export async function playRescueCutscene(scene, camera, helicopter) {
  const overlay = makeFadeLayer();
  const concussion = createConcussionPostProcess(camera);
  setControls(camera, false);

  const originalFov = camera.fov;
  camera.fov = 0.92;
  camera.position.set(0, 1.15, -5.5);
  camera.rotation.set(0.10, 0.18, Math.PI * 0.47);

  const timeObserver = scene.onBeforeRenderObservable.add(() => {
    concussion.metadata.time += scene.getEngine().getDeltaTime() * 0.001;
  });

  // Opening: eyes fade in while lying sideways.
  await wait(350);
  await fade(scene, overlay, 1, 0, 1250);
  await wait(3200);

  // Tree break happens immediately before the first eye close.
  await playTreeBreak();
  await wait(900);
  await fade(scene, overlay, 0, 1, 1350); // first eye close
  await wait(650);

  // Second view: look upward while the constant-rate hoist begins.
  camera.rotation.set(0.25, 0.18, Math.PI * 0.35);
  await fade(scene, overlay, 1, 0, 1150);

  const ascentStartY = camera.position.y;
  const ascentEndY = 25.5;
  const ascentDuration = 17200;
  const ascentRampDuration = 2600;
  let ascentElapsed = 0;
  let ascentFinished = false;

  const ascentObserver = scene.onBeforeRenderObservable.add(() => {
    ascentElapsed += scene.getEngine().getDeltaTime();
    const raw = BABYLON.Scalar.Clamp(ascentElapsed / ascentDuration, 0, 1);

    // Ease into the hoist instead of snapping immediately to full speed.
    // After the short ramp, movement continues at an almost constant rate.
    const rampFraction = ascentRampDuration / ascentDuration;
    let t;
    if (raw < rampFraction) {
      const r = raw / rampFraction;
      const easedRamp = r * r * (3 - 2 * r);
      t = easedRamp * rampFraction * 0.5;
    } else {
      t = rampFraction * 0.5 + (raw - rampFraction);
    }
    const normalizedT = BABYLON.Scalar.Clamp(t / (1 - rampFraction * 0.5), 0, 1);

    camera.position.y = BABYLON.Scalar.Lerp(ascentStartY, ascentEndY, normalizedT);
    camera.position.z = BABYLON.Scalar.Lerp(-5.5, 0, normalizedT);
    updateRescueAudio(normalizedT);

    if (raw >= 1) {
      ascentFinished = true;
      scene.onBeforeRenderObservable.remove(ascentObserver);
    }
  });

  await tween(scene, 5200, t => {
    camera.rotation.x = BABYLON.Scalar.Lerp(0.25, -1.18, t);
    camera.rotation.y = BABYLON.Scalar.Lerp(0.18, 0.0, t);
    camera.rotation.z = BABYLON.Scalar.Lerp(Math.PI * 0.35, 0.0, t);
    concussion.metadata.amount = BABYLON.Scalar.Lerp(0.92, 0.58, t);
  });
  await wait(850);
  await fade(scene, overlay, 0, 1, 1100); // second eye close

  // Monster screech is heard only after the second eye close.
  await wait(260);
  await playMonsterScreech();
  await wait(850);

  // Third and final visible view: look down over the burning woods while still
  // being hoisted. The camera remains first-person throughout.
  camera.rotation.set(-0.25, Math.PI, 0);
  await fade(scene, overlay, 1, 0, 1150);
  await tween(scene, 4700, t => {
    camera.rotation.x = BABYLON.Scalar.Lerp(-0.25, 0.82, t);
    camera.rotation.y = BABYLON.Scalar.Lerp(Math.PI, Math.PI * 1.12, t);
    concussion.metadata.amount = BABYLON.Scalar.Lerp(0.58, 0.26, t);
  });

  // Final eye close occurs before the ascent reaches the visible forest bounds.
  await fade(scene, overlay, 0, 1, 1100);
  await beginFinalBlackoutAudio();
  await wait(850);

  // Woman's scream plays only after the final eye close.
  await playWomanScream();
  await wait(1450);

  while (!ascentFinished) await wait(50);

  scene.onBeforeRenderObservable.remove(timeObserver);
  concussion.dispose(camera);
  camera.fov = originalFov;
  if (helicopter?.searchLight) helicopter.searchLight.intensity = 0;
  endRescueAudio();
}
export function enableFreeRoam(camera, position = new BABYLON.Vector3(0, 2, -7.8)) {
  const overlay = makeFadeLayer();
  overlay.style.opacity = "0";
  camera.position.copyFrom(position);
  camera.rotation.set(0, 0, 0);
  setControls(camera, true);
}
