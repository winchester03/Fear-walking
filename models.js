const MODEL_ROOT = "./assets/models/";

const WORLD = Object.freeze({
  seed: 573921,
  forestRadius: 58,
  clearingRadius: 9,
  treeSpacing: 4.35,
  heroTreeCount: 0,
  lowTreeViewDistance: 38,
  vegetationViewDistance: 22
});

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function collectMaterials(meshes) {
  const materials = new Set();
  for (const mesh of meshes) {
    const material = mesh.material;
    if (!material) continue;
    if (material instanceof BABYLON.MultiMaterial) {
      for (const subMaterial of material.subMaterials) {
        if (subMaterial) materials.add(subMaterial);
      }
    } else {
      materials.add(material);
    }
  }
  return materials;
}

function tuneMaterial(material, brightness = 1.0) {
  const name = (material.name || "").toLowerCase();
  let fallback = new BABYLON.Color3(0.34, 0.24, 0.12);
  if (name.includes("twig") || name.includes("leaf") || name.includes("needle") || name.includes("fern") || name.includes("grass") || name.includes("shrub")) {
    fallback = new BABYLON.Color3(0.16, 0.38, 0.12);
  } else if (name.includes("dead")) {
    fallback = new BABYLON.Color3(0.29, 0.22, 0.14);
  } else if (name.includes("bark") || name.includes("trunk")) {
    fallback = new BABYLON.Color3(0.30, 0.20, 0.105);
  }

  if (material instanceof BABYLON.PBRMaterial) {
    // Several optimized GLBs contain only roughness maps and no base-color map.
    // Assign explicit natural colors instead of allowing them to render gray/black.
    if (!material.albedoTexture) material.albedoColor = fallback.scale(brightness);
    else material.albedoColor = new BABYLON.Color3(brightness, brightness, brightness);
    material.emissiveColor = fallback.scale(0.035);
    material.metallic = 0;
    material.roughness = 0.92;
    material.environmentIntensity = 0.35;
    material.backFaceCulling = false;
    material.freeze();
  } else if (material instanceof BABYLON.StandardMaterial) {
    if (!material.diffuseTexture) material.diffuseColor = fallback.scale(brightness);
    else material.diffuseColor = new BABYLON.Color3(brightness, brightness, brightness);
    material.emissiveColor = fallback.scale(0.025);
    material.specularColor = BABYLON.Color3.Black();
    material.backFaceCulling = false;
    material.freeze();
  }
}

function visibleMeshes(result) {
  return result.meshes.filter(
    mesh => mesh instanceof BABYLON.Mesh && mesh.getTotalVertices() > 0
  );
}

function combinedBounds(meshes) {
  let minimum = new BABYLON.Vector3(
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY
  );
  let maximum = new BABYLON.Vector3(
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY
  );

  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
    mesh.refreshBoundingInfo();
    const box = mesh.getBoundingInfo().boundingBox;
    minimum = BABYLON.Vector3.Minimize(minimum, box.minimumWorld);
    maximum = BABYLON.Vector3.Maximize(maximum, box.maximumWorld);
  }
  return { minimum, maximum };
}

