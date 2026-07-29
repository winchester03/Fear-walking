function blendColor(a, b, amount) {
  return BABYLON.Color3.Lerp(a, b, BABYLON.Scalar.Clamp(amount, 0, 1));
}

export function createLighting(scene) {
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0065;

  const sun = new BABYLON.DirectionalLight("sunMoon", new BABYLON.Vector3(-0.6, -0.55, 0.2), scene);
  sun.position = new BABYLON.Vector3(35, 50, -30);
  sun.specular = BABYLON.Color3.Black();

  const ambient = new BABYLON.HemisphericLight("skyAmbient", new BABYLON.Vector3(0, 1, 0), scene);
  ambient.specular = BABYLON.Color3.Black();

  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.imageProcessingConfiguration.contrast = 1.02;

  const cycle = {
    durationSeconds: 300,
    elapsedSeconds: 0,
    // Start at approximately 18:00: sunset.
    timeOfDay: 18,
    nightAmount: 0,
    phase: "Sunset"
  };

  const sunsetSky = new BABYLON.Color3(0.37, 0.17, 0.10);
  const nightSky = new BABYLON.Color3(0.008, 0.014, 0.033);
  const dawnSky = new BABYLON.Color3(0.30, 0.17, 0.18);
  const daySky = new BABYLON.Color3(0.24, 0.40, 0.58);

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
    cycle.elapsedSeconds = (cycle.elapsedSeconds + dt) % cycle.durationSeconds;
    cycle.timeOfDay = (18 + cycle.elapsedSeconds / cycle.durationSeconds * 24) % 24;
    const t = cycle.timeOfDay;

    // Solar elevation follows a smooth sine wave: noon is highest, midnight lowest.
    const angle = ((t - 6) / 24) * Math.PI * 2;
    const elevation = Math.sin(angle);
    const horizontal = Math.cos(angle);
    sun.direction.set(-horizontal * 0.72, -Math.max(0.08, Math.abs(elevation)), 0.28);

    const night = BABYLON.Scalar.Clamp((-elevation + 0.12) / 0.75, 0, 1);
    const twilight = 1 - BABYLON.Scalar.Clamp(Math.abs(elevation) / 0.34, 0, 1);
    cycle.nightAmount = night;

    let sky;
    if (t >= 17 && t < 20) {
      const p = (t - 17) / 3;
      sky = blendColor(daySky, sunsetSky, Math.min(1, p * 1.5));
      sky = blendColor(sky, nightSky, Math.max(0, (p - 0.45) / 0.55));
      cycle.phase = p < 0.45 ? "Sunset" : "Dusk";
    } else if (t >= 20 || t < 5) {
      sky = nightSky;
      cycle.phase = "Night";
    } else if (t < 8) {
      const p = (t - 5) / 3;
      sky = blendColor(nightSky, dawnSky, Math.min(1, p * 1.7));
      sky = blendColor(sky, daySky, Math.max(0, (p - 0.45) / 0.55));
      cycle.phase = p < 0.52 ? "Dawn" : "Sunrise";
    } else {
      sky = daySky;
      cycle.phase = "Day";
    }

    scene.clearColor.set(sky.r, sky.g, sky.b, 1);
    scene.fogColor.copyFrom(sky.scale(0.72));

    const daylight = BABYLON.Scalar.Clamp(elevation * 1.25 + 0.2, 0, 1);
    sun.diffuse = blendColor(new BABYLON.Color3(0.28, 0.36, 0.58), new BABYLON.Color3(1.0, 0.82, 0.58), daylight);
    sun.intensity = 0.22 + daylight * 1.3 + twilight * 0.32;
    ambient.diffuse = blendColor(new BABYLON.Color3(0.10, 0.14, 0.25), new BABYLON.Color3(0.53, 0.59, 0.48), daylight);
    ambient.groundColor = blendColor(new BABYLON.Color3(0.025, 0.035, 0.055), new BABYLON.Color3(0.16, 0.13, 0.08), daylight);
    ambient.intensity = 0.34 + daylight * 0.78;
    scene.environmentIntensity = 0.25 + daylight * 0.55;
    scene.imageProcessingConfiguration.exposure = 1.05 + daylight * 0.25 + twilight * 0.12;
  });

  return { sun, ambient, cycle };
}
