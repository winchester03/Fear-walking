function createSoftParticleTexture(scene, name, stops) {
  const texture = new BABYLON.DynamicTexture(name, { width: 64, height: 64 }, scene, false);
  const context = texture.getContext();
  context.clearRect(0, 0, 64, 64);
  const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 31);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  texture.hasAlpha = true;
  texture.update(false);
  return texture;
}

function createFlameSystem(scene, texture, name, position, options = {}) {
  const system = new BABYLON.ParticleSystem(name, options.capacity ?? 64, scene);
  system.particleTexture = texture;
  system.emitter = position.clone();
  const spread = options.spread ?? 0.7;
  system.minEmitBox = new BABYLON.Vector3(-spread, 0, -spread);
  system.maxEmitBox = new BABYLON.Vector3(spread, options.emitHeight ?? 0.35, spread);
  system.color1 = new BABYLON.Color4(1.0, 0.82, 0.16, 0.96);
  system.color2 = new BABYLON.Color4(1.0, 0.48, 0.045, 0.91);
  system.colorDead = new BABYLON.Color4(0.42, 0.09, 0.004, 0);
  system.minSize = options.minSize ?? 0.45;
  system.maxSize = options.maxSize ?? 1.65;
  system.minLifeTime = options.minLifeTime ?? 0.55;
  system.maxLifeTime = options.maxLifeTime ?? 1.55;
  system.emitRate = options.emitRate ?? 42;
  system.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
  system.forceDepthWrite = false;
  system.direction1 = new BABYLON.Vector3(-0.28, 1.75, -0.28);
  system.direction2 = new BABYLON.Vector3(0.28, options.rise ?? 4.7, 0.28);
  system.minAngularSpeed = -0.65;
  system.maxAngularSpeed = 0.65;
  system.minEmitPower = 0.7;
  system.maxEmitPower = 1.45;
  system.updateSpeed = 0.009;
  system.gravity = new BABYLON.Vector3(0.08, 0.72, 0.03);
  system.start();
  return system;
}

function createSmokeSystem(scene, texture, name, position, options = {}) {
  const system = new BABYLON.ParticleSystem(name, options.capacity ?? 48, scene);
  system.particleTexture = texture;
  system.emitter = position.clone();
  const spread = options.spread ?? 1.2;
  system.minEmitBox = new BABYLON.Vector3(-spread, 0, -spread);
  system.maxEmitBox = new BABYLON.Vector3(spread, 0.6, spread);
  system.color1 = new BABYLON.Color4(0.018, 0.017, 0.018, 0.32);
  system.color2 = new BABYLON.Color4(0.055, 0.050, 0.047, 0.20);
  system.colorDead = new BABYLON.Color4(0.02, 0.018, 0.018, 0);
  system.minSize = options.minSize ?? 1.25;
  system.maxSize = options.maxSize ?? 4.0;
  system.minLifeTime = options.minLifeTime ?? 2.4;
  system.maxLifeTime = options.maxLifeTime ?? 5.2;
  system.emitRate = options.emitRate ?? 6;
  system.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
  system.direction1 = new BABYLON.Vector3(-0.5, 1.2, -0.4);
  system.direction2 = new BABYLON.Vector3(0.9, 2.5, 0.65);
  system.minAngularSpeed = -0.28;
  system.maxAngularSpeed = 0.28;
  system.minEmitPower = 0.65;
  system.maxEmitPower = 1.3;
  system.updateSpeed = 0.018;
  system.gravity = new BABYLON.Vector3(0.16, 0.32, 0.05);
  system.start();
  return system;
}

function createEmberSystem(scene, texture) {
  const system = new BABYLON.ParticleSystem("clearingEmbers", 88, scene);
  system.particleTexture = texture;
  system.emitter = new BABYLON.Vector3(0, 0.5, 0);
  system.minEmitBox = new BABYLON.Vector3(-10.5, 0.1, -10.5);
  system.maxEmitBox = new BABYLON.Vector3(10.5, 3.0, 10.5);
  system.color1 = new BABYLON.Color4(1, 0.27, 0.01, 1);
  system.color2 = new BABYLON.Color4(1, 0.9, 0.2, 1);
  system.colorDead = new BABYLON.Color4(0.25, 0.02, 0, 0);
  system.minSize = 0.025;
  system.maxSize = 0.10;
  system.minLifeTime = 1.0;
  system.maxLifeTime = 4.2;
  system.emitRate = 17;
  system.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
  system.direction1 = new BABYLON.Vector3(-1.1, 1.5, -1.0);
  system.direction2 = new BABYLON.Vector3(1.5, 5.5, 1.4);
  system.minEmitPower = 0.6;
  system.maxEmitPower = 1.5;
  system.gravity = new BABYLON.Vector3(0.24, 0.15, 0.06);
  system.updateSpeed = 0.016;
  system.start();
  return system;
}

