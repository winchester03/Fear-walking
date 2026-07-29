export function createTerrain(scene) {
  const texture = new BABYLON.DynamicTexture(
    "forestFloorTexture",
    { width: 512, height: 512 },
    scene,
    false
  );
  const context = texture.getContext();
  const random = (() => {
    let state = 93471;
    return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
  })();

  context.fillStyle = "#403827";
  context.fillRect(0, 0, 512, 512);

  // Mottled dirt, moss, pine needles and small leaf fragments.
  for (let i = 0; i < 9500; i++) {
    const x = random() * 512;
    const y = random() * 512;
    const size = 0.5 + random() * 2.4;
    const choice = random();
    context.fillStyle = choice < 0.36 ? "rgba(80,69,43,0.65)"
      : choice < 0.62 ? "rgba(45,62,35,0.55)"
      : choice < 0.84 ? "rgba(107,85,48,0.48)"
      : "rgba(30,27,20,0.55)";
    context.fillRect(x, y, size, size);
  }
  for (let i = 0; i < 900; i++) {
    const x = random() * 512;
    const y = random() * 512;
    const length = 3 + random() * 10;
    const angle = random() * Math.PI * 2;
    context.strokeStyle = random() < 0.55 ? "rgba(113,84,42,0.65)" : "rgba(54,45,28,0.72)";
    context.lineWidth = 0.7 + random();
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    context.stroke();
  }
  texture.update(false);
  texture.uScale = 18;
  texture.vScale = 18;
  texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;

  const material = new BABYLON.StandardMaterial("groundMaterial", scene);
  material.diffuseTexture = texture;
  material.diffuseColor = new BABYLON.Color3(0.86, 0.82, 0.72);
  material.ambientColor = new BABYLON.Color3(0.22, 0.20, 0.15);
  material.specularColor = BABYLON.Color3.Black();
  material.freeze();

  const ground = BABYLON.MeshBuilder.CreateGround(
    "forestGround",
    { width: 140, height: 140, subdivisions: 2 },
    scene
  );
  ground.material = material;
  ground.isPickable = true;
  ground.checkCollisions = true;
  ground.receiveShadows = false;
  ground.freezeWorldMatrix();
  return { ground };
}
