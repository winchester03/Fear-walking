function mixColor(a, b, t) {
  return BABYLON.Color3.Lerp(a, b, BABYLON.Scalar.Clamp(t, 0, 1));
}

export function createLighting(scene) {
  const DAY_SECONDS = 300;
  let time = 0.22;

  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0045;
  scene.imageProcessingConfiguration.exposure = 1.18;
  scene.imageProcessingConfiguration.contrast = 1.04;

  const ambient = new BABYLON.HemisphericLight("skyAmbient", BABYLON.Vector3.Up(), scene);
  ambient.groundColor = new BABYLON.Color3(0.16, 0.13, 0.09);

  const sunLight = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(-0.4, -1, 0.2), scene);
  sunLight.diffuse = new BABYLON.Color3(1.0, 0.94, 0.80);
  sunLight.specular = BABYLON.Color3.Black();

  const moonLight = new BABYLON.DirectionalLight("moonLight", new BABYLON.Vector3(0.3, -1, -0.2), scene);
  moonLight.diffuse = new BABYLON.Color3(0.30, 0.40, 0.62);
  moonLight.specular = BABYLON.Color3.Black();

  const sunMat = new BABYLON.StandardMaterial("sunMaterial", scene);
  sunMat.disableLighting = true;
  sunMat.emissiveColor = new BABYLON.Color3(1, 0.78, 0.42);
  const sun = BABYLON.MeshBuilder.CreateSphere("sun", { diameter: 1.55, segments: 8 }, scene);
  sun.material = sunMat;
  sun.isPickable = false;
  sun.infiniteDistance = true;

  const moonMat = new BABYLON.StandardMaterial("moonMaterial", scene);
  moonMat.disableLighting = true;
  moonMat.emissiveColor = new BABYLON.Color3(0.68, 0.76, 0.94);
  const moon = BABYLON.MeshBuilder.CreateSphere("moon", { diameter: 1.35, segments: 8 }, scene);
  moon.material = moonMat;
  moon.isPickable = false;
  moon.infiniteDistance = true;

  const night = new BABYLON.Color3(0.008, 0.014, 0.035);
  const dawnBlue = new BABYLON.Color3(0.22, 0.46, 0.76);
  const horizonYellow = new BABYLON.Color3(1.0, 0.68, 0.26);
  const sunsetOrange = new BABYLON.Color3(0.95, 0.30, 0.08);
  const dayBlue = new BABYLON.Color3(0.50, 0.76, 1.0);

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
    time = (time + dt / DAY_SECONDS) % 1;
    const angle = time * Math.PI * 2 - Math.PI / 2;
    const sunHeight = Math.sin(angle);
    const radius = 115;

    sun.position.set(Math.cos(angle) * radius, sunHeight * 78, Math.sin(angle) * radius);
    moon.position.set(-sun.position.x, -sun.position.y, -sun.position.z);
    sunLight.direction.copyFrom(sun.position.scale(-1).normalize());
    moonLight.direction.copyFrom(moon.position.scale(-1).normalize());

    const daylight = BABYLON.Scalar.Clamp((sunHeight + 0.13) / 0.40, 0, 1);
    const horizon = 1 - BABYLON.Scalar.Clamp(Math.abs(sunHeight) / 0.30, 0, 1);
    const rising = Math.cos(angle) > 0;

    let skyColor;
    if (daylight > 0.68) {
      skyColor = mixColor(dawnBlue, dayBlue, (daylight - 0.68) / 0.32);
    } else if (sunHeight > -0.16) {
      skyColor = mixColor(rising ? horizonYellow : sunsetOrange, dawnBlue, daylight);
    } else {
      skyColor = mixColor(night, dawnBlue, BABYLON.Scalar.Clamp((sunHeight + 0.38) / 0.22, 0, 1));
    }

    scene.clearColor.set(skyColor.r, skyColor.g, skyColor.b, 1);
    scene.fogColor.copyFrom(mixColor(new BABYLON.Color3(0.012, 0.018, 0.038), skyColor.scale(0.72), daylight));
    sun.setEnabled(sunHeight > -0.08);
    moon.setEnabled(sunHeight < 0.08);
    sunLight.intensity = daylight * (1.20 + horizon * 0.20);
    moonLight.intensity = (1 - daylight) * 0.34;
    ambient.intensity = 0.46 + daylight * 0.74;
    ambient.diffuse.copyFrom(mixColor(
      new BABYLON.Color3(0.28, 0.34, 0.50),
      new BABYLON.Color3(0.94, 0.92, 0.82),
      daylight
    ));
  });

  return { sunLight, moonLight, ambient, sun, moon };
}
