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
  const system = new BABYLON.ParticleSystem(name, options.capacity ?? 120, scene);
  system.particleTexture = texture;
  system.emitter = position.clone();
  const spread = options.spread ?? 0.7;
  system.minEmitBox = new BABYLON.Vector3(-spread, 0, -spread);
  system.maxEmitBox = new BABYLON.Vector3(spread, options.emitHeight ?? 0.35, spread);
  system.color1 = new BABYLON.Color4(1.0, 0.28, 0.018, 0.98);
  system.color2 = new BABYLON.Color4(1.0, 0.82, 0.16, 0.95);
  system.colorDead = new BABYLON.Color4(0.16, 0.01, 0.001, 0);
  system.minSize = options.minSize ?? 0.45;
  system.maxSize = options.maxSize ?? 1.65;
  system.minLifeTime = options.minLifeTime ?? 0.55;
  system.maxLifeTime = options.maxLifeTime ?? 1.55;
  system.emitRate = options.emitRate ?? 85;
  system.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
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
  const system = new BABYLON.ParticleSystem(name, options.capacity ?? 180, scene);
  system.particleTexture = texture;
  system.emitter = position.clone();
  const spread = options.spread ?? 1.2;
  system.minEmitBox = new BABYLON.Vector3(-spread, 0, -spread);
  system.maxEmitBox = new BABYLON.Vector3(spread, 0.6, spread);
  system.color1 = new BABYLON.Color4(0.012, 0.012, 0.014, 0.94);
  system.color2 = new BABYLON.Color4(0.055, 0.045, 0.042, 0.78);
  system.colorDead = new BABYLON.Color4(0.02, 0.018, 0.018, 0);
  system.minSize = options.minSize ?? 1.6;
  system.maxSize = options.maxSize ?? 5.4;
  system.minLifeTime = options.minLifeTime ?? 3.0;
  system.maxLifeTime = options.maxLifeTime ?? 7.2;
  system.emitRate = options.emitRate ?? 30;
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
  const system = new BABYLON.ParticleSystem("clearingEmbers", 320, scene);
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
  system.emitRate = 70;
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

function createFireLight(scene, name, position, range, intensity) {
  const light = new BABYLON.PointLight(name, position.clone(), scene);
  light.diffuse = new BABYLON.Color3(1.0, 0.46, 0.14);
  light.specular = new BABYLON.Color3(0.30, 0.09, 0.018);
  light.range = range;
  light.intensity = intensity;
  light.falloffType = BABYLON.Light.FALLOFF_GLTF;
  light.metadata = { baseIntensity: intensity };
  return light;
}

