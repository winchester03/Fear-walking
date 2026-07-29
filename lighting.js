function mixColor(a, b, t) {
  return BABYLON.Color3.Lerp(a, b, BABYLON.Scalar.Clamp(t, 0, 1));
}

export function createLighting(scene, camera) {
  const DAY_SECONDS = 300;
  let time = 0.22;

  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0065;
  scene.imageProcessingConfiguration.exposure = 1.12;
  scene.imageProcessingConfiguration.contrast = 1.08;

  const ambient = new BABYLON.HemisphericLight("skyAmbient", BABYLON.Vector3.Up(), scene);
  ambient.groundColor = new BABYLON.Color3(0.12, 0.10, 0.075);

  const sunLight = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(-0.4, -1, 0.2), scene);
  sunLight.diffuse = new BABYLON.Color3(1.0, 0.94, 0.78);
  sunLight.specular = new BABYLON.Color3(0.15, 0.12, 0.08);

  const moonLight = new BABYLON.DirectionalLight("moonLight", new BABYLON.Vector3(0.3, -1, -0.2), scene);
  moonLight.diffuse = new BABYLON.Color3(0.28, 0.38, 0.58);
  moonLight.specular = BABYLON.Color3.Black();

  // Mobile-safe shadowing. Only a few nearby high-detail trees are added as casters.
  const shadowGenerator = new BABYLON.ShadowGenerator(512, sunLight);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurKernel = 8;
  shadowGenerator.bias = 0.002;
  shadowGenerator.normalBias = 0.03;

  const sunMat = new BABYLON.StandardMaterial("sunMaterial", scene);
  sunMat.disableLighting = true;
  sunMat.emissiveColor = new BABYLON.Color3(1, 0.72, 0.32);
  const sun = BABYLON.MeshBuilder.CreateSphere("sun", { diameter: 2.2, segments: 10 }, scene);
  sun.material = sunMat;
  sun.isPickable = false;
  sun.infiniteDistance = true;

  const moonMat = new BABYLON.StandardMaterial("moonMaterial", scene);
  moonMat.disableLighting = true;
  moonMat.emissiveColor = new BABYLON.Color3(0.62, 0.72, 0.92);
  const moon = BABYLON.MeshBuilder.CreateSphere("moon", { diameter: 1.8, segments: 10 }, scene);
  moon.material = moonMat;
  moon.isPickable = false;
  moon.infiniteDistance = true;

  const sky = BABYLON.MeshBuilder.CreateSphere("dynamicSky", {
    diameter: 700,
    segments: 12,
    sideOrientation: BABYLON.Mesh.BACKSIDE
  }, scene);
  sky.infiniteDistance = true;
  sky.isPickable = false;
  const skyMat = new BABYLON.StandardMaterial("dynamicSkyMaterial", scene);
  skyMat.disableLighting = true;
  skyMat.backFaceCulling = false;
  skyMat.emissiveColor = new BABYLON.Color3(0.45, 0.72, 0.98);
  sky.material = skyMat;

  const night = new BABYLON.Color3(0.008, 0.014, 0.032);
  const dawnBlue = new BABYLON.Color3(0.20, 0.42, 0.72);
  const sunriseYellow = new BABYLON.Color3(0.98, 0.70, 0.30);
  const sunsetOrange = new BABYLON.Color3(0.95, 0.34, 0.10);
  const dayBlue = new BABYLON.Color3(0.48, 0.76, 1.0);

  function addShadowCasters() {
    let added = 0;
    for (const mesh of scene.meshes) {
      if (added >= 8) break;
      if (!mesh?.name?.toLowerCase().includes("herotree")) continue;
      if (mesh.getTotalVertices?.() > 0) {
        shadowGenerator.addShadowCaster(mesh, true);
        added++;
      }
    }
  }

  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    time = (time + dt / DAY_SECONDS) % 1;

    const angle = time * Math.PI * 2 - Math.PI / 2;
    const sunHeight = Math.sin(angle);
    const moonHeight = -sunHeight;
    const radius = 120;

    sun.position.set(Math.cos(angle) * radius, sunHeight * 82, Math.sin(angle) * radius);
    moon.position.set(-sun.position.x, moonHeight * 82, -sun.position.z);
    sunLight.direction.copyFrom(sun.position.scale(-1).normalize());
    moonLight.direction.copyFrom(moon.position.scale(-1).normalize());

    const daylight = BABYLON.Scalar.Clamp((sunHeight + 0.12) / 0.42, 0, 1);
    const horizon = 1 - BABYLON.Scalar.Clamp(Math.abs(sunHeight) / 0.34, 0, 1);
    const rising = Math.cos(angle) > 0;

    let skyColor;
    if (daylight > 0.72) {
      skyColor = mixColor(dawnBlue, dayBlue, (daylight - 0.72) / 0.28);
    } else if (sunHeight > -0.14) {
      skyColor = mixColor(rising ? sunriseYellow : sunsetOrange, dawnBlue, daylight);
    } else {
      skyColor = mixColor(night, dawnBlue, BABYLON.Scalar.Clamp((sunHeight + 0.36) / 0.22, 0, 1));
    }

    skyMat.emissiveColor.copyFrom(skyColor);
    scene.clearColor.set(skyColor.r, skyColor.g, skyColor.b, 1);
    scene.fogColor.copyFrom(mixColor(new BABYLON.Color3(0.015, 0.022, 0.04), skyColor.scale(0.72), daylight));

    sun.setEnabled(sunHeight > -0.08);
    moon.setEnabled(moonHeight > -0.05);
    sunLight.intensity = daylight * (1.35 + horizon * 0.25);
    moonLight.intensity = (1 - daylight) * 0.28;
    ambient.intensity = 0.38 + daylight * 0.78;
    ambient.diffuse.copyFrom(mixColor(new BABYLON.Color3(0.24, 0.30, 0.42), new BABYLON.Color3(0.90, 0.92, 0.86), daylight));
  });

  return { sunLight, moonLight, ambient, sun, moon, shadowGenerator, addShadowCasters };
}
