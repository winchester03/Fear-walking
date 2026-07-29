export function createGame(canvas) {
  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: false,
    antialias: true,
    powerPreference: "high-performance",
    doNotHandleContextLost: false
  });

  // Higher internal resolution for a cleaner image while retaining mobile performance.
  engine.setHardwareScalingLevel(1.15);

  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.012, 0.018, 0.028, 1);
  scene.skipPointerMovePicking = true;
  scene.autoClear = true;
  scene.blockMaterialDirtyMechanism = false;

  return { engine, scene };
}
