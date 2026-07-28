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

  for (let index = 0; index < count; index++) {
    const azimuth = random() * Math.PI * 2;
    // Keep stars above the tree line and bias them toward the upper sky.
    const elevation = 0.18 + Math.pow(random(), 0.62) * 1.22;
    const radius = radiusMin + random() * (radiusMax - radiusMin);
    const horizontal = Math.cos(elevation) * radius;
    positions.push(
      Math.cos(azimuth) * horizontal,
      Math.sin(elevation) * radius,
      Math.sin(azimuth) * horizontal
    );
    indices.push(index);
  }

  const mesh = new BABYLON.Mesh(name, scene);
  const vertexData = new BABYLON.VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.applyToMesh(mesh, true);

  const material = new BABYLON.StandardMaterial(`${name}Material`, scene);
  material.pointsCloud = true;
  material.pointSize = pointSize;
  material.disableLighting = true;
  material.emissiveColor = new BABYLON.Color3(0.78, 0.84, 1.0);
  material.diffuseColor = BABYLON.Color3.Black();
  material.specularColor = BABYLON.Color3.Black();
  material.fogEnabled = false;
  material.alpha = 0.88;

  mesh.material = material;
  mesh.isPickable = false;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.infiniteDistance = true;
  mesh.renderingGroupId = 0;
  return { mesh, material };
}

export function createNightSky(scene) {
  const faint = createStarLayer(scene, "faintStars", 280, 72, 92, 1.35, 41829);
  const bright = createStarLayer(scene, "brightStars", 64, 74, 90, 2.25, 90417);

  let time = 0;
  scene.onBeforeRenderObservable.add(() => {
    time += scene.getEngine().getDeltaTime() * 0.001;
    faint.material.alpha = 0.74 + Math.sin(time * 0.31) * 0.05;
    bright.material.alpha = 0.88 + Math.sin(time * 0.53) * 0.06;
  });

  return { faint, bright };
}
