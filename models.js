const MODEL_ROOT = "./assets/models/";
const TEXTURE_ROOT = "./assets/textures/";

const WORLD = Object.freeze({
  seed: 573921,
  forestRadius: 110,
  clearingRadius: 4.5,
  treeSpacing: 5.1,
  heroTreeCount: 0,
  nearTreeDistance: 25,
  mediumTreeDistance: 75,
  farTreeViewDistance: 110,
  vegetationViewDistance: 48
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


function createTreeTextureSet(scene) {
  function load(name) {
    const texture = new BABYLON.Texture(
      `${TEXTURE_ROOT}${name}`,
      scene,
      true,
      false
    );
    texture.gammaSpace = true;
    return texture;
  }

  return {
    trunkA: load("tree-trunk-a.jpg"),
    trunkB: load("tree-trunk-b.jpg"),
    trunkC: load("tree-trunk-c.jpg"),
    bark: load("tree-bark.jpg"),
    dead: load("tree-dead.jpg"),
    twig: load("tree-twig.jpg")
  };
}

function applyTreeTextures(meshes, textures) {
  const materials = collectMaterials(meshes);

  materials.forEach(material => {
    const name = (material.name || "").toLowerCase();
    const isFoliage =
      name.includes("twig") ||
      name.includes("needle") ||
      name.includes("leaf") ||
      name.includes("foliage") ||
      name.includes("pine");
    const isDead = name.includes("dead");

    let texture = textures.bark;
    if (isFoliage) texture = textures.twig;
    else if (name.includes("trunk_a")) texture = textures.trunkA;
    else if (name.includes("trunk_b")) texture = textures.trunkB;
    else if (name.includes("trunk_c")) texture = textures.trunkC;
    else if (isDead) texture = textures.dead;

    // Very dark damp bark and near-black forest-green needles.
    // Textures remain visible, but the moonlight no longer makes them neon.
    const barkTint = isDead
      ? new BABYLON.Color3(0.34, 0.22, 0.105)
      : new BABYLON.Color3(0.46, 0.285, 0.13);
    const needleTint = new BABYLON.Color3(0.055, 0.105, 0.035);

    if (material instanceof BABYLON.PBRMaterial) {
      material.albedoTexture = texture;
      material.albedoColor = isFoliage ? needleTint : barkTint;
      material.metallic = 0;
      material.roughness = isFoliage ? 0.96 : 0.99;
      material.environmentIntensity = isFoliage ? 0.22 : 0.34;
      material.maxSimultaneousLights = 4;
      material.backFaceCulling = !isFoliage;

      if (isFoliage) {
        // The foliage cards need both sides visible. A very small green
        // emissive term keeps needles readable in deep blue moonlight.
        material.emissiveColor = BABYLON.Color3.Black();
        material.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
      } else {
        material.emissiveColor = BABYLON.Color3.Black();
      }
    } else if (material instanceof BABYLON.StandardMaterial) {
      material.diffuseTexture = texture;
      material.diffuseColor = isFoliage ? needleTint : barkTint;
      material.specularColor = BABYLON.Color3.Black();
      material.maxSimultaneousLights = 4;
      material.backFaceCulling = !isFoliage;
      material.emissiveColor = isFoliage
        ? BABYLON.Color3.Black()
        : BABYLON.Color3.Black();
    }
  });
}

function tuneMaterial(material, brightness = 0.62, assetType = "generic") {
  const isGrass = assetType === "grass";

  if (material instanceof BABYLON.PBRMaterial) {
    material.albedoColor = isGrass
      ? new BABYLON.Color3(0.22, 0.34, 0.16)
      : material.albedoColor.scale(brightness);
    material.metallic = 0;
    material.roughness = Math.max(material.roughness ?? 0.8, isGrass ? 0.94 : 0.86);
    material.environmentIntensity = isGrass ? 0.38 : 0.22;
    material.backFaceCulling = false;
    if (isGrass) {
      material.emissiveColor = new BABYLON.Color3(0.006, 0.012, 0.004);
    }
  } else if (material instanceof BABYLON.StandardMaterial) {
    material.diffuseColor = isGrass
      ? new BABYLON.Color3(0.22, 0.34, 0.16)
      : material.diffuseColor.scale(brightness);
    material.specularColor = BABYLON.Color3.Black();
    material.backFaceCulling = false;
    if (isGrass) {
      material.emissiveColor = new BABYLON.Color3(0.006, 0.012, 0.004);
    }
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

async function loadMultipartAsset(scene, filename, targetHeight, brightness = 0.62, treeTextures = null) {
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

  if (treeTextures) applyTreeTextures(meshes, treeTextures);
  else {
    const assetType = filename === "grass.glb" ? "grass" : "generic";
    collectMaterials(meshes).forEach(material => tuneMaterial(material, brightness, assetType));
  }

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
        mesh.scaling.set(
          anchor.scaleX ?? anchor.scale,
          anchor.scaleY ?? anchor.scale,
          anchor.scaleZ ?? anchor.scale
        );
        mesh.rotationQuaternion = null;
        mesh.rotation.set(
          anchor.rotationX ?? 0,
          anchor.rotation ?? 0,
          anchor.rotationZ ?? 0
        );
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
          const relativeScaleX =
            (item.scaleX ?? item.scale) / (anchor.scaleX ?? anchor.scale);
          const relativeScaleY =
            (item.scaleY ?? item.scale) / (anchor.scaleY ?? anchor.scale);
          const relativeScaleZ =
            (item.scaleZ ?? item.scale) / (anchor.scaleZ ?? anchor.scale);
          // Anchors are normalized to identity by anchored(), so each matrix
          // can use the item's complete yaw, pitch and roll directly.
          const relativeRotation = BABYLON.Quaternion.RotationYawPitchRoll(
            item.rotation ?? 0,
            item.rotationX ?? 0,
            item.rotationZ ?? 0
          );
          BABYLON.Matrix.Compose(
            new BABYLON.Vector3(relativeScaleX, relativeScaleY, relativeScaleZ),
            relativeRotation,
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

async function loadHeroTree(scene, treeTextures) {
  const result = await BABYLON.SceneLoader.ImportMeshAsync(
    "",
    MODEL_ROOT,
    "pine-tree.glb",
    scene
  );
  const meshes = visibleMeshes(result);
  applyTreeTextures(meshes, treeTextures);
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
        // Sink the trunk base roughly 0.75 ft into the terrain.
        y: -0.23,
        scale,
        scaleX: scale * 1.10,
        scaleY: scale,
        scaleZ: scale * 1.10,
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
      rotation: random() * Math.PI * 2,
      rotationX: 0,
      rotationZ: 0
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

  setStatus("Loading original pine trees…");
  const treeTextures = createTreeTextureSet(scene);

  async function loadTree(primaryFile, fallbackFile = "pine-tree-low.glb") {
    try {
      return await loadMultipartAsset(scene, primaryFile, 12.5, 0.58, treeTextures);
    } catch (error) {
      console.warn(`Could not load ${primaryFile}; falling back to ${fallbackFile}.`, error);
      return loadMultipartAsset(scene, fallbackFile, 12.5, 0.58, treeTextures);
    }
  }

  // Load the three LOD assets sequentially to avoid a large mobile memory spike.
  // Use the original detailed pine model close to the player. The prior generated
  // LOD meshes looked like silhouettes and have been removed from the visible forest.
  const nearTree = await loadTree("pine-tree.glb", "pine-tree-low.glb");
  setStatus("Loading original distant pines…");
  const mediumTree = await loadTree("pine-tree-low.glb", "pine-tree-1000.glb");
  setStatus("Loading distant tree silhouettes…");
  const farTree = await loadTree("pine-tree-1000.glb", "pine-tree-low.glb");

  setStatus("Loading ferns…");
  const fern = await loadMultipartAsset(scene, "fern.glb", 0.9, 0.92);
  setStatus("Loading shrubs…");
  const shrub = await loadMultipartAsset(scene, "shrub.glb", 1.15, 0.88);
  setStatus("Loading grass…");
  const grass = await loadMultipartAsset(scene, "grass.glb", 0.48, 1.0);
  setStatus("Loading fallen trees…");
  const deadfall = await loadMultipartAsset(scene, "dead-tree-trunk.glb", 1.15, 0.72);

  const allTrees = makeTreeLayout();
  const fernTransforms = makeScatter(310, 3.5, 62, 71931, 0.72, 1.28, allTrees);
  const shrubTransforms = makeScatter(115, 5.5, 70, 51388, 0.68, 1.32, allTrees);
  const grassTransforms = makeScatter(620, 2.5, 58, 92841, 0.72, 1.22, allTrees);

  // The old central cutscene pile is removed. Fallen trunks are dispersed
  // throughout the forest with deterministic random placement.
  const deadfallRandom = seededRandom(31843);
  const deadfallTransforms = makeScatter(
    26,
    8,
    88,
    31842,
    0.72,
    1.28,
    allTrees
  ).map(item => ({
    ...item,
    y: -0.24 - deadfallRandom() * 0.14,
    scaleX: item.scale * (0.9 + deadfallRandom() * 0.35),
    scaleY: item.scale * (0.88 + deadfallRandom() * 0.16),
    scaleZ: item.scale * (0.9 + deadfallRandom() * 0.25),
    rotationX: (deadfallRandom() - 0.5) * 0.08,
    rotationZ: (deadfallRandom() - 0.5) * 0.08
  }));

  const playerRadius = 0.42;
  const trunkCollisionRadius = 0.48;
  camera.metadata = camera.metadata || {};
  camera.metadata.horizontalCollisionResolver = (current, proposed) => {
    let x = proposed.x;
    let z = proposed.z;

    const worldLimit = WORLD.forestRadius - 1.5;
    const distanceFromCenter = Math.hypot(x, z);
    if (distanceFromCenter > worldLimit) {
      const scale = worldLimit / distanceFromCenter;
      x *= scale;
      z *= scale;
    }

    // Only inspect nearby tree centers. This remains much cheaper than mesh collisions.
    for (const tree of allTrees) {
      if (Math.abs(tree.x - x) > 2 || Math.abs(tree.z - z) > 2) continue;
      const radius = playerRadius + trunkCollisionRadius * (tree.scaleX ?? tree.scale);
      const dx = x - tree.x;
      const dz = z - tree.z;
      if (dx * dx + dz * dz >= radius * radius) continue;

      const xBlocked = (x - tree.x) ** 2 + (current.z - tree.z) ** 2 < radius * radius;
      const zBlocked = (current.x - tree.x) ** 2 + (z - tree.z) ** 2 < radius * radius;
      if (!xBlocked) z = current.z;
      else if (!zBlocked) x = current.x;
      else { x = current.x; z = current.z; }
    }

    return new BABYLON.Vector3(x, proposed.y, z);
  };

  const counts = {
    trees: allTrees.length,
    ferns: fernTransforms.length,
    shrubs: shrubTransforms.length,
    grass: grassTransforms.length,
    deadfall: deadfallTransforms.length
  };

  function anchored(items) {
    if (!items.length) return items;
    return [{
      ...items[0], scale: 1, scaleX: 1, scaleY: 1, scaleZ: 1,
      rotation: 0, rotationX: 0, rotationZ: 0
    }, ...items.slice(1)];
  }

  let lastUpdateX = Number.POSITIVE_INFINITY;
  let lastUpdateZ = Number.POSITIVE_INFINITY;

  function updateVisibleForest(force = false) {
    const moved = Math.hypot(camera.position.x - lastUpdateX, camera.position.z - lastUpdateZ);
    if (!force && moved < 2.5) return;
    lastUpdateX = camera.position.x;
    lastUpdateZ = camera.position.z;

    const near = [];
    const medium = [];
    const far = [];
    for (const tree of allTrees) {
      const distance = Math.hypot(tree.x - camera.position.x, tree.z - camera.position.z);
      if (distance <= WORLD.nearTreeDistance) near.push(tree);
      else if (distance <= WORLD.mediumTreeDistance) medium.push(tree);
      else if (distance <= WORLD.farTreeViewDistance) far.push(tree);
    }

    nearTree.setTransforms(anchored(near));
    mediumTree.setTransforms(anchored(medium));
    farTree.setTransforms(anchored(far));
    deadfall.setTransforms(anchored(withinDistance(deadfallTransforms, camera, 52)));
    fern.setTransforms(anchored(withinDistance(fernTransforms, camera, 42)));
    shrub.setTransforms(anchored(withinDistance(shrubTransforms, camera, 48)));
    grass.setTransforms(anchored(withinDistance(grassTransforms, camera, 34)));
  }

  updateVisibleForest(true);
  let elapsed = 0;
  scene.onBeforeRenderObservable.add(() => {
    elapsed += scene.getEngine().getDeltaTime();
    if (elapsed < 650) return;
    elapsed = 0;
    updateVisibleForest(false);
  });

  createDebugPanel(scene, counts);
  setStatus("Forest ready");
  setTimeout(() => document.getElementById("loadingScreen")?.remove(), 180);

  return {
    counts,
    clearingRadius: WORLD.clearingRadius,
    forestRadius: WORLD.forestRadius,
    shadowCasters: nearTree.meshes,
    fireData: { burningTrees: [], collapseCenter: BABYLON.Vector3.Zero(), centralCollapse: [] }
  };
}
