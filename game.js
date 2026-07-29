export function createGame(canvas) {
  const engine = new BABYLON.Engine(canvas, false, {
    preserveDrawingBuffer: false,
    stencil: false,
    antialias: false,
    powerPreference: "high-performance",
    doNotHandleContextLost: false
  });

  // Higher internal resolution for a cleaner image while retaining mobile performance.
  engine.setHardwareScalingLevel(1.25);

  // Conservative dynamic resolution: retain the sharper image when the phone
  // has headroom, but recover performance before heat or frame drops compound.
  let resolutionTimer = 0;
  let currentScale = 1.25;
  engine.onBeginFrameObservable.add(() => {
    resolutionTimer += engine.getDeltaTime();
    if (resolutionTimer < 3000) return;
    resolutionTimer = 0;

    const fps = engine.getFps();
    let nextScale = currentScale;
    if (fps < 40 && currentScale < 1.5) nextScale = Math.min(1.5, currentScale + 0.1);
    else if (fps > 56 && currentScale > 1.2) nextScale = Math.max(1.2, currentScale - 0.05);

    if (Math.abs(nextScale - currentScale) >= 0.01) {
      currentScale = nextScale;
      engine.setHardwareScalingLevel(currentScale);
      engine.resize();
    }
  });

  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.012, 0.018, 0.028, 1);
  scene.skipPointerMovePicking = true;
  scene.autoClear = true;
  scene.blockMaterialDirtyMechanism = false;

  return { engine, scene };
}
