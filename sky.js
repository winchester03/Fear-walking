function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createStarLayer(scene, name, count, radiusMin, radiusMax, pointSize, seed) {
  const random = seededRandom(seed);
  const positions = [];
  const indices = [];
  for (let i = 0; i < count; i++) {
    const azimuth = random() * Math.PI * 2;
    const elevation = 0.16 + Math.pow(random(), 0.62) * 1.25;
    const radius = radiusMin + random() * (radiusMax - radiusMin);
    const horizontal = Math.cos(elevation) * radius;
    positions.push(Math.cos(azimuth) * horizontal, Math.sin(elevation) * radius, Math.sin(azimuth) * horizontal);
    indices.push(i);
  }
  const mesh = new BABYLON.Mesh(name, scene);
  const data = new BABYLON.VertexData();
  data.positions = positions;
  data.indices = indices;
  data.applyToMesh(mesh, true);
  const material = new BABYLON.StandardMaterial(`${name}Material`, scene);
  material.pointsCloud = true;
  material.pointSize = pointSize;
  material.disableLighting = true;
  material.emissiveColor = new BABYLON.Color3(0.82, 0.87, 1.0);
  material.fogEnabled = false;
  mesh.material = material;
  mesh.isPickable = false;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.infiniteDistance = true;
  return { mesh, material };
}

function createCelestialDisc(scene, name, diameter, color) {
  const disc = BABYLON.MeshBuilder.CreateDisc(name, { radius: diameter * 0.5, tessellation: 48 }, scene);
  const material = new BABYLON.StandardMaterial(`${name}Material`, scene);
  material.disableLighting = true;
  material.emissiveColor = color;
  material.diffuseColor = color;
  material.specularColor = BABYLON.Color3.Black();
  material.fogEnabled = false;
  material.backFaceCulling = false;
  disc.material = material;
  disc.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  disc.infiniteDistance = true;
  disc.isPickable = false;
  disc.alwaysSelectAsActiveMesh = true;
  return { mesh: disc, material };
}

export function createNightSky(scene, cycle) {
  const faint = createStarLayer(scene, "faintStars", 250, 72, 92, 1.25, 41829);
  const bright = createStarLayer(scene, "brightStars", 58, 74, 90, 2.1, 90417);
  const sun = createCelestialDisc(scene, "visibleSun", 8.5, new BABYLON.Color3(1.0, 0.67, 0.28));
  const moon = createCelestialDisc(scene, "visibleMoon", 6.2, new BABYLON.Color3(0.72, 0.80, 1.0));

  let time = 0;
  scene.onBeforeRenderObservable.add(() => {
    time += scene.getEngine().getDeltaTime() * 0.001;
    const nightVisibility = BABYLON.Scalar.Clamp((cycle?.nightAmount ?? 1) * 1.35 - 0.18, 0, 1);
    faint.material.alpha = nightVisibility * (0.70 + Math.sin(time * 0.31) * 0.04);
    bright.material.alpha = nightVisibility * (0.88 + Math.sin(time * 0.53) * 0.05);
    faint.mesh.setEnabled(nightVisibility > 0.01);
    bright.mesh.setEnabled(nightVisibility > 0.01);

    const skyRadius = 82;
    sun.mesh.position.copyFrom(cycle.sunPosition.scale(skyRadius));
    moon.mesh.position.copyFrom(cycle.moonPosition.scale(skyRadius));

    const sunVisible = BABYLON.Scalar.Clamp((cycle.sunPosition.y + 0.08) / 0.22, 0, 1);
    const moonVisible = BABYLON.Scalar.Clamp((cycle.moonPosition.y + 0.06) / 0.20, 0, 1);
    sun.material.alpha = sunVisible;
    moon.material.alpha = moonVisible;
    sun.mesh.setEnabled(sunVisible > 0.01);
    moon.mesh.setEnabled(moonVisible > 0.01);
  });

  return { faint, bright, sun, moon };
}