function createGroundEmbers(scene, texture) {
  const material = new BABYLON.StandardMaterial("groundEmberMaterial", scene);
  material.diffuseColor = BABYLON.Color3.Black();
  material.specularColor = BABYLON.Color3.Black();
  material.emissiveColor = new BABYLON.Color3(1.0, 0.105, 0.008);
  material.disableLighting = true;

  const ember = BABYLON.MeshBuilder.CreateSphere(
    "groundEmberSource",
    { diameter: 0.11, segments: 4 },
    scene
  );
  ember.material = material;
  ember.isPickable = false;

  const random = (() => {
    let state = 94517;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  })();

  const matrices = new Float32Array(140 * 16);
  let offset = 0;
  for (let index = 0; index < 140; index++) {
    const angle = random() * Math.PI * 2;
    const radius = 1.1 + Math.sqrt(random()) * 9.5;
    const scale = 0.32 + random() * 0.95;
    const glow = index % 7 === 0 ? 1.8 : 1.0;
    BABYLON.Matrix.Compose(
      new BABYLON.Vector3(scale * glow, 0.18, scale),
      BABYLON.Quaternion.RotationYawPitchRoll(random() * Math.PI, 0, 0),
      new BABYLON.Vector3(Math.cos(angle) * radius, 0.045 + random() * 0.025, Math.sin(angle) * radius)
    ).copyToArray(matrices, offset);
    offset += 16;
  }
  ember.thinInstanceSetBuffer("matrix", matrices, 16, true);
  ember.thinInstanceRefreshBoundingInfo(true);

  let time = 0;
  let emberFrame = 0;
  scene.onBeforeRenderObservable.add(() => {
    time += scene.getEngine().getDeltaTime() * 0.001;
    emberFrame = (emberFrame + 1) % 3;
    if (emberFrame !== 0) return;
    material.emissiveColor.set(
      0.72 + Math.sin(time * 1.7) * 0.12,
      0.055 + Math.sin(time * 2.1) * 0.018,
      0.002
    );
  });
  return ember;
}

function createFireLight(scene, name, position, range, intensity) {
  const light = new BABYLON.PointLight(name, position.clone(), scene);
  light.diffuse = new BABYLON.Color3(1.0, 0.70, 0.30);
  light.specular = new BABYLON.Color3(0.28, 0.16, 0.045);
  light.range = range;
  light.intensity = intensity;
  light.falloffType = BABYLON.Light.FALLOFF_GLTF;
  light.metadata = { baseIntensity: intensity };
  return light;
}

