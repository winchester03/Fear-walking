const MODEL_ROOT = "./assets/models/";

const WORLD = Object.freeze({
  seed: 573921,
  forestRadius: 48,
  clearingRadius: 9,
  treeSpacing: 5.8,
  vegetationViewDistance: 34
});

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function visibleMeshes(result) {
  return result.meshes.filter(mesh => mesh instanceof BABYLON.Mesh && mesh.getTotalVertices() > 0);
}

function materialsFrom(meshes) {
  const materials = new Set();
  for (const mesh of meshes) {
    if (mesh.material) materials.add(mesh.material);
  }
  return [...materials];
}

function preserveAssetMaterial(material) {
  if (material instanceof BABYLON.PBRMaterial) {
    // Keep the color/alpha texture embedded in the tree pack intact.
    material.albedoColor = BABYLON.Color3.White();
    material.emissiveColor = BABYLON.Color3.Black();
    material.metallic = 0;
    material.environmentIntensity = 0.65;
    material.backFaceCulling = false;
    if ((material.name || "").toLowerCase().includes("twig")) {
      material.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHATESTANDBLEND;
      material.alphaCutOff = 0.35;
      if (material.albedoTexture) {
        material.albedoTexture.hasAlpha = true;
        material.useAlphaFromAlbedoTexture = true;
      }
    }
  } else if (material instanceof BABYLON.StandardMaterial) {
    material.diffuseColor = BABYLON.Color3.White();
    material.emissiveColor = BABYLON.Color3.Black();
    material.specularColor = BABYLON.Color3.Black();
    material.backFaceCulling = false;
    if (material.diffuseTexture) material.diffuseTexture.hasAlpha = true;
  }
}

function combinedBounds(meshes) {
  let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
  let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
    mesh.refreshBoundingInfo();
    const box = mesh.getBoundingInfo().boundingBox;
    min = BABYLON.Vector3.Minimize(min, box.minimumWorld);
    max = BABYLON.Vector3.Maximize(max, box.maximumWorld);
  }
  return { min, max };
}

async function loadAndMergeAsset(scene, filename, targetHeight) {
  const result = await BABYLON.SceneLoader.ImportMeshAsync("", MODEL_ROOT, filename, scene);
  let meshes = visibleMeshes(result);
  if (!meshes.length) throw new Error(`${filename} contains no visible geometry.`);

  materialsFrom(meshes).forEach(preserveAssetMaterial);

  // Bake the original hierarchy before merging. This keeps the supplied UVs and textures.
  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
    mesh.bakeTransformIntoVertices(mesh.getWorldMatrix().clone());
    mesh.setParent(null);
    mesh.position.setAll(0);
    mesh.scaling.setAll(1);
    mesh.rotationQuaternion = null;
    mesh.rotation.setAll(0);
  }

  const bounds = combinedBounds(meshes);
  const height = bounds.max.y - bounds.min.y;
  const scale = targetHeight / Math.max(height, 0.001);
  const cx = (bounds.min.x + bounds.max.x) * 0.5;
  const cz = (bounds.min.z + bounds.max.z) * 0.5;
  const correction = BABYLON.Matrix.Compose(
    new BABYLON.Vector3(scale, scale, scale),
    BABYLON.Quaternion.Identity(),
    new BABYLON.Vector3(-cx * scale, -bounds.min.y * scale, -cz * scale)
  );
  for (const mesh of meshes) mesh.bakeTransformIntoVertices(correction);

  // The original high-detail tree contains dozens of mesh pieces. Merge pieces that
  // share a material so one tree needs only a handful of draw calls, not 72.
  const groups = new Map();
  for (const mesh of meshes) {
    const material = mesh.material;
    if (!groups.has(material)) groups.set(material, []);
    groups.get(material).push(mesh);
  }

  const merged = [];
  let part = 0;
  for (const [material, group] of groups) {
    const joined = group.length === 1
      ? group[0]
      : BABYLON.Mesh.MergeMeshes(group, true, true, undefined, false, false);
    if (!joined) continue;
    joined.name = `${filename}-merged-${part++}`;
    joined.material = material;
    joined.isPickable = false;
    joined.checkCollisions = false;
    joined.alwaysSelectAsActiveMesh = false;
    joined.refreshBoundingInfo();
    merged.push(joined);
  }

  for (const node of result.meshes) {
    if (!merged.includes(node) && !node.isDisposed()) node.dispose(false, false);
  }

  return {
    meshes: merged,
    setTransforms(transforms) {
      if (!transforms.length) {
        merged.forEach(mesh => mesh.setEnabled(false));
        return;
      }
      const anchor = transforms[0];
      for (const mesh of merged) {
        mesh.setEnabled(true);
        mesh.position.set(anchor.x, anchor.y || 0, anchor.z);
        mesh.rotationQuaternion = null;
        mesh.rotation.set(0, anchor.rotation, 0);
        mesh.scaling.setAll(anchor.scale);

        const count = transforms.length - 1;
        if (count <= 0) continue;
        const matrices = new Float32Array(count * 16);
        for (let i = 1; i < transforms.length; i++) {
          const t = transforms[i];
          BABYLON.Matrix.Compose(
            new BABYLON.Vector3(t.scale / anchor.scale, t.scale / anchor.scale, t.scale / anchor.scale),
            BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, t.rotation - anchor.rotation),
            new BABYLON.Vector3(t.x - anchor.x, (t.y || 0) - (anchor.y || 0), t.z - anchor.z)
          ).copyToArray(matrices, (i - 1) * 16);
        }
        mesh.thinInstanceSetBuffer("matrix", matrices, 16, true);
        mesh.thinInstanceRefreshBoundingInfo(true);
      }
    }
  };
}

function makeTreeLayout() {
  const random = seededRandom(WORLD.seed);
  const positions = [];
  const spacing = WORLD.treeSpacing;
  const limit = Math.ceil(WORLD.forestRadius / spacing);
  for (let row = -limit; row <= limit; row++) {
    for (let col = -limit; col <= limit; col++) {
      const offset = (row & 1) ? spacing * 0.5 : 0;
      const x = col * spacing + offset + (random() - 0.5) * 1.35;
      const z = row * spacing + (random() - 0.5) * 1.35;
      const d = Math.hypot(x, z);
      if (d < WORLD.clearingRadius || d > WORLD.forestRadius || random() < 0.13) continue;
      positions.push({
        x, z, y: 0,
        scale: 0.82 + random() * 0.32,
        rotation: random() * Math.PI * 2
      });
    }
  }
  positions.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
  return positions;
}

function makeScatter(count, minRadius, maxRadius, seed, scaleMin, scaleMax) {
  const random = seededRandom(seed);
  const output = [];
  for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * (maxRadius - minRadius) + minRadius;
    output.push({
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      y: 0,
      scale: scaleMin + random() * (scaleMax - scaleMin),
      rotation: random() * Math.PI * 2
    });
  }
  return output;
}

function createDebugPanel(scene, counts) {
  const panel = document.createElement("div");
  panel.id = "debugPanel";
  panel.textContent = `${counts.trees} high-detail trees`;
  document.body.appendChild(panel);
  let frames = 0;
  let elapsed = 0;
  scene.onBeforeRenderObservable.add(() => {
    frames++;
    elapsed += scene.getEngine().getDeltaTime();
    if (elapsed >= 1000) {
      panel.textContent = `${Math.round(frames * 1000 / elapsed)} FPS · ${counts.trees} high-detail trees`;
      frames = 0;
      elapsed = 0;
    }
  });
}

export async function createForest(scene) {
  const status = document.getElementById("loadingStatus");
  const setStatus = text => { if (status) status.textContent = text; };

  setStatus("Loading 10,000-poly trees and texture pack…");
  const trees = await loadAndMergeAsset(scene, "pine-tree.glb", 12.5);
  setStatus("Loading ferns…");
  const fern = await loadAndMergeAsset(scene, "fern.glb", 0.75);
  setStatus("Loading shrubs…");
  const shrub = await loadAndMergeAsset(scene, "shrub.glb", 1.25);
  setStatus("Loading grass…");
  const grass = await loadAndMergeAsset(scene, "grass.glb", 0.6);
  setStatus("Loading deadfall…");
  const deadfall = await loadAndMergeAsset(scene, "dead-tree-trunk.glb", 1.15);

  const treeTransforms = makeTreeLayout();
  const fernTransforms = makeScatter(85, WORLD.clearingRadius + 1, 43, 8103, 0.7, 1.35);
  const shrubTransforms = makeScatter(34, WORLD.clearingRadius + 2, 43, 9221, 0.78, 1.35);
  const grassTransforms = makeScatter(105, WORLD.clearingRadius - 0.5, 43, 1619, 0.62, 1.25);
  const deadfallTransforms = makeScatter(10, WORLD.clearingRadius + 4, 42, 31842, 0.82, 1.25)
    .map(t => ({ ...t, y: -0.22 }));

  // Static thin-instance buffers are built once. Walking no longer rebuilds large
  // GPU buffers, which was the cause of the movement crash in 0.0.9.
  trees.setTransforms(treeTransforms);
  fern.setTransforms(fernTransforms);
  shrub.setTransforms(shrubTransforms);
  grass.setTransforms(grassTransforms);
  deadfall.setTransforms(deadfallTransforms);

  const counts = {
    trees: treeTransforms.length,
    ferns: fernTransforms.length,
    shrubs: shrubTransforms.length,
    grass: grassTransforms.length,
    deadfall: deadfallTransforms.length
  };

  createDebugPanel(scene, counts);
  setStatus("Forest ready");
  setTimeout(() => document.getElementById("loadingScreen")?.remove(), 300);
  return counts;
}
