export function createTerrain(scene) {
  const material = new BABYLON.StandardMaterial("groundMaterial", scene);
  material.diffuseColor = new BABYLON.Color3(0.075, 0.066, 0.045);
  material.ambientColor = new BABYLON.Color3(0.025, 0.024, 0.018);
  material.specularColor = BABYLON.Color3.Black();

  const ground = BABYLON.MeshBuilder.CreateGround(
    "forestGround",
    { width: 140, height: 140, subdivisions: 2 },
    scene
  );
  ground.material = material;
  ground.isPickable = true;
  ground.checkCollisions = true;
  ground.receiveShadows = true;
  ground.freezeWorldMatrix();
  return { ground };
}
