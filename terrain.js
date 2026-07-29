function makeForestFloorTexture(scene) {
  const size = 512;
  const texture = new BABYLON.DynamicTexture("forestFloorTexture", { width: size, height: size }, scene, false);
  const ctx = texture.getContext();
  const image = ctx.createImageData(size, size);
  let state = 88421;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const broad = Math.sin(x * 0.055) * 4 + Math.cos(y * 0.047) * 4;
      const grain = (random() - 0.5) * 24;
      const leaf = random() > 0.965 ? 18 : 0;
      const i = (y * size + x) * 4;
      image.data[i] = Math.max(18, Math.min(72, 43 + broad + grain + leaf));
      image.data[i + 1] = Math.max(20, Math.min(78, 48 + broad + grain * 0.7 + leaf * 0.55));
      image.data[i + 2] = Math.max(12, Math.min(52, 27 + broad * 0.35 + grain * 0.45));
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  // Add scattered needles and leaf litter over the soil noise.
  ctx.globalAlpha = 0.38;
  for (let i = 0; i < 2100; i++) {
    const x = random() * size;
    const y = random() * size;
    const length = 2 + random() * 7;
    ctx.strokeStyle = random() > 0.35 ? "#51452a" : "#26341d";
    ctx.lineWidth = 0.5 + random();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(random() * Math.PI * 2) * length, y + Math.sin(random() * Math.PI * 2) * length);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  texture.update(false);
  texture.uScale = 22;
  texture.vScale = 22;
  texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  return texture;
}

export function createTerrain(scene) {
  const material = new BABYLON.StandardMaterial("groundMaterial", scene);
  material.diffuseTexture = makeForestFloorTexture(scene);
  material.diffuseColor = new BABYLON.Color3(0.72, 0.72, 0.68);
  material.ambientColor = new BABYLON.Color3(0.12, 0.13, 0.08);
  material.specularColor = BABYLON.Color3.Black();
  material.maxSimultaneousLights = 3;

  const ground = BABYLON.MeshBuilder.CreateGround(
    "forestGround",
    { width: 235, height: 235, subdivisions: 1 },
    scene
  );
  ground.material = material;
  ground.isPickable = true;
  ground.checkCollisions = false;
  ground.freezeWorldMatrix();
  return { ground, material };
}
