export function createTerrain(scene) {
  const material = new BABYLON.StandardMaterial("groundMaterial", scene);
  material.diffuseColor = new BABYLON.Color3(0.018, 0.019, 0.018);
  material.ambientColor = new BABYLON.Color3(0.003, 0.004, 0.005);
  material.specularColor = BABYLON.Color3.Black();
  material.emissiveColor = BABYLON.Color3.Black();

  const ground = BABYLON.MeshBuilder.CreateGround(
    "forestGround",
    { width: 140, height: 140, subdivisions: 1 },
    scene
  );
  ground.material = material;
  ground.isPickable = false;
  ground.checkCollisions = false;
  ground.freezeWorldMatrix();
  return { ground };
}
