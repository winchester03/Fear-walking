export function createScene(scene, canvas) {
  const camera = new BABYLON.FreeCamera(
    "forestCamera",
    new BABYLON.Vector3(0, 1.72, -12),
    scene
  );

  camera.setTarget(new BABYLON.Vector3(0, 1.72, 0));
  camera.minZ = 0.05;
  camera.inertia = 0;
  camera.checkCollisions = true;
  camera.applyGravity = true;
  camera.ellipsoid = new BABYLON.Vector3(0.35, 0.82, 0.35);
  camera.ellipsoidOffset = new BABYLON.Vector3(0, 0.82, 0);
  scene.gravity = new BABYLON.Vector3(0, -0.32, 0);
  scene.collisionsEnabled = true;
  scene.activeCamera = camera;


  let pointer = null;
  let targetPoint = null;
  let running = false;
  let stance = "stand";
  let crouchHoldTimer = null;

  const STANCE_HEIGHTS = { stand: 1.72, crouch: 1.18, prone: 0.55 };
  const WALK_SPEED = 3.2;
  const RUN_SPEED = 6.2;
  const ROTATE_THRESHOLD = 10;
  const HOLD_TO_RUN_MS = 260;

  function setStance(next) {
    stance = next;
    const height = STANCE_HEIGHTS[stance];
    camera.ellipsoid.y = Math.max(0.28, height * 0.48);
    camera.ellipsoidOffset.y = camera.ellipsoid.y;
    const button = document.getElementById("stanceButton");
    if (button) button.textContent = stance === "stand" ? "CROUCH" : stance.toUpperCase();
  }

  function pickWalkTarget(event) {
    const pick = scene.pick(event.clientX, event.clientY, mesh => mesh.name === "forestGround");
    if (pick?.hit && pick.pickedPoint) {
      targetPoint = pick.pickedPoint.clone();
      targetPoint.y = camera.position.y;
    }
  }

  canvas.addEventListener("pointerdown", event => {
    if (event.target !== canvas) return;
    event.preventDefault();
    pointer = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
      holdTimer: setTimeout(() => {
        if (pointer && !pointer.moved && targetPoint) running = true;
      }, HOLD_TO_RUN_MS)
    };
    canvas.setPointerCapture?.(event.pointerId);
  });

  canvas.addEventListener("pointermove", event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const total = Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY);
    if (total > ROTATE_THRESHOLD) pointer.moved = true;
    if (pointer.moved) {
      camera.rotation.y += (event.clientX - pointer.lastX) * 0.004;
      camera.rotation.x += (event.clientY - pointer.lastY) * 0.004;
      camera.rotation.x = BABYLON.Scalar.Clamp(camera.rotation.x, -1.42, 1.42);
    }
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;
  });

  function endPointer(event) {
    if (!pointer || event.pointerId !== pointer.id) return;
    clearTimeout(pointer.holdTimer);
    if (!pointer.moved) pickWalkTarget(event);
    running = false;
    canvas.releasePointerCapture?.(event.pointerId);
    pointer = null;
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);

  const stanceButton = document.createElement("button");
  stanceButton.id = "stanceButton";
  stanceButton.textContent = "CROUCH";
  document.body.appendChild(stanceButton);

  stanceButton.addEventListener("pointerdown", event => {
    event.preventDefault();
    event.stopPropagation();
    crouchHoldTimer = setTimeout(() => {
      setStance("prone");
      crouchHoldTimer = null;
    }, 520);
  });

  stanceButton.addEventListener("pointerup", event => {
    event.preventDefault();
    event.stopPropagation();
    if (crouchHoldTimer) {
      clearTimeout(crouchHoldTimer);
      crouchHoldTimer = null;
      setStance(stance === "stand" ? "crouch" : "stand");
    }
  });
  stanceButton.addEventListener("pointercancel", () => {
    if (crouchHoldTimer) clearTimeout(crouchHoldTimer);
    crouchHoldTimer = null;
  });

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
    if (targetPoint) {
      const delta = targetPoint.subtract(camera.position);
      delta.y = 0;
      const distance = delta.length();
      if (distance < 0.35) {
        targetPoint = null;
        running = false;
      } else {
        const stanceMultiplier = stance === "prone" ? 0.34 : stance === "crouch" ? 0.62 : 1;
        const speed = (running ? RUN_SPEED : WALK_SPEED) * stanceMultiplier;
        const movement = delta.normalize().scale(Math.min(speed * dt, distance));
        camera.moveWithCollisions(movement);
      }
    }

    const desired = STANCE_HEIGHTS[stance];
    camera.position.y += (desired - camera.position.y) * Math.min(1, dt * 8);
  });

  return { camera, getStance: () => stance };
}
