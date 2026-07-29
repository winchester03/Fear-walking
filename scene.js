export function createScene(scene, canvas) {
  const camera = new BABYLON.FreeCamera(
    "forestCamera",
    new BABYLON.Vector3(0, 2, -12),
    scene
  );

  camera.setTarget(
    new BABYLON.Vector3(0, 2, 0)
  );

  camera.minZ = 0.05;
  camera.inertia = 0;
  camera.checkCollisions = false;
  camera.applyGravity = false;

  scene.activeCamera = camera;

  // Lightweight post-process antialiasing for foliage edges and distant trees.
  const fxaa = new BABYLON.FxaaPostProcess(
    "forestFxaa",
    1.0,
    camera
  );
  fxaa.samples = 1;

  let activePointer = null;
  let lastX = 0;
  let lastY = 0;

  const lookSensitivity = 0.004;

  canvas.addEventListener("pointerdown", event => {
    activePointer = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;

    canvas.setPointerCapture?.(
      event.pointerId
    );
  });

  canvas.addEventListener("pointermove", event => {
    if (event.pointerId !== activePointer) {
      return;
    }

    const movementX =
      event.clientX - lastX;

    const movementY =
      event.clientY - lastY;

    camera.rotation.y +=
      movementX * lookSensitivity;

    camera.rotation.x +=
      movementY * lookSensitivity;

    camera.rotation.x =
      BABYLON.Scalar.Clamp(
        camera.rotation.x,
        -1.45,
        1.45
      );

    lastX = event.clientX;
    lastY = event.clientY;
  });

  function stopLooking(event) {
    if (event.pointerId !== activePointer) {
      return;
    }

    activePointer = null;

    canvas.releasePointerCapture?.(
      event.pointerId
    );
  }

  canvas.addEventListener(
    "pointerup",
    stopLooking
  );

  canvas.addEventListener(
    "pointercancel",
    stopLooking
  );

  const movement = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false
  };

  function createButton(
    label,
    bottom,
    side,
    sideDistance,
    action
  ) {
    const button =
      document.createElement("button");

    button.textContent = label;

    button.style.position = "fixed";
    button.style.bottom = bottom;
    button.style[side] = sideDistance;
    button.style.width = "58px";
    button.style.height = "58px";
    button.style.borderRadius = "29px";
    button.style.border =
      "1px solid rgba(255,255,255,.35)";
    button.style.background =
      "rgba(0,0,0,.55)";
    button.style.color = "white";
    button.style.fontSize = "13px";
    button.style.zIndex = "20";
    button.style.touchAction = "none";
    button.style.userSelect = "none";
    button.style.webkitUserSelect = "none";
    button.style.webkitTouchCallout = "none";
    button.draggable = false;

    function press(event) {
      event.preventDefault();
      event.stopPropagation();

      movement[action] = true;

      button.style.background =
        "rgba(80,150,220,.7)";
    }

    function release(event) {
      event.preventDefault();
      event.stopPropagation();

      movement[action] = false;

      button.style.background =
        "rgba(0,0,0,.55)";
    }

    button.addEventListener(
      "pointerdown",
      press
    );

    button.addEventListener(
      "pointerup",
      release
    );

    button.addEventListener(
      "pointercancel",
      release
    );

    button.addEventListener(
      "pointerleave",
      release
    );

    document.body.appendChild(button);

    return button;
  }

  createButton(
    "FWD",
    "100px",
    "left",
    "76px",
    "forward"
  );

  createButton(
    "BACK",
    "26px",
    "left",
    "76px",
    "backward"
  );

  createButton(
    "LEFT",
    "63px",
    "left",
    "10px",
    "left"
  );

  createButton(
    "RIGHT",
    "63px",
    "left",
    "142px",
    "right"
  );

  createButton(
    "UP",
    "100px",
    "right",
    "22px",
    "up"
  );

  createButton(
    "DOWN",
    "26px",
    "right",
    "22px",
    "down"
  );

  scene.onBeforeRenderObservable.add(() => {
    const deltaTime =
      scene.getEngine().getDeltaTime() /
      1000;

    const speed = 8;
    const distance =
      speed * deltaTime;

    const forward =
      camera.getDirection(
        BABYLON.Axis.Z
      );

    const right =
      camera.getDirection(
        BABYLON.Axis.X
      );

    if (movement.forward) {
      camera.position.addInPlace(
        forward.scale(distance)
      );
    }

    if (movement.backward) {
      camera.position.subtractInPlace(
        forward.scale(distance)
      );
    }

    if (movement.left) {
      camera.position.subtractInPlace(
        right.scale(distance)
      );
    }

    if (movement.right) {
      camera.position.addInPlace(
        right.scale(distance)
      );
    }

    if (movement.up) {
      camera.position.y += distance;
    }

    if (movement.down) {
      camera.position.y -= distance;
    }

    // Prevent flying underneath the ground.
    camera.position.y =
      Math.max(
        0.4,
        camera.position.y
      );
  });

  return {
    camera
  };
}