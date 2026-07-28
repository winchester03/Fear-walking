export function createTerrain(scene) {
  const material = new BABYLON.StandardMaterial("groundMaterial", scene);
  material.diffuseColor = new BABYLON.Color3(0.075, 0.085, 0.055);
  material.ambientColor = new BABYLON.Color3(0.025, 0.032, 0.018);
  material.specularColor = BABYLON.Color3.Black();
  material.emissiveColor = BABYLON.Color3.Black();
  material.maxSimultaneousLights = 4;

  const ground = BABYLON.MeshBuilder.CreateGround(
    "forestGround",
    { width: 140, height: 140, subdivisions: 1 },
    scene
  );
  ground.material = material;
  ground.isPickable = true;
  ground.checkCollisions = false;
  ground.freezeWorldMatrix();
  return { ground };
}
