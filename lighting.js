function blendColor(a, b, amount) {
  return BABYLON.Color3.Lerp(a, b, BABYLON.Scalar.Clamp(amount, 0, 1));
}

export function createLighting(scene) {
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0045;

  const sun = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(0, -1, 0), scene);
  sun.diffuse = new BABYLON.Color3(1.0, 0.86, 0.65);
  sun.specular = BABYLON.Color3.Black();

  const moon = new BABYLON.DirectionalLight("moonLight", new BABYLON.Vector3(0, -1, 0), scene);
  moon.diffuse = new BABYLON.Color3(0.42, 0.52, 0.78);
  moon.specular = BABYLON.Color3.Black();

  const ambient = new BABYLON.HemisphericLight("skyAmbient", new BABYLON.Vector3(0, 1, 0), scene);
  ambient.specular = BABYLON.Color3.Black();

  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.imageProcessingConfiguration.contrast = 1.02;

  const cycle = {
    durationSeconds: 300,
    elapsedSeconds: 0,
    timeOfDay: 18,
    nightAmount: 0,
    daylightAmount: 0,
    phase: "Sunset",
    sunPosition: new BABYLON.Vector3(0, 1, 0),
    moonPosition: new BABYLON.Vector3(0, -1, 0)
  };

  const sunsetSky = new BABYLON.Color3(0.46, 0.22, 0.12);
  const nightSky = new BABYLON.Color3(0.012, 0.022, 0.052);
  const dawnSky = new BABYLON.Color3(0.38, 0.22, 0.24);
  const daySky = new BABYLON.Color3(0.34, 0.52, 0.72);

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
    cycle.elapsedSeconds = (cycle.elapsedSeconds + dt) % cycle.durationSeconds;
    cycle.timeOfDay = (18 + cycle.elapsedSeconds / cycle.durationSeconds * 24) % 24;
    const t = cycle.timeOfDay;

    const solarAngle = ((t - 6) / 24) * Math.PI * 2;
    const sunElevation = Math.sin(solarAngle);
    const sunHorizontal = Math.cos(solarAngle);
    const moonAngle = solarAngle + Math.PI;
    const moonElevation = Math.sin(moonAngle);
    const moonHorizontal = Math.cos(moonAngle);

    cycle.sunPosition.set(sunHorizontal, sunElevation, 0.22);
    cycle.moonPosition.set(moonHorizontal, moonElevation, -0.22);

    sun.direction.copyFrom(cycle.sunPosition.scale(-1).normalize());
    moon.direction.copyFrom(cycle.moonPosition.scale(-1).normalize());

    const daylight = BABYLON.Scalar.SmoothStep(0, 1, BABYLON.Scalar.Clamp((sunElevation + 0.08) / 0.45, 0, 1));
    const moonlight = BABYLON.Scalar.SmoothStep(0, 1, BABYLON.Scalar.Clamp((moonElevation + 0.05) / 0.38, 0, 1));
    const twilight = 1 - BABYLON.Scalar.Clamp(Math.abs(sunElevation) / 0.28, 0, 1);
    cycle.daylightAmount = daylight;
    cycle.nightAmount = BABYLON.Scalar.Clamp(1 - daylight, 0, 1);

    let sky;
    if (t >= 17 && t < 20) {
      const p = (t - 17) / 3;
      sky = blendColor(daySky, sunsetSky, Math.min(1, p * 1.45));
      sky = blendColor(sky, nightSky, Math.max(0, (p - 0.48) / 0.52));
      cycle.phase = p < 0.48 ? "Sunset" : "Dusk";
    } else if (t >= 20 || t < 5) {
      sky = nightSky;
      cycle.phase = "Night";
    } else if (t < 8) {
      const p = (t - 5) / 3;
      sky = blendColor(nightSky, dawnSky, Math.min(1, p * 1.6));
      sky = blendColor(sky, daySky, Math.max(0, (p - 0.44) / 0.56));
      cycle.phase = p < 0.52 ? "Dawn" : "Sunrise";
    } else {
      sky = daySky;
      cycle.phase = "Day";
    }

    scene.clearColor.set(sky.r, sky.g, sky.b, 1);
    scene.fogColor.copyFrom(blendColor(sky.scale(0.78), new BABYLON.Color3(0.08, 0.09, 0.07), 0.22));

    sun.intensity = daylight * 2.15 + twilight * 0.28;
    moon.intensity = moonlight * 0.72;

    ambient.diffuse = blendColor(
      new BABYLON.Color3(0.25, 0.30, 0.46),
      new BABYLON.Color3(0.78, 0.78, 0.66),
      daylight
    );
    ambient.groundColor = blendColor(
      new BABYLON.Color3(0.09, 0.10, 0.15),
      new BABYLON.Color3(0.28, 0.24, 0.17),
      daylight
    );
    ambient.intensity = 0.62 + daylight * 0.82 + moonlight * 0.18;

    scene.environmentIntensity = 0.55 + daylight * 0.55 + moonlight * 0.12;
    scene.imageProcessingConfiguration.exposure = 1.32 + daylight * 0.22 + twilight * 0.10;
  });

  return { sun, moon, ambient, cycle };
}