async function loadMultipartAsset(scene, filename, targetHeight, brightness = 0.62) {
  const result = await BABYLON.SceneLoader.ImportMeshAsync(
    "",
    MODEL_ROOT,
    filename,
    scene
  );

  const meshes = visibleMeshes(result);
  if (!meshes.length) {
    throw new Error(`${filename} contains no visible geometry.`);
  }

  collectMaterials(meshes).forEach(material => tuneMaterial(material, brightness));

  // Preserve the complete model hierarchy by baking each part independently.
  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
    mesh.bakeTransformIntoVertices(mesh.getWorldMatrix().clone());
    mesh.setParent(null);
    mesh.position.setAll(0);
    mesh.scaling.setAll(1);
    mesh.rotationQuaternion = null;
    mesh.rotation.setAll(0);
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.computeWorldMatrix(true);
    mesh.refreshBoundingInfo();
  }

  for (const node of result.meshes) {
    if (!meshes.includes(node)) node.setEnabled(false);
  }

  const bounds = combinedBounds(meshes);
  const height = bounds.maximum.y - bounds.minimum.y;
  if (!Number.isFinite(height) || height <= 0) {
    throw new Error(`Could not calculate dimensions for ${filename}.`);
  }

  const scale = targetHeight / height;
  const centerX = (bounds.minimum.x + bounds.maximum.x) / 2;
  const centerZ = (bounds.minimum.z + bounds.maximum.z) / 2;
  const correction = BABYLON.Matrix.Compose(
    new BABYLON.Vector3(scale, scale, scale),
    BABYLON.Quaternion.Identity(),
    new BABYLON.Vector3(
      -centerX * scale,
      -bounds.minimum.y * scale,
      -centerZ * scale
    )
  );

  for (const mesh of meshes) {
    mesh.bakeTransformIntoVertices(correction);
    mesh.position.setAll(0);
    mesh.scaling.setAll(1);
    mesh.rotationQuaternion = null;
    mesh.rotation.setAll(0);
    mesh.computeWorldMatrix(true);
    mesh.refreshBoundingInfo();
  }

  return {
    filename,
    meshes,
    clearInstances() {
      for (const mesh of meshes) {
        mesh.thinInstanceSetBuffer("matrix", null);
      }
    },
    setTransforms(transforms) {
      if (!transforms.length) {
        for (const mesh of meshes) mesh.setEnabled(false);
        return;
      }

      // The visible source geometry occupies the first placement.
      // Remaining placements are GPU thin instances relative to that anchor.
      const anchor = transforms[0];
      for (const mesh of meshes) {
        mesh.setEnabled(true);
        mesh.isVisible = true;
        mesh.position.set(anchor.x, anchor.y ?? 0, anchor.z);
        mesh.scaling.set(anchor.scale, anchor.scale, anchor.scale);
        mesh.rotationQuaternion = null;
        mesh.rotation.set(0, anchor.rotation, 0);
        mesh.alwaysSelectAsActiveMesh = true;

        const count = Math.max(0, transforms.length - 1);
        if (count === 0) {
          mesh.thinInstanceSetBuffer("matrix", null);
          continue;
        }

        const matrices = new Float32Array(count * 16);
        let offset = 0;
        for (let index = 1; index < transforms.length; index++) {
          const item = transforms[index];
          const relativeScale = item.scale / anchor.scale;
          const relativeRotation = item.rotation - anchor.rotation;
          // Anchor rotation/scale are intentionally fixed to 0/1 for streamed assets.
          BABYLON.Matrix.Compose(
            new BABYLON.Vector3(relativeScale, relativeScale, relativeScale),
            BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, relativeRotation),
            new BABYLON.Vector3(
              item.x - anchor.x,
              (item.y ?? 0) - (anchor.y ?? 0),
              item.z - anchor.z
            )
          ).copyToArray(matrices, offset);
          offset += 16;
        }
        mesh.thinInstanceSetBuffer("matrix", matrices, 16, true);
        mesh.thinInstanceRefreshBoundingInfo(true);
      }
    }
  };
}

async function loadHeroTree(scene) {
  const result = await BABYLON.SceneLoader.ImportMeshAsync(
    "",
    MODEL_ROOT,
    "pine-tree.glb",
    scene
  );
  const meshes = visibleMeshes(result);
  collectMaterials(meshes).forEach(material => tuneMaterial(material, 1.0));
  result.meshes.forEach(mesh => {
    mesh.isPickable = false;
    mesh.checkCollisions = false;
  });
  const root = result.meshes[0];
  if (!root) throw new Error("High-detail tree has no root node.");
  return root;
}

function makeTreeLayout() {
  const random = seededRandom(WORLD.seed);
  const positions = [];
  const rowSpacing = WORLD.treeSpacing;
  const columnSpacing = WORLD.treeSpacing * 1.04;
  const rows = Math.ceil((WORLD.forestRadius * 2) / rowSpacing);
  const columns = Math.ceil((WORLD.forestRadius * 2) / columnSpacing);

  for (let row = -rows; row <= rows; row++) {
    const baseZ = row * rowSpacing;
    const rowOffset = (row & 1) ? columnSpacing * 0.5 : 0;
    for (let column = -columns; column <= columns; column++) {
      const x = column * columnSpacing + rowOffset + (random() - 0.5) * 1.25;
      const z = baseZ + (random() - 0.5) * 1.25;
      const distance = Math.hypot(x, z);
      if (distance < WORLD.clearingRadius || distance > WORLD.forestRadius) continue;
      if (random() < 0.16) continue;

      const chance = random();
      let scale;
      if (chance < 0.17) scale = 0.68 + random() * 0.18;
      else if (chance > 0.84) scale = 1.18 + random() * 0.3;
      else scale = 0.88 + random() * 0.2;

      positions.push({
        x,
        z,
        y: 0,
        scale,
        rotation: random() * Math.PI * 2
      });
    }
  }

  // Stable sort lets the closest trees become high-detail hero trees.
  positions.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
  return positions;
}

function makeScatter(count, minRadius, maxRadius, seed, scaleMin, scaleMax, treePositions) {
  const random = seededRandom(seed);
  const output = [];
  const maxAttempts = count * 20;

  for (let attempt = 0; attempt < maxAttempts && output.length < count; attempt++) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * (maxRadius - minRadius) + minRadius;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    let blocked = false;
    for (let index = 0; index < treePositions.length; index += 3) {
      const tree = treePositions[index];
      if (Math.hypot(x - tree.x, z - tree.z) < 1.15) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    output.push({
      x,
      z,
      y: 0,
      scale: scaleMin + random() * (scaleMax - scaleMin),
      rotation: random() * Math.PI * 2
    });
  }
  return output;
}

