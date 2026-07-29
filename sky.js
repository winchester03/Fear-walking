function seededRandom(seed) {
  let state = seed >>> 0;
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function createStars(scene) {
  const random = seededRandom(90417);
  const points = [];
  for (let i = 0; i < 360; i++) {
    const a = random() * Math.PI * 2;
    const e = 0.12 + random() * 1.35;
    const r = 88;
    points.push(new BABYLON.Vector3(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r));
  }
  const mesh = BABYLON.MeshBuilder.CreateLines("stars", { points }, scene);
  mesh.color = new BABYLON.Color3(0.82, 0.88, 1);
  mesh.alpha = 0;
  mesh.isPickable = false;
  mesh.infiniteDistance = true;
  mesh.alwaysSelectAsActiveMesh = true;
  return mesh;
}

export function createNightSky(scene, cycle, camera) {
  BABYLON.Effect.ShadersStore["fearSkyVertexShader"] = `
    precision highp float;
    attribute vec3 position;
    uniform mat4 worldViewProjection;
    varying vec3 vPosition;
    void main(void){ vPosition = position; gl_Position = worldViewProjection * vec4(position,1.0); }
  `;
  BABYLON.Effect.ShadersStore["fearSkyFragmentShader"] = `
    precision highp float;
    varying vec3 vPosition;
    uniform vec3 topColor;
    uniform vec3 horizonColor;
    void main(void){
      float h = clamp(normalize(vPosition).y * 0.5 + 0.5, 0.0, 1.0);
      h = smoothstep(0.05, 0.78, h);
      gl_FragColor = vec4(mix(horizonColor, topColor, h), 1.0);
    }
  `;

  const dome = BABYLON.MeshBuilder.CreateSphere("skyDome", { diameter: 190, segments: 20, sideOrientation: BABYLON.Mesh.BACKSIDE }, scene);
  const skyMat = new BABYLON.ShaderMaterial("skyGradient", scene, { vertex: "fearSky", fragment: "fearSky" }, { attributes: ["position"], uniforms: ["worldViewProjection", "topColor", "horizonColor"] });
  skyMat.backFaceCulling = false;
  skyMat.disableDepthWrite = true;
  skyMat.fogEnabled = false;
  dome.material = skyMat;
  dome.infiniteDistance = true;
  dome.isPickable = false;
  dome.alwaysSelectAsActiveMesh = true;

  const sun = BABYLON.MeshBuilder.CreateSphere("sunOrb", { diameter: 3.2, segments: 18 }, scene);
  const sunMat = new BABYLON.StandardMaterial("sunOrbMaterial", scene);
  sunMat.disableLighting = true;
  sunMat.emissiveColor = new BABYLON.Color3(1.0, 0.86, 0.54);
  sunMat.fogEnabled = false;
  sun.material = sunMat;
  sun.infiniteDistance = true;
  sun.isPickable = false;

  const moon = BABYLON.MeshBuilder.CreateSphere("moonOrb", { diameter: 2.7, segments: 18 }, scene);
  const moonMat = new BABYLON.StandardMaterial("moonOrbMaterial", scene);
  moonMat.disableLighting = true;
  moonMat.emissiveColor = new BABYLON.Color3(0.62, 0.70, 0.90);
  moonMat.fogEnabled = false;
  moon.material = moonMat;
  moon.infiniteDistance = true;
  moon.isPickable = false;

  const stars = createStars(scene);

  // Mobile/web builds do not expose hardware ray tracing. Babylon's volumetric
  // light scattering produces camera-correct sun shafts that are occluded by geometry.
  let godRays = null;
  try {
    godRays = new BABYLON.VolumetricLightScatteringPostProcess(
      "sunShafts", 0.5, camera, sun, 48, BABYLON.Texture.BILINEAR_SAMPLINGMODE, scene.getEngine(), false
    );
    godRays.exposure = 0.22;
    godRays.decay = 0.965;
    godRays.weight = 0.55;
    godRays.density = 0.72;
  } catch (error) {
    console.warn("Volumetric sun shafts unavailable", error);
  }

  scene.onBeforeRenderObservable.add(() => {
    skyMat.setColor3("topColor", cycle.skyTop);
    skyMat.setColor3("horizonColor", cycle.skyHorizon);
    const radius = 78;
    sun.position.copyFrom(cycle.sunPosition.scale(radius));
    moon.position.copyFrom(cycle.moonPosition.scale(radius));
    const sunVis = BABYLON.Scalar.Clamp((cycle.sunPosition.y + 0.04) / 0.16, 0, 1);
    const moonVis = BABYLON.Scalar.Clamp((cycle.moonPosition.y + 0.04) / 0.16, 0, 1);
    sun.setEnabled(sunVis > 0.01);
    moon.setEnabled(moonVis > 0.01);
    sunMat.alpha = sunVis;
    moonMat.alpha = moonVis;
    stars.alpha = BABYLON.Scalar.Clamp(cycle.nightAmount * 1.25 - 0.16, 0, 0.82);
    stars.setEnabled(stars.alpha > 0.01);
    if (godRays) godRays.exposure = sunVis * (0.10 + (1 - cycle.daylightAmount) * 0.20);
  });

  return { dome, sun, moon, stars, godRays };
}