export function createForestFire(scene, fireData) {
  const flameTexture = createSoftParticleTexture(scene, "proceduralFlameTexture", [
    [0, "rgba(255,255,235,1)"],
    [0.16, "rgba(255,225,70,0.99)"],
    [0.48, "rgba(255,72,5,0.88)"],
    [1, "rgba(55,0,0,0)"]
  ]);
  const smokeTexture = createSoftParticleTexture(scene, "proceduralSmokeTexture", [
    [0, "rgba(55,48,45,0.84)"],
    [0.42, "rgba(24,23,24,0.68)"],
    [1, "rgba(3,3,4,0)"]
  ]);
  const emberTexture = createSoftParticleTexture(scene, "proceduralEmberTexture", [
    [0, "rgba(255,255,225,1)"],
    [0.30, "rgba(255,145,15,1)"],
    [1, "rgba(255,25,0,0)"]
  ]);

  const flameSystems = [];
  const smokeSystems = [];
  const lights = [];
  const perimeterRadius = 10.2;

  // A continuous wall of fire around the full clearing. Twelve overlapping
  // emitters are enough to read as one ring without overwhelming mobile GPUs.
  for (let index = 0; index < 16; index++) {
    const angle = (index / 16) * Math.PI * 2;
    const position = new BABYLON.Vector3(
      Math.cos(angle) * perimeterRadius,
      0.25,
      Math.sin(angle) * perimeterRadius
    );
    flameSystems.push(createFlameSystem(scene, flameTexture, `perimeterFlame${index}`, position, {
      capacity: 170,
      emitRate: 112,
      spread: 1.55,
      emitHeight: 0.6,
      minSize: 0.62,
      maxSize: 3.15,
      minLifeTime: 0.78,
      maxLifeTime: 2.20,
      rise: 8.6
    }));

    if (index % 2 === 0) {
      smokeSystems.push(createSmokeSystem(scene, smokeTexture, `perimeterSmoke${index}`, position.add(new BABYLON.Vector3(0, 2.1, 0)), {
        capacity: 260,
        emitRate: 48,
        spread: 2.25,
        minSize: 2.2,
        maxSize: 8.4,
        minLifeTime: 3.8,
        maxLifeTime: 8.6
      }));
      lights.push(createFireLight(scene, `perimeterLight${index}`, position.add(new BABYLON.Vector3(0, 3.4, 0)), 21, 4.1));
    }
  }

  // Flames climb selected perimeter trunks, matching the reference wall of
  // burning trees while limiting the number of particle systems.
  const burningTrees = fireData?.burningTrees ?? [];
  burningTrees.forEach((tree, index) => {
    if (index % 2 !== 0) return;
    const scaleY = tree.scaleY ?? tree.scale ?? 1;
    flameSystems.push(createFlameSystem(
      scene,
      flameTexture,
      `trunkFlame${index}`,
      new BABYLON.Vector3(tree.x, 2.5 * scaleY, tree.z),
      {
        capacity: 105,
        emitRate: 58,
        spread: 0.54,
        minSize: 0.36,
        maxSize: 1.65,
        minLifeTime: 0.65,
        maxLifeTime: 1.75,
        rise: 7.0
      }
    ));
  });

  // The collapsed timber pile remains ablaze in the middle of the clearing.
  const centralPositions = [
    [-2.1, 0.45, -1.1], [0.2, 0.72, -1.5], [2.0, 0.48, -0.2],
    [-1.25, 0.62, 1.25], [1.15, 0.58, 1.45], [0, 0.9, 0]
  ];
  centralPositions.forEach((item, index) => {
    flameSystems.push(createFlameSystem(
      scene,
      flameTexture,
      `collapseFlame${index}`,
      new BABYLON.Vector3(...item),
      { capacity: 125, emitRate: 78, spread: 0.8, minSize: 0.4, maxSize: 1.5 }
    ));
  });
  smokeSystems.push(createSmokeSystem(scene, smokeTexture, "collapseSmokeA", new BABYLON.Vector3(-1.2, 1.6, 0), {
    capacity: 230, emitRate: 40, spread: 1.5, minSize: 1.5, maxSize: 5.4
  }));
  smokeSystems.push(createSmokeSystem(scene, smokeTexture, "collapseSmokeB", new BABYLON.Vector3(1.2, 1.4, 0.5), {
    capacity: 210, emitRate: 36, spread: 1.4, minSize: 1.4, maxSize: 5.0
  }));
  lights.push(createFireLight(scene, "collapseLightA", new BABYLON.Vector3(-1.6, 2.8, -0.4), 27, 5.8));
  lights.push(createFireLight(scene, "collapseLightB", new BABYLON.Vector3(1.7, 2.5, 0.8), 25, 5.2));
  // Low-cost indirect firelight. These broad, shadowless lights simulate
  // orange light bouncing from the burning perimeter into the clearing and
  // nearby trunks without the cost of hardware ray tracing.
  const bouncePositions = [
    [0, 4.5, -6.2], [6.2, 4.5, 0], [0, 4.5, 6.2], [-6.2, 4.5, 0]
  ];
  bouncePositions.forEach((item, index) => {
    const bounce = createFireLight(
      scene,
      `fireBounce${index}`,
      new BABYLON.Vector3(...item),
      24,
      2.15
    );
    bounce.diffuse = new BABYLON.Color3(0.82, 0.28, 0.075);
    bounce.specular = BABYLON.Color3.Black();
    lights.push(bounce);
  });

  createEmberSystem(scene, emberTexture);

  let time = 0;
  scene.onBeforeRenderObservable.add(() => {
    time += scene.getEngine().getDeltaTime() * 0.001;
    lights.forEach((light, index) => {
      const base = light.metadata.baseIntensity;
      const fast = Math.sin(time * (3.1 + index * 0.17));
      const slow = Math.sin(time * (0.85 + index * 0.07));
      light.intensity = Math.max(0.6, base * (0.94 + fast * 0.045 + slow * 0.055));
    });
  });

  return { flameSystems, smokeSystems, lights };
}
