const MODEL_ROOT = "./assets/models/";
const TEXTURE_ROOT = "./assets/textures/";

const WORLD = Object.freeze({
  seed: 573921,
  forestRadius: 58,
  clearingRadius: 9,
  treeSpacing: 4.10,
  heroTreeCount: 3,
  lowTreeViewDistance: 64,
  vegetationViewDistance: 44
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

  setStatus("Loading trees…");
  const treeTextures = createTreeTextureSet(scene);
  const heroTreeRoot = await loadHeroTree(scene, treeTextures);
  const lowTree = await loadMultipartAsset(
    scene,
    "pine-tree-low.glb",
    12.5,
    0.58,
    treeTextures
  );

  setStatus("Loading ferns…");
  const fern = await loadMultipartAsset(scene, "fern.glb", 0.75, 0.64);
  setStatus("Loading shrubs…");
  const shrub = await loadMultipartAsset(scene, "shrub.glb", 1.25, 0.62);
  setStatus("Loading grass…");
  const grass = await loadMultipartAsset(scene, "grass.glb", 1.05, 1.0);
  setStatus("Loading deadfall…");
  const deadfall = await loadMultipartAsset(scene, "dead-tree-trunk.glb", 1.15, 0.55);

  const allTrees = makeTreeLayout();
  const heroTransforms = allTrees.slice(0, WORLD.heroTreeCount);
  const lowTreeTransforms = allTrees.slice(WORLD.heroTreeCount);

  // High-detail trees are few and remain close to the central clearing.
  heroTransforms.forEach((transform, index) => {
    const tree = index === 0 ? heroTreeRoot : heroTreeRoot.clone(`heroTree${index}`);
    if (!tree) return;
    tree.position.set(transform.x, transform.y ?? -0.23, transform.z);
    tree.rotationQuaternion = null;
    tree.rotation.set(0, transform.rotation, 0);
    tree.scaling.set(
      transform.scaleX ?? transform.scale,
      transform.scaleY ?? transform.scale,
      transform.scaleZ ?? transform.scale
    );
    tree.setEnabled(true);
  });

  const fernTransforms = makeScatter(150, WORLD.clearingRadius + 1.5, 50, 8103, 0.7, 1.35, allTrees);
  const shrubTransforms = makeScatter(55, WORLD.clearingRadius + 2.5, 50, 9221, 0.78, 1.35, allTrees);
  // Dense ground cover fills most bare soil while preserving a roughly
  // 7 m open core for the future fire and fallen-tree set piece.
  const grassTransforms = makeScatter(
    760,
    2.8,
    54,
    1619,
    0.46,
    1.05,
    allTrees
  ).map(item => ({
    ...item,
    y: 0.06,
    scaleX: item.scale * 0.72,
    scaleY: item.scale,
    scaleZ: item.scale * 0.72
  }));
  const deadfallRandom = seededRandom(31843);
  const deadfallTransforms = makeScatter(
    18,
    WORLD.clearingRadius + 3,
    50,
    31842,
    0.78,
    1.32,
    allTrees
  ).map(item => ({
    ...item,
    y: -0.20 - deadfallRandom() * 0.22,
    // Keep logs essentially horizontal. Only slight terrain-following tilt.
    rotationX: 0,
    rotationZ: 0
  }));

  // Intentional connected deadfall pairs create longer, irregular silhouettes
  // without needing additional models.
  const joinedDeadfall = [
    { x: 13.5, z: 10.5, y: -0.28, scale: 1.15, rotation: 0.62, rotationX: 0.04, rotationZ: -0.03 },
    { x: 16.0, z: 12.2, y: -0.31, scale: 0.92, rotation: 0.98, rotationX: -0.03, rotationZ: 0.04 },
    { x: -17.5, z: 8.0, y: -0.26, scale: 1.08, rotation: 2.42, rotationX: 0.02, rotationZ: 0.05 },
    { x: -20.0, z: 10.0, y: -0.30, scale: 0.86, rotation: 2.08, rotationX: -0.04, rotationZ: -0.02 },
    { x: 7.0, z: -18.5, y: -0.29, scale: 1.20, rotation: 5.35, rotationX: 0.03, rotationZ: -0.04 },
    { x: 9.1, z: -21.0, y: -0.32, scale: 0.95, rotation: 5.72, rotationX: -0.02, rotationZ: 0.03 }
  ];

  const collapseRandom = seededRandom(40401);
  const centralCollapse = [];

  // A dense, chaotic pile of fallen trunks fills the clearing. Each piece
  // remains close to horizontal, but varies in direction, height and scale so
  // the pile reads as a natural mass collapse instead of a tidy campfire stack.
  for (let index = 0; index < 42; index++) {
    // Bias the collapse toward the east-northeast so the timber mass reaches
    // and merges with one edge of the clearing instead of remaining centered.
    const angle = collapseRandom() * Math.PI * 2;
    const radius = Math.sqrt(collapseRandom()) * 5.4;
    const reach = index >= 30 ? 2.8 + collapseRandom() * 2.8 : 0;
    centralCollapse.push({
      x: Math.cos(angle) * radius + reach * 0.82,
      z: Math.sin(angle) * radius + reach * 0.34,
      y: -0.06 + (index % 5) * 0.16 + collapseRandom() * 0.09,
      scale: 0.86 + collapseRandom() * 0.92,
      scaleX: 0.9 + collapseRandom() * 0.5,
      scaleY: 0.9 + collapseRandom() * 0.22,
      scaleZ: 0.9 + collapseRandom() * 0.35,
      rotation: collapseRandom() * Math.PI * 2,
      rotationX: (collapseRandom() - 0.5) * 0.16,
      rotationZ: (collapseRandom() - 0.5) * 0.16
    });
  }

  deadfallTransforms.push(...joinedDeadfall, ...centralCollapse);

  // Fast horizontal collision solver. It checks only nearby trunk centers and
  // never invokes Babylon's expensive mesh collision pipeline.
  const playerRadius = 0.42;
  const trunkCollisionRadius = 0.48;
  camera.metadata = camera.metadata || {};
  camera.metadata.horizontalCollisionResolver = (current, proposed) => {
    let x = proposed.x;
    let z = proposed.z;

    // Keep the player inside the authored forest boundary.
    const worldLimit = WORLD.forestRadius - 1.5;
    const distanceFromCenter = Math.hypot(x, z);
    if (distanceFromCenter > worldLimit) {
      const scale = worldLimit / distanceFromCenter;
      x *= scale;
      z *= scale;
    }

    // Resolve against trunks with a cheap local circle test. Sliding is done
    // independently on X and Z so contact does not lock movement.
    for (const tree of allTrees) {
      if (Math.abs(tree.x - x) > 2 || Math.abs(tree.z - z) > 2) continue;
      const radius = playerRadius + trunkCollisionRadius * (tree.scaleX ?? tree.scale);
      const dx = x - tree.x;
      const dz = z - tree.z;
      if (dx * dx + dz * dz >= radius * radius) continue;

      const xOnlyDx = x - tree.x;
      const xOnlyDz = current.z - tree.z;
      if (xOnlyDx * xOnlyDx + xOnlyDz * xOnlyDz >= radius * radius) {
        z = current.z;
        continue;
      }

      const zOnlyDx = current.x - tree.x;
      const zOnlyDz = z - tree.z;
      if (zOnlyDx * zOnlyDx + zOnlyDz * zOnlyDz >= radius * radius) {
        x = current.x;
        continue;
      }

      x = current.x;
      z = current.z;
    }

    // Fallen trunks use oriented capsule colliders. This catches the full
    // length of each log while retaining the fast custom movement solver.
    function deadfallDistanceSquared(px, pz, log) {
      if (Math.abs(log.x - px) > 8.5 || Math.abs(log.z - pz) > 8.5) return Infinity;
      const yaw = log.rotation ?? 0;
      const axisX = Math.cos(yaw);
      const axisZ = Math.sin(yaw);
      const halfLength = 2.55 * (log.scaleX ?? log.scale ?? 1);
      const ax = log.x - axisX * halfLength;
      const az = log.z - axisZ * halfLength;
      const bx = log.x + axisX * halfLength;
      const bz = log.z + axisZ * halfLength;
      const abx = bx - ax;
      const abz = bz - az;
      const lengthSquared = Math.max(0.0001, abx * abx + abz * abz);
      const t = Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / lengthSquared));
      const closestX = ax + abx * t;
      const closestZ = az + abz * t;
      const dx = px - closestX;
      const dz = pz - closestZ;
      return dx * dx + dz * dz;
    }

    function intersectsDeadfall(px, pz, log) {
      const radius = playerRadius + 0.34 * (log.scaleZ ?? log.scale ?? 1);
      return deadfallDistanceSquared(px, pz, log) < radius * radius;
    }

    for (const log of deadfallTransforms) {
      if (!intersectsDeadfall(x, z, log)) continue;

      const currentDistance = deadfallDistanceSquared(current.x, current.z, log);
      const proposedDistance = deadfallDistanceSquared(x, z, log);
      const currentInside = intersectsDeadfall(current.x, current.z, log);

      // If a player starts inside a collider, allow movement that increases
      // distance from the log. This prevents the deadfall pile from trapping
      // horizontal movement while still blocking entry from outside.
      if (currentInside && proposedDistance > currentDistance + 0.0001) continue;

      if (!intersectsDeadfall(x, current.z, log)) {
        z = current.z;
        continue;
      }
      if (!intersectsDeadfall(current.x, z, log)) {
        x = current.x;
        continue;
      }
      x = current.x;
      z = current.z;
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

  function updateVisibleVegetation() {
    // Anchor is forced to scale 1 and rotation 0 so relative thin-instance transforms are stable.
    function anchored(items) {
      if (!items.length) return items;
      const first = {
        ...items[0],
        scale: 1,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
        rotation: 0,
        rotationX: 0,
        rotationZ: 0
      };
      return [first, ...items.slice(1)];
    }

    lowTree.setTransforms(anchored(withinDistance(lowTreeTransforms, camera, WORLD.lowTreeViewDistance)));
    fern.setTransforms(anchored(withinDistance(fernTransforms, camera, WORLD.vegetationViewDistance)));
    shrub.setTransforms(anchored(withinDistance(shrubTransforms, camera, WORLD.vegetationViewDistance)));
    grass.setTransforms(anchored(withinDistance(grassTransforms, camera, 34)));
    deadfall.setTransforms(anchored(withinDistance(deadfallTransforms, camera, WORLD.vegetationViewDistance)));
  }

  updateVisibleVegetation();
  let updateTimer = 0;
  scene.onBeforeRenderObservable.add(() => {
    updateTimer += scene.getEngine().getDeltaTime();
    if (updateTimer < 700) return;
    updateTimer = 0;
    updateVisibleVegetation();
    });

  createDebugPanel(scene, counts);
  setStatus("Forest ready");
  setTimeout(() => document.getElementById("loadingScreen")?.remove(), 250);

  const perimeterCandidates = allTrees
    .filter(tree => {
      const distance = Math.hypot(tree.x, tree.z);
      return distance >= WORLD.clearingRadius + 3.2 && distance <= WORLD.clearingRadius + 10.5;
    })
    .sort((a, b) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x));

  // Select trees around the full 360-degree perimeter instead of one cluster.
  const burningTrees = [];
  const burningTreeCount = Math.min(20, perimeterCandidates.length);
  for (let index = 0; index < burningTreeCount; index++) {
    burningTrees.push(
      perimeterCandidates[Math.floor(index * perimeterCandidates.length / burningTreeCount)]
    );
  }

  return {
    counts,
    clearingRadius: WORLD.clearingRadius,
    forestRadius: WORLD.forestRadius,
    fireData: {
      burningTrees,
      collapseCenter: new BABYLON.Vector3(1.4, 0, 0.6),
      centralCollapse
    }
  };
}
