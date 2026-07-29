function mixColor(a, b, t) {
  return BABYLON.Color3.Lerp(a, b, BABYLON.Scalar.Clamp(t, 0, 1));
}

export function createLighting(scene, camera) {
  const DAY_SECONDS = 300;
  let time = 0.24; // begin in daylight, then sunset and night

  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.008;

  const ambient = new BABYLON.HemisphericLight("skyAmbient", BABYLON.Vector3.Up(), scene);
  ambient.groundColor = new BABYLON.Color3(0.025, 0.022, 0.018);

  const sunLight = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(-0.4, -1, 0.2), scene);
  sunLight.position = new BABYLON.Vector3(40, 70, -30);
  sunLight.diffuse = new BABYLON.Color3(1, 0.91, 0.72);
  sunLight.autoCalcShadowZBounds = true;

  const moonLight = new BABYLON.DirectionalLight("moonLight", new BABYLON.Vector3(0.3, -1, -0.2), scene);
  moonLight.diffuse = new BABYLON.Color3(0.32, 0.43, 0.65);

  const shadowGenerator = new BABYLON.CascadedShadowGenerator(1024, sunLight);
  shadowGenerator.bias = 0.0008;
  shadowGenerator.normalBias = 0.02;
  shadowGenerator.lambda = 0.72;
  shadowGenerator.stabilizeCascades = true;
  shadowGenerator.shadowMaxZ = 90;
  shadowGenerator.usePercentageCloserFiltering = true;
  shadowGenerator.filteringQuality = BABYLON.ShadowGenerator.QUALITY_MEDIUM;

  const sunMat = new BABYLON.StandardMaterial("sunMaterial", scene);
  sunMat.disableLighting = true;
  sunMat.emissiveColor = new BABYLON.Color3(1, 0.76, 0.38);
  const sun = BABYLON.MeshBuilder.CreateSphere("sun", { diameter: 3.2, segments: 16 }, scene);
  sun.material = sunMat;
  sun.isPickable = false;
  sun.infiniteDistance = true;

  const moonMat = new BABYLON.StandardMaterial("moonMaterial", scene);
  moonMat.disableLighting = true;
  moonMat.emissiveColor = new BABYLON.Color3(0.65, 0.74, 0.95);
  const moon = BABYLON.MeshBuilder.CreateSphere("moon", { diameter: 2.3, segments: 16 }, scene);
  moon.material = moonMat;
  moon.isPickable = false;
  moon.infiniteDistance = true;

  let godrays = null;
  try {
    godrays = new BABYLON.VolumetricLightScatteringPostProcess(
      "sunShafts", 0.5, camera, sun, 70, BABYLON.Texture.BILINEAR_SAMPLINGMODE, scene.getEngine(), false
    );
    godrays.exposure = 0.18;
    godrays.decay = 0.968;
    godrays.weight = 0.55;
    godrays.density = 0.82;
  } catch (error) {
    console.warn("Volumetric sunlight unavailable", error);
  }

  const sky = BABYLON.MeshBuilder.CreateSphere("dynamicSky", { diameter: 900, segments: 20, sideOrientation: BABYLON.Mesh.BACKSIDE }, scene);
  sky.infiniteDistance = true;
  sky.isPickable = false;
  const skyMat = new BABYLON.StandardMaterial("dynamicSkyMaterial", scene);
  skyMat.disableLighting = true;
  skyMat.backFaceCulling = false;
  skyMat.emissiveColor = new BABYLON.Color3(0.45, 0.72, 0.98);
  sky.material = skyMat;

  const night = new BABYLON.Color3(0.004, 0.008, 0.02);
  const dawnBlue = new BABYLON.Color3(0.18, 0.38, 0.67);
  const sunriseYellow = new BABYLON.Color3(0.95, 0.68, 0.28);
  const sunsetOrange = new BABYLON.Color3(0.92, 0.28, 0.08);
  const dayBlue = new BABYLON.Color3(0.42, 0.72, 0.98);

  function addShadowCasters() {
    for (const mesh of scene.meshes) {
      if (mesh === sky || mesh === sun || mesh === moon || mesh.name === "forestGround") continue;
      if (mesh.getTotalVertices?.() > 0) {
        shadowGenerator.addShadowCaster(mesh, true);
        mesh.receiveShadows = true;
      }
    }
  }

  let refresh = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    time = (time + dt / DAY_SECONDS) % 1;

    const angle = time * Math.PI * 2 - Math.PI / 2;
    const sunHeight = Math.sin(angle);
    const moonHeight = -sunHeight;
    const radius = 140;

    sun.position.set(Math.cos(angle) * radius, sunHeight * 95, Math.sin(angle) * radius);
    moon.position.set(-sun.position.x, moonHeight * 95, -sun.position.z);
    sunLight.direction = sun.position.scale(-1).normalize();
    moonLight.direction = moon.position.scale(-1).normalize();

    const daylight = BABYLON.Scalar.Clamp((sunHeight + 0.1) / 0.38, 0, 1);
    const horizon = 1 - BABYLON.Scalar.Clamp(Math.abs(sunHeight) / 0.38, 0, 1);
    const rising = Math.cos(angle) > 0;

    let skyColor;
    if (daylight > 0.7) {
      skyColor = mixColor(dawnBlue, dayBlue, (daylight - 0.7) / 0.3);
    } else if (sunHeight > -0.12) {
      const warm = rising ? sunriseYellow : sunsetOrange;
      skyColor = mixColor(warm, dawnBlue, daylight);
    } else {
      skyColor = mixColor(night, dawnBlue, BABYLON.Scalar.Clamp((sunHeight + 0.35) / 0.23, 0, 1));
    }

    skyMat.emissiveColor = skyColor;
    scene.clearColor = new BABYLON.Color4(skyColor.r, skyColor.g, skyColor.b, 1);
    scene.fogColor = mixColor(new BABYLON.Color3(0.012, 0.018, 0.03), skyColor.scale(0.7), daylight);

    sun.setEnabled(sunHeight > -0.1);
    moon.setEnabled(moonHeight > -0.08);
    sunLight.intensity = daylight * (1.25 + horizon * 0.35);
    moonLight.intensity = (1 - daylight) * 0.34;
    ambient.intensity = 0.16 + daylight * 0.72;
    ambient.diffuse = mixColor(new BABYLON.Color3(0.12, 0.18, 0.3), new BABYLON.Color3(0.72, 0.78, 0.72), daylight);
    if (godrays) godrays.exposure = daylight * (0.08 + horizon * 0.28);

    refresh += dt;
    if (refresh > 2) {
      refresh = 0;
      addShadowCasters();
    }
  });

  return { sunLight, moonLight, ambient, sun, moon, shadowGenerator, addShadowCasters };
}
