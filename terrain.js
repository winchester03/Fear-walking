export function createTerrain(scene) {
  const material = new BABYLON.StandardMaterial("groundMaterial", scene);
  material.diffuseColor = new BABYLON.Color3(0.095, 0.070, 0.045);
  material.ambientColor = new BABYLON.Color3(0.075, 0.035, 0.014);
  material.specularColor = BABYLON.Color3.Black();
  material.emissiveColor = new BABYLON.Color3(0.012, 0.006, 0.002);
  material.maxSimultaneousLights = 8;

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
