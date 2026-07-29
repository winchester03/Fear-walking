function blendColor(a, b, amount) {
  return BABYLON.Color3.Lerp(a, b, BABYLON.Scalar.Clamp(amount, 0, 1));
}

export function createLighting(scene) {
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0032;

  const sun = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(-0.4, -1, 0.2), scene);
  sun.diffuse = new BABYLON.Color3(1.0, 0.91, 0.74);
  sun.specular = new BABYLON.Color3(0.25, 0.22, 0.16);

  const moon = new BABYLON.DirectionalLight("moonLight", new BABYLON.Vector3(0.4, -1, -0.2), scene);
  moon.diffuse = new BABYLON.Color3(0.38, 0.48, 0.72);
  moon.specular = BABYLON.Color3.Black();

  const ambient = new BABYLON.HemisphericLight("skyAmbient", new BABYLON.Vector3(0, 1, 0), scene);
  ambient.specular = BABYLON.Color3.Black();

  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.imageProcessingConfiguration.contrast = 1.08;

  const cycle = {
    durationSeconds: 300,
    elapsedSeconds: 0,
    timeOfDay: 10,
    nightAmount: 0,
    daylightAmount: 1,
    phase: "Day",
    sunPosition: new BABYLON.Vector3(0, 1, 0),
    moonPosition: new BABYLON.Vector3(0, -1, 0),
    skyTop: new BABYLON.Color3(0.28, 0.58, 0.92),
    skyHorizon: new BABYLON.Color3(0.72, 0.86, 1.0),
    sunColor: new BABYLON.Color3(1, 0.93, 0.76)
  };

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
    cycle.elapsedSeconds = (cycle.elapsedSeconds + dt) % cycle.durationSeconds;
    cycle.timeOfDay = (10 + cycle.elapsedSeconds / cycle.durationSeconds * 24) % 24;
    const t = cycle.timeOfDay;

    const solarAngle = ((t - 6) / 24) * Math.PI * 2;
    const sunElevation = Math.sin(solarAngle);
    const sunHorizontal = Math.cos(solarAngle);
    const moonAngle = solarAngle + Math.PI;

    cycle.sunPosition.set(sunHorizontal, sunElevation, 0.28).normalize();
    cycle.moonPosition.set(Math.cos(moonAngle), Math.sin(moonAngle), -0.28).normalize();
    sun.direction.copyFrom(cycle.sunPosition.scale(-1));
    moon.direction.copyFrom(cycle.moonPosition.scale(-1));

    const daylight = BABYLON.Scalar.SmoothStep(0, 1, BABYLON.Scalar.Clamp((sunElevation + 0.11) / 0.42, 0, 1));
    const moonlight = BABYLON.Scalar.SmoothStep(0, 1, BABYLON.Scalar.Clamp((cycle.moonPosition.y + 0.08) / 0.38, 0, 1));
    const horizonGlow = 1 - BABYLON.Scalar.Clamp(Math.abs(sunElevation) / 0.30, 0, 1);
    cycle.daylightAmount = daylight;
    cycle.nightAmount = 1 - daylight;

    const nightTop = new BABYLON.Color3(0.004, 0.009, 0.025);
    const nightHorizon = new BABYLON.Color3(0.015, 0.025, 0.060);
    const dayTop = new BABYLON.Color3(0.24, 0.55, 0.92);
    const dayHorizon = new BABYLON.Color3(0.68, 0.85, 1.0);
    const sunriseYellow = new BABYLON.Color3(1.0, 0.72, 0.27);
    const sunsetOrange = new BABYLON.Color3(1.0, 0.30, 0.08);

    cycle.skyTop.copyFrom(blendColor(nightTop, dayTop, daylight));
    cycle.skyHorizon.copyFrom(blendColor(nightHorizon, dayHorizon, daylight));
    if (horizonGlow > 0.01) {
      const warm = t < 12 ? sunriseYellow : sunsetOrange;
      cycle.skyHorizon.copyFrom(blendColor(cycle.skyHorizon, warm, horizonGlow * 0.88));
    }

    if (t >= 7.5 && t < 17.5) cycle.phase = "Day";
    else if (t >= 17.5 && t < 20.5) cycle.phase = "Sunset";
    else if (t >= 20.5 || t < 4.5) cycle.phase = "Night";
    else cycle.phase = "Sunrise";

    scene.clearColor.set(cycle.skyTop.r, cycle.skyTop.g, cycle.skyTop.b, 1);
    scene.fogColor.copyFrom(blendColor(cycle.skyHorizon, new BABYLON.Color3(0.06, 0.075, 0.065), 0.42));

    sun.intensity = daylight * 3.05 + horizonGlow * 0.42;
    sun.diffuse = blendColor(new BABYLON.Color3(1.0, 0.50, 0.20), new BABYLON.Color3(1.0, 0.94, 0.79), daylight);
    moon.intensity = moonlight * 0.48;

    ambient.diffuse = blendColor(new BABYLON.Color3(0.16, 0.21, 0.38), new BABYLON.Color3(0.76, 0.82, 0.79), daylight);
    ambient.groundColor = blendColor(new BABYLON.Color3(0.035, 0.045, 0.075), new BABYLON.Color3(0.24, 0.22, 0.16), daylight);
    ambient.intensity = 0.30 + daylight * 0.88 + moonlight * 0.20;
    scene.environmentIntensity = 0.30 + daylight * 0.75;
    scene.imageProcessingConfiguration.exposure = 1.12 + daylight * 0.28 + horizonGlow * 0.10;
  });

  return { sun, moon, ambient, cycle };
}
