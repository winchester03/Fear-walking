import { createGame } from "./game.js";
import { createScene } from "./scene.js";
import { createTerrain } from "./terrain.js";
import { createLighting } from "./lighting.js";
import { createForest } from "./models.js";
import { createForestFire } from "./fire.js";

const canvas = document.getElementById("gameCanvas");
const { engine, scene } = createGame(canvas);
const { camera } = createScene(scene, canvas);

createTerrain(scene);
createLighting(scene);

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());

createForest(scene, camera)
  .then(({ counts, fireData }) => {
    createForestFire(scene, fireData);
    console.log("Forest and fire ready", counts);
  })
  .catch(error => {
    console.error("Forest failed", error);
    document.getElementById("loadingScreen")?.remove();
    const message = document.createElement("div");
    message.id = "fatalError";
    message.textContent = `LOAD ERROR: ${error.message}`;
    document.body.appendChild(message);
  });