function withinDistance(items, camera, distance) {
  const output = [];
  for (const item of items) {
    if (Math.hypot(item.x - camera.position.x, item.z - camera.position.z) <= distance) {
      output.push(item);
    }
  }
  return output;
}

function createDebugPanel(scene, counts) {
  const old = document.getElementById("debugPanel");
  if (old) old.remove();
  const panel = document.createElement("div");
  panel.id = "debugPanel";
  document.body.appendChild(panel);

  let elapsed = 0;
  scene.onBeforeRenderObservable.add(() => {
    elapsed += scene.getEngine().getDeltaTime();
    if (elapsed < 500) return;
    elapsed = 0;
    panel.innerHTML = [
      `FPS ${scene.getEngine().getFps().toFixed(0)}`,
      `Trees ${counts.trees}`,
      `Ferns ${counts.ferns}`,
      `Shrubs ${counts.shrubs}`,
      `Grass ${counts.grass}`,
      `Deadfall ${counts.deadfall}`
    ].join("<br>");
  });
}

export async function createForest(scene, camera) {
  const status = document.getElementById("loadingStatus");
  const setStatus = text => { if (status) status.textContent = text; };

  setStatus("Loading trees…");
  const heroTreeRoot = null;
  const lowTree = await loadMultipartAsset(scene, "pine-tree-low.glb", 12.5, 1.0);

  setStatus("Loading ferns…");
  const fern = await loadMultipartAsset(scene, "fern.glb", 0.75, 1.0);
  setStatus("Loading shrubs…");
  const shrub = await loadMultipartAsset(scene, "shrub.glb", 1.25, 1.0);
  setStatus("Loading grass…");
  const grass = await loadMultipartAsset(scene, "grass.glb", 0.6, 1.0);
  setStatus("Loading deadfall…");
  const deadfall = await loadMultipartAsset(scene, "dead-tree-trunk.glb", 1.15, 0.9);

  const allTrees = makeTreeLayout();
  const heroTransforms = allTrees.slice(0, WORLD.heroTreeCount);
  const lowTreeTransforms = allTrees.slice(WORLD.heroTreeCount);

  // High-detail trees are few and remain close to the central clearing.
  heroTransforms.forEach((transform, index) => {
    const tree = index === 0 ? heroTreeRoot : heroTreeRoot.clone(`heroTree${index}`);
    if (!tree) return;
    tree.position.set(transform.x, 0, transform.z);
    tree.rotationQuaternion = null;
    tree.rotation.set(0, transform.rotation, 0);
    tree.scaling.set(transform.scale, transform.scale, transform.scale);
    tree.setEnabled(true);
  });

  const fernTransforms = makeScatter(42, WORLD.clearingRadius + 1.5, 50, 8103, 0.7, 1.35, allTrees);
  const shrubTransforms = makeScatter(20, WORLD.clearingRadius + 2.5, 50, 9221, 0.78, 1.35, allTrees);
  const grassTransforms = makeScatter(55, WORLD.clearingRadius - 0.5, 51, 1619, 0.62, 1.25, allTrees);
  const deadfallTransforms = makeScatter(7, WORLD.clearingRadius + 4, 49, 31842, 0.82, 1.25, allTrees)
    .map(item => ({ ...item, y: -0.22 }));

  const counts = {
    trees: allTrees.length,
    ferns: fernTransforms.length,
    shrubs: shrubTransforms.length,
    grass: grassTransforms.length,
    deadfall: deadfallTransforms.length
  };

  function updateVisibleVegetation() {
    // Anchor is forced to scale 1 and rotation 0 so relative thin-instance transforms are stable.
    function anchored(items) {
      if (!items.length) return items;
      const first = { ...items[0], scale: 1, rotation: 0 };
      return [first, ...items.slice(1)];
    }

    lowTree.setTransforms(anchored(withinDistance(lowTreeTransforms, camera, WORLD.lowTreeViewDistance)));
    fern.setTransforms(anchored(withinDistance(fernTransforms, camera, WORLD.vegetationViewDistance)));
    shrub.setTransforms(anchored(withinDistance(shrubTransforms, camera, WORLD.vegetationViewDistance)));
    grass.setTransforms(anchored(withinDistance(grassTransforms, camera, 17)));
    deadfall.setTransforms(anchored(withinDistance(deadfallTransforms, camera, WORLD.vegetationViewDistance)));
  }

  updateVisibleVegetation();
  let lastUpdateX = camera.position.x;
  let lastUpdateZ = camera.position.z;
  scene.onBeforeRenderObservable.add(() => {
    if (Math.hypot(camera.position.x - lastUpdateX, camera.position.z - lastUpdateZ) < 4.0) return;
    lastUpdateX = camera.position.x;
    lastUpdateZ = camera.position.z;
    updateVisibleVegetation();
  });

  createDebugPanel(scene, counts);
  setStatus("Forest ready");
  setTimeout(() => document.getElementById("loadingScreen")?.remove(), 250);

  return {
    counts,
    clearingRadius: WORLD.clearingRadius,
    forestRadius: WORLD.forestRadius
  };
}
