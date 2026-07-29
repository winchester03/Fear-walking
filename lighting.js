export function createLighting(scene) {
  scene.environmentIntensity = 0.42;

  /*
   * Build 0.3.8 uses Babylon's native scene fog only.
   * The particle fog systems were removed because their sprite texture
   * produced the red-and-black checkerboard artifact on iPhone Safari.
   *
   * This density keeps the forest hazy without placing an opaque wall
   * directly in front of the camera.
   */
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0068;
  scene.fogColor = new BABYLON.Color3(0.095, 0.050, 0.026);

  const moon = new BABYLON.DirectionalLight(
    "moon",
    new BABYLON.Vector3(-0.35, -1, 0.22),
    scene
  );
  moon.position = new BABYLON.Vector3(30, 45, -35);
  moon.diffuse = new BABYLON.Color3(0.24, 0.31, 0.48);
  moon.specular = new BABYLON.Color3(0.018, 0.032, 0.065);
  moon.intensity = 0.68;

  const ambient = new BABYLON.HemisphericLight(
    "nightAmbient",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  ambient.diffuse = new BABYLON.Color3(0.24, 0.205, 0.18);
  ambient.groundColor = new BABYLON.Color3(0.22, 0.075, 0.025);
  ambient.intensity = 0.72;

  // Broad warm fill represents firelight scattered by smoke and the forest floor.
  // Unlike more point lights, this brightens bark and foliage evenly at low GPU cost.
  const fireSkyFill = new BABYLON.HemisphericLight(
    "fireSkyFill",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  fireSkyFill.diffuse = new BABYLON.Color3(1.0, 0.38, 0.10);
  fireSkyFill.groundColor = new BABYLON.Color3(0.34, 0.075, 0.018);
  fireSkyFill.specular = BABYLON.Color3.Black();
  fireSkyFill.intensity = 0.34;

  const clearingMoonlight = new BABYLON.PointLight(
    "clearingMoonlight",
    new BABYLON.Vector3(0, 16, 0),
    scene
  );
  clearingMoonlight.diffuse = new BABYLON.Color3(0.11, 0.17, 0.31);
  clearingMoonlight.specular = BABYLON.Color3.Black();
  clearingMoonlight.intensity = 0.42;
  clearingMoonlight.range = 28;

  // Filmic exposure and bloom preserve bright flame cores while lifting the
  // firelit bark. This produces a ray-traced-like contrast without tracing rays.
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType =
    BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.imageProcessingConfiguration.exposure = 1.38;
  scene.imageProcessingConfiguration.contrast = 0.86;

  const glow = new BABYLON.GlowLayer("fireGlow", scene, {
    mainTextureFixedSize: 512,
    blurKernelSize: 24
  });
  glow.intensity = 0.16;

  return {
    moon,
    ambient,
    fireSkyFill,
    clearingMoonlight,
    glow
  };
}
