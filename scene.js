export function createScene(scene, canvas) {
  const camera = new BABYLON.FreeCamera(
    "forestCamera",
    new BABYLON.Vector3(0, 1.68, -7.8),
    scene
  );

  camera.setTarget(new BABYLON.Vector3(0, 1.68, 0));
  camera.minZ = 0.05;
  camera.inertia = 0;
  camera.checkCollisions = false;
  camera.applyGravity = false;
  camera.metadata = camera.metadata || {};
  camera.metadata.horizontalCollisionResolver = null;
  camera.metadata.controlsEnabled = true;
  scene.activeCamera = camera;

  const state = {
    destination: null,
    posture: "standing",
    runHeld: false,
    pointerId: null,
    pointerDownAt: 0,
    pointerDownX: 0,
    pointerDownY: 0,
    lastX: 0,
    lastY: 0,
    dragged: false,
    longPressTimer: null
  };

  const postureHeights = {
    standing: 1.68,
    crouching: 1.08,
    prone: 0.48
  };

  function setDestinationFromPointer(event) {
    const pick = scene.pick(event.clientX, event.clientY, mesh => mesh.name === "forestGround");
    if (!pick?.hit || !pick.pickedPoint) return;
    state.destination = pick.pickedPoint.clone();
    state.destination.y = camera.position.y;
  }

  canvas.addEventListener("pointerdown", event => {
    if (event.button !== undefined && event.button !== 0) return;
    state.pointerId = event.pointerId;
    state.pointerDownAt = performance.now();
    state.pointerDownX = state.lastX = event.clientX;
    state.pointerDownY = state.lastY = event.clientY;
    state.dragged = false;
    canvas.setPointerCapture?.(event.pointerId);

    clearTimeout(state.longPressTimer);
    state.longPressTimer = setTimeout(() => {
      if (state.pointerId === event.pointerId && state.destination) {
        state.runHeld = true;
      }
    }, 180);
  });

  canvas.addEventListener("pointermove", event => {
    if (event.pointerId !== state.pointerId) return;
    const totalDistance = Math.hypot(
      event.clientX - state.pointerDownX,
      event.clientY - state.pointerDownY
    );
    if (totalDistance > 10) state.dragged = true;

    if (state.dragged) {
      const sensitivity = 0.004;
      camera.rotation.y += (event.clientX - state.lastX) * sensitivity;
      camera.rotation.x += (event.clientY - state.lastY) * sensitivity;
      camera.rotation.x = BABYLON.Scalar.Clamp(camera.rotation.x, -1.35, 1.35);
    }
    state.lastX = event.clientX;
    state.lastY = event.clientY;
  });

  function releasePointer(event) {
    if (event.pointerId !== state.pointerId) return;
    clearTimeout(state.longPressTimer);
    const heldFor = performance.now() - state.pointerDownAt;
    if (!state.dragged && heldFor < 180) setDestinationFromPointer(event);
    state.runHeld = false;
    state.pointerId = null;
    canvas.releasePointerCapture?.(event.pointerId);
  }

  canvas.addEventListener("pointerup", releasePointer);
  canvas.addEventListener("pointercancel", releasePointer);

  const crouchButton = document.createElement("button");
  crouchButton.id = "crouchButton";
  crouchButton.type = "button";
  crouchButton.textContent = "CROUCH";
  crouchButton.setAttribute("aria-label", "Crouch. Hold to go prone.");
  document.body.appendChild(crouchButton);

  let crouchPointer = null;
  let crouchLongPress = false;
  let crouchTimer = null;

  function refreshCrouchLabel() {
    crouchButton.textContent = state.posture === "standing"
      ? "CROUCH"
      : state.posture === "crouching"
        ? "STAND"
        : "GET UP";
    crouchButton.dataset.posture = state.posture;
  }

  crouchButton.addEventListener("pointerdown", event => {
    event.preventDefault();
    event.stopPropagation();
    crouchPointer = event.pointerId;
    crouchLongPress = false;
    crouchButton.setPointerCapture?.(event.pointerId);
    crouchTimer = setTimeout(() => {
      if (crouchPointer !== event.pointerId) return;
      state.posture = "prone";
      crouchLongPress = true;
      refreshCrouchLabel();
    }, 500);
  });

  function releaseCrouch(event) {
    if (event.pointerId !== crouchPointer) return;
    clearTimeout(crouchTimer);
    if (!crouchLongPress) {
      state.posture = state.posture === "standing" ? "crouching" : "standing";
      refreshCrouchLabel();
    }
    crouchPointer = null;
    crouchButton.releasePointerCapture?.(event.pointerId);
  }

  crouchButton.addEventListener("pointerup", releaseCrouch);
  crouchButton.addEventListener("pointercancel", releaseCrouch);
  refreshCrouchLabel();

  window.addEventListener("keydown", event => {
    if (event.code === "KeyC") {
      state.posture = state.posture === "standing" ? "crouching" : "standing";
      refreshCrouchLabel();
    }
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") state.runHeld = true;
  });
  window.addEventListener("keyup", event => {
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") state.runHeld = false;
  });

  scene.onBeforeRenderObservable.add(() => {
    const deltaTime = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
    const targetHeight = postureHeights[state.posture];
    camera.position.y = BABYLON.Scalar.Lerp(camera.position.y, targetHeight, Math.min(1, deltaTime * 8));

    if (!state.destination) return;

    const dx = state.destination.x - camera.position.x;
    const dz = state.destination.z - camera.position.z;
    const remaining = Math.hypot(dx, dz);
    if (remaining < 0.18) {
      state.destination = null;
      state.runHeld = false;
      return;
    }

    let speed = 3.0;
    if (state.posture === "crouching") speed = 1.65;
    if (state.posture === "prone") speed = 0.75;
    if (state.runHeld && state.posture === "standing") speed = 6.2;

    const step = Math.min(remaining, speed * deltaTime);
    const proposed = new BABYLON.Vector3(
      camera.position.x + (dx / remaining) * step,
      camera.position.y,
      camera.position.z + (dz / remaining) * step
    );
    const resolver = camera.metadata?.horizontalCollisionResolver;
    const resolved = typeof resolver === "function"
      ? resolver(camera.position, proposed)
      : proposed;

    const moved = Math.hypot(resolved.x - camera.position.x, resolved.z - camera.position.z);
    camera.position.x = resolved.x;
    camera.position.z = resolved.z;

    if (moved < 0.001) state.destination = null;
  });

  return { camera };
}
