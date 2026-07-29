export function createLighting(scene) {
  scene.environmentIntensity = 0.1;
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.022;
  scene.fogColor = new BABYLON.Color3(0.035, 0.058, 0.095);

  const moon = new BABYLON.DirectionalLight(
    "moon",
    new BABYLON.Vector3(-0.35, -1, 0.22),
    scene
  );
  moon.position = new BABYLON.Vector3(30, 45, -35);
  moon.diffuse = new BABYLON.Color3(0.22, 0.34, 0.58);
  moon.specular = new BABYLON.Color3(0.035, 0.06, 0.12);
  moon.intensity = 0.72;

  const ambient = new BABYLON.HemisphericLight(
    "nightAmbient",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  ambient.diffuse = new BABYLON.Color3(0.085, 0.13, 0.22);
  ambient.groundColor = new BABYLON.Color3(0.004, 0.007, 0.012);
  ambient.intensity = 0.22;

  const clearingMoonlight = new BABYLON.PointLight(
    "clearingMoonlight",
    new BABYLON.Vector3(0, 16, 0),
    scene
  );
  clearingMoonlight.diffuse = new BABYLON.Color3(0.16, 0.25, 0.44);
  clearingMoonlight.specular = BABYLON.Color3.Black();
  clearingMoonlight.intensity = 0.38;
  clearingMoonlight.range = 20;

  return { moon, ambient, clearingMoonlight };
}
