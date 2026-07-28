export function createLighting(scene) {
  scene.environmentIntensity = 0.62;
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0028;
  scene.fogColor = new BABYLON.Color3(0.024, 0.032, 0.050);

  const moon = new BABYLON.DirectionalLight("moon", new BABYLON.Vector3(-0.35, -1, 0.22), scene);
  moon.position = new BABYLON.Vector3(30, 45, -35);
  moon.diffuse = new BABYLON.Color3(0.34, 0.43, 0.66);
  moon.specular = new BABYLON.Color3(0.025, 0.042, 0.080);
  moon.intensity = 1.34;

  const ambient = new BABYLON.HemisphericLight("nightAmbient", new BABYLON.Vector3(0, 1, 0), scene);
  ambient.diffuse = new BABYLON.Color3(0.25, 0.29, 0.39);
  ambient.groundColor = new BABYLON.Color3(0.075, 0.060, 0.052);
  ambient.intensity = 1.22;

  const fireSkyFill = new BABYLON.HemisphericLight("fireSkyFill", new BABYLON.Vector3(0, 1, 0), scene);
  fireSkyFill.diffuse = new BABYLON.Color3(1.0, 0.58, 0.22);
  fireSkyFill.groundColor = new BABYLON.Color3(0.20, 0.060, 0.020);
  fireSkyFill.specular = BABYLON.Color3.Black();
  fireSkyFill.intensity = 0.25;

  const clearingMoonlight = new BABYLON.PointLight("clearingMoonlight", new BABYLON.Vector3(0, 16, 0), scene);
  clearingMoonlight.diffuse = new BABYLON.Color3(0.15, 0.22, 0.39);
  clearingMoonlight.specular = BABYLON.Color3.Black();
  clearingMoonlight.intensity = 0.98;
  clearingMoonlight.range = 34;

  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.imageProcessingConfiguration.exposure = 1.62;
  scene.imageProcessingConfiguration.contrast = 0.88;

  const glow = new BABYLON.GlowLayer("fireGlow", scene, { mainTextureFixedSize: 160, blurKernelSize: 14 });
  glow.intensity = 0.09;
  return { moon, ambient, fireSkyFill, clearingMoonlight, glow };
}
