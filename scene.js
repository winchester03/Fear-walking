export function createScene(scene, canvas) {
  const camera = new BABYLON.FreeCamera(
    "forestCamera",
    new BABYLON.Vector3(0, 2, -5.5),
    scene
  );

  camera.setTarget(new BABYLON.Vector3(0, 2, 0));
  camera.minZ = 0.05;
  camera.inertia = 0;
  // Build 0.4.1 uses a lightweight 2D collision solver in models.js.
  // Babylon mesh collisions were causing the browser to stall on horizontal input.
  camera.checkCollisions = false;
  camera.applyGravity = false;
  camera.metadata = camera.metadata || {};
  camera.metadata.horizontalCollisionResolver = null;

  scene.activeCamera = camera;

  let activePointer = null;
  let lastX = 0;
  let lastY = 0;
  const lookSensitivity = 0.004;

  canvas.addEventListener("pointerdown", event => {
    activePointer = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture?.(event.pointerId);
  });

  canvas.addEventListener("pointermove", event => {
    if (event.pointerId !== activePointer) return;
    camera.rotation.y += (event.clientX - lastX) * lookSensitivity;
    camera.rotation.x += (event.clientY - lastY) * lookSensitivity;
    camera.rotation.x = BABYLON.Scalar.Clamp(camera.rotation.x, -1.45, 1.45);
    lastX = event.clientX;
    lastY = event.clientY;
  });

  function stopLooking(event) {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    canvas.releasePointerCapture?.(event.pointerId);
  }
  canvas.addEventListener("pointerup", stopLooking);
  canvas.addEventListener("pointercancel", stopLooking);

  const movement = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false
  };

  function createButton(label, bottom, side, sideDistance, action) {
    const button = document.createElement("button");
    button.textContent = label;
    Object.assign(button.style, {
      position: "fixed",
      bottom,
      width: "58px",
      height: "58px",
      borderRadius: "29px",
      border: "1px solid rgba(255,255,255,.35)",
      background: "rgba(0,0,0,.55)",
      color: "white",
      fontSize: "13px",
      zIndex: "20",
      touchAction: "none",
      userSelect: "none",
      webkitUserSelect: "none",
      webkitTouchCallout: "none"
    });
    button.style[side] = sideDistance;
    button.draggable = false;

    const setPressed = (event, pressed) => {
      event.preventDefault();
      event.stopPropagation();
      movement[action] = pressed;
      button.style.background = pressed ? "rgba(80,150,220,.7)" : "rgba(0,0,0,.55)";
    };
    button.addEventListener("pointerdown", event => setPressed(event, true));
    ["pointerup", "pointercancel", "pointerleave"].forEach(type =>
      button.addEventListener(type, event => setPressed(event, false))
    );
    document.body.appendChild(button);
  }

  createButton("FWD", "100px", "left", "76px", "forward");
  createButton("BACK", "26px", "left", "76px", "backward");
  createButton("LEFT", "63px", "left", "10px", "left");
  createButton("RIGHT", "63px", "left", "142px", "right");
  createButton("UP", "100px", "right", "22px", "up");
  createButton("DOWN", "26px", "right", "22px", "down");

  const keyboardMap = {
    KeyW: "forward", ArrowUp: "forward",
    KeyS: "backward", ArrowDown: "backward",
    KeyA: "left", ArrowLeft: "left",
    KeyD: "right", ArrowRight: "right",
    Space: "up", ShiftLeft: "down", ShiftRight: "down"
  };
  window.addEventListener("keydown", event => {
    const action = keyboardMap[event.code];
    if (action) { movement[action] = true; event.preventDefault(); }
  });
  window.addEventListener("keyup", event => {
    const action = keyboardMap[event.code];
    if (action) { movement[action] = false; event.preventDefault(); }
  });
  window.addEventListener("blur", () => Object.keys(movement).forEach(key => movement[key] = false));

  scene.onBeforeRenderObservable.add(() => {
    const deltaTime = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
    const distance = 8 * deltaTime;

    const forward = camera.getDirection(BABYLON.Axis.Z);
    const right = camera.getDirection(BABYLON.Axis.X);
    forward.y = 0;
    right.y = 0;
    forward.normalize();
    right.normalize();

    const movementVector = BABYLON.Vector3.Zero();
    if (movement.forward) movementVector.addInPlace(forward);
    if (movement.backward) movementVector.subtractInPlace(forward);
    if (movement.left) movementVector.subtractInPlace(right);
    if (movement.right) movementVector.addInPlace(right);

    if (movementVector.lengthSquared() > 0) {
      movementVector.normalize().scaleInPlace(distance);
      const proposed = camera.position.add(movementVector);
      const resolver = camera.metadata?.horizontalCollisionResolver;
      const resolved = typeof resolver === "function"
        ? resolver(camera.position, proposed)
        : proposed;
      camera.position.x = resolved.x;
      camera.position.z = resolved.z;
    }

    if (movement.up) camera.position.y += distance;
    if (movement.down) camera.position.y -= distance;
    camera.position.y = Math.max(0.4, camera.position.y);
  });

  return { camera };
}
