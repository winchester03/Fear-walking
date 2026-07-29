export function createLighting(scene) {
  scene.environmentIntensity = 0.075;
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.018;
  scene.fogColor = new BABYLON.Color3(0.035, 0.06, 0.095);

  const moon = new BABYLON.DirectionalLight(
    "moon",
    new BABYLON.Vector3(-0.35, -1, 0.22),
    scene
  );
  moon.position = new BABYLON.Vector3(30, 45, -35);
  moon.diffuse = new BABYLON.Color3(0.19, 0.29, 0.50);
  moon.specular = new BABYLON.Color3(0.025, 0.045, 0.09);
  moon.intensity = 0.6;

  const ambient = new BABYLON.HemisphericLight(
    "nightAmbient",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  ambient.diffuse = new BABYLON.Color3(0.07, 0.105, 0.17);
  ambient.groundColor = new BABYLON.Color3(0.003, 0.006, 0.01);
  ambient.intensity = 0.17;

  const clearingMoonlight = new BABYLON.PointLight(
    "clearingMoonlight",
    new BABYLON.Vector3(0, 16, 0),
    scene
  );
  clearingMoonlight.diffuse = new BABYLON.Color3(0.14, 0.22, 0.39);
  clearingMoonlight.specular = BABYLON.Color3.Black();
  clearingMoonlight.intensity = 0.32;
  clearingMoonlight.range = 20;

  // Low-cost drifting ground mist. The scene fog handles distance haze;
  // these particles create visible layers close to the clearing.
  const mist = new BABYLON.ParticleSystem("groundMist", 28, scene);
  mist.particleTexture = new BABYLON.Texture(
    "./assets/textures/mist.png",
    scene,
    true,
    false
  );
  mist.emitter = new BABYLON.Vector3(0, 0.6, 0);
  mist.minEmitBox = new BABYLON.Vector3(-32, 0, -32);
  mist.maxEmitBox = new BABYLON.Vector3(32, 1.2, 32);
  mist.color1 = new BABYLON.Color4(0.30, 0.42, 0.58, 0.05);
  mist.color2 = new BABYLON.Color4(0.20, 0.32, 0.48, 0.09);
  mist.colorDead = new BABYLON.Color4(0.14, 0.22, 0.34, 0);
  mist.minSize = 10;
  mist.maxSize = 23;
  mist.minLifeTime = 8;
  mist.maxLifeTime = 15;
  mist.emitRate = 3.2;
  mist.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
  mist.gravity = BABYLON.Vector3.Zero();
  mist.direction1 = new BABYLON.Vector3(-0.18, 0.015, -0.08);
  mist.direction2 = new BABYLON.Vector3(0.22, 0.03, 0.12);
  mist.minAngularSpeed = -0.06;
  mist.maxAngularSpeed = 0.06;
  mist.minEmitPower = 0.05;
  mist.maxEmitPower = 0.15;
  mist.updateSpeed = 0.008;
  mist.start();

  return { moon, ambient, clearingMoonlight, mist };
}