export function createForestFire(scene, fireData) {
  const flameTexture = createSoftParticleTexture(scene, "proceduralFlameTexture", [
    [0, "rgba(255,255,225,1)"],
    [0.22, "rgba(255,224,92,0.99)"],
    [0.62, "rgba(255,143,18,0.78)"],
    [1, "rgba(105,30,0,0)"]
  ]);
  const smokeTexture = createSoftParticleTexture(scene, "proceduralSmokeTexture", [
    [0, "rgba(55,50,48,0.72)"],
    [0.45, "rgba(25,24,25,0.50)"],
    [1, "rgba(4,4,5,0)"]
  ]);
  const emberTexture = createSoftParticleTexture(scene, "proceduralEmberTexture", [
    [0, "rgba(255,255,225,1)"],
    [0.30, "rgba(255,145,15,1)"],
    [1, "rgba(255,25,0,0)"]
  ]);

  const flameSystems = [];
  const smokeSystems = [];
  const lights = [];
  let seed = 607047;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Uneven perimeter arcs. Gaps reveal intact trees and darkness; radial
  // jitter and nonuniform angular spacing stop the fire reading as a circle.
  const clusters = [];
  let angle = random() * 0.4;
  for (let index = 0; index < 15; index++) {
    angle += 0.18 + random() * 0.33;
    // Intentional large gaps at the north and southwest portions.
    if ((angle > 1.25 && angle < 1.70) || (angle > 3.75 && angle < 4.18)) continue;
    const radius = 12.4 + (random() - 0.5) * 2.8;
    clusters.push({
      position: new BABYLON.Vector3(Math.cos(angle) * radius, 0.18, Math.sin(angle) * radius),
      width: 0.48 + random() * 1.35,
      height: 0.72 + random() * 1.85,
      density: 18 + Math.floor(random() * 28),
      leanX: (random() - 0.5) * 0.8,
      leanZ: (random() - 0.5) * 0.8
    });
  }

  clusters.forEach((cluster, index) => {
    const system = createFlameSystem(scene, flameTexture, `wildfireCluster${index}`, cluster.position, {
      capacity: 50 + Math.floor(cluster.density * 1.25),
      emitRate: cluster.density,
      spread: cluster.width,
      emitHeight: 0.22 + random() * 0.62,
      minSize: 0.30 + random() * 0.34,
      maxSize: 1.10 + cluster.height,
      minLifeTime: 0.62 + random() * 0.35,
      maxLifeTime: 1.30 + cluster.height * 0.62,
      rise: 4.0 + cluster.height * 2.5
    });
    system.direction1.x += cluster.leanX;
    system.direction2.x += cluster.leanX;
    system.direction1.z += cluster.leanZ;
    system.direction2.z += cluster.leanZ;
    system.minAngularSpeed = -0.35 - random() * 0.35;
    system.maxAngularSpeed = 0.35 + random() * 0.35;
    flameSystems.push(system);

    if (false) {
      smokeSystems.push(createSmokeSystem(scene, smokeTexture, `wildfireSmoke${index}`, cluster.position.add(new BABYLON.Vector3(0, 1.8, 0)), {
        capacity: 50,
        emitRate: 3 + random() * 3,
        spread: cluster.width * 0.78,
        minSize: 1.0,
        maxSize: 2.7 + random() * 1.2,
        minLifeTime: 2.2,
        maxLifeTime: 4.4
      }));
    }
    if (index % 5 === 0) {
      lights.push(createFireLight(scene, `wildfireLight${index}`, cluster.position.add(new BABYLON.Vector3(0, 2.5, 0)), 11 + random() * 4, 2.0 + random() * 1.4));
    }
  });

  // Selected trees receive flames at different heights, widths and offsets.
  const burningTrees = fireData?.burningTrees ?? [];
  burningTrees.forEach((tree, index) => {
    if (random() < 0.58) return;
    const scaleY = tree.scaleY ?? tree.scale ?? 1;
    const verticalOffset = 1.2 + random() * 4.5;
    const trunkFire = createFlameSystem(scene, flameTexture, `treeFire${index}`, new BABYLON.Vector3(
      tree.x + (random() - 0.5) * 0.45,
      verticalOffset * scaleY,
      tree.z + (random() - 0.5) * 0.45
    ), {
      capacity: 32 + Math.floor(random() * 35),
      emitRate: 12 + random() * 20,
      spread: 0.22 + random() * 0.56,
      minSize: 0.22 + random() * 0.32,
      maxSize: 0.72 + random() * 1.28,
      minLifeTime: 0.55,
      maxLifeTime: 1.25 + random() * 0.8,
      rise: 4.5 + random() * 3.2
    });
    flameSystems.push(trunkFire);
  });

  // The enlarged deadfall mass burns in scattered pockets from the center to
  // the eastern edge, rather than as six identical flames in a tidy cluster.
  const logs = fireData?.centralCollapse ?? [];
  const selected = logs.filter((_, index) => index % 3 !== 1).slice(0, 14);
  selected.forEach((log, index) => {
    const p = new BABYLON.Vector3(log.x + (random() - 0.5) * 0.8, Math.max(0.25, log.y + 0.45), log.z + (random() - 0.5) * 0.8);
    flameSystems.push(createFlameSystem(scene, flameTexture, `deadfallFire${index}`, p, {
      capacity: 32 + Math.floor(random() * 34),
      emitRate: 13 + random() * 21,
      spread: 0.30 + random() * 0.75,
      minSize: 0.24 + random() * 0.20,
      maxSize: 0.85 + random() * 1.15,
      minLifeTime: 0.62,
      maxLifeTime: 1.45 + random() * 0.55,
      rise: 4.2 + random() * 2.7
    }));
  });

  // Smoke sprites disabled in 0.6.0: several mobile GPUs rendered them as green clusters.
  lights.push(createFireLight(scene, "deadfallLightWest", new BABYLON.Vector3(-1.1, 2.5, -0.2), 15, 3.3));
  lights.push(createFireLight(scene, "deadfallLightEast", new BABYLON.Vector3(4.5, 2.7, 1.7), 17, 3.7));

  createEmberSystem(scene, emberTexture);
  createGroundEmbers(scene, emberTexture);

  let time = 0;
  let lightFrame = 0;
  scene.onBeforeRenderObservable.add(() => {
    time += scene.getEngine().getDeltaTime() * 0.001;
    lightFrame = (lightFrame + 1) % 3;
    if (lightFrame !== 0) return;
    lights.forEach((light, index) => {
      const base = light.metadata.baseIntensity;
      const slow = Math.sin(time * (0.72 + index * 0.09));
      const secondary = Math.sin(time * (1.55 + index * 0.13));
      light.intensity = Math.max(0.45, base * (0.94 + slow * 0.055 + secondary * 0.025));
    });
  });

  return { flameSystems, smokeSystems, lights };
}
