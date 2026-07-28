export function createGame(canvas) {
  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: false,
    antialias: true,
    powerPreference: "high-performance",
    doNotHandleContextLost: false
  });

  // Keep a fixed full-quality render scale. Performance gains in 0.6.1 come
  // from scene and effect optimization rather than reducing image resolution.
  const fixedScale = 1.12;
  engine.setHardwareScalingLevel(fixedScale);

  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.016, 0.022, 0.034, 1);
  scene.skipPointerMovePicking = true;
  scene.autoClear = true;
  scene.blockMaterialDirtyMechanism = true;
  scene.performancePriority = BABYLON.ScenePerformancePriority.Aggressive;
  scene.skipFrustumClipping = false;
  return { engine, scene };
}
