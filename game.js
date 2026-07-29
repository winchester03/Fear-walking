export function createGame(canvas) {
  const engine = new BABYLON.Engine(canvas, false, {
    preserveDrawingBuffer: false,
    stencil: false,
    antialias: false,
    powerPreference: "high-performance",
    doNotHandleContextLost: false
  });

  // Mobile-first internal resolution. This cuts GPU cost substantially on iPhone.
  const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  engine.setHardwareScalingLevel(mobile ? 1.75 : 1.25);

  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.44, 0.68, 0.92, 1);
  scene.skipPointerMovePicking = true;
  scene.autoClear = true;
  scene.blockMaterialDirtyMechanism = false;

  return { engine, scene };
}
