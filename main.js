import { createGame } from "./game.js";
import { createScene } from "./scene.js";
import { createTerrain } from "./terrain.js";
import { createLighting } from "./lighting.js";
import { createForest } from "./models.js";

const canvas = document.getElementById("gameCanvas");
const { engine, scene } = createGame(canvas);
const { camera } = createScene(scene, canvas);
createTerrain(scene);
const lighting = createLighting(scene, camera);

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());

createForest(scene, camera)
  .then(({ counts }) => {
    lighting.addShadowCasters();
    console.log("Forest ready", counts);
  })
  .catch(error => {
    console.error("Forest failed", error);
    document.getElementById("loadingScreen")?.remove();
    const message = document.createElement("div");
    message.id = "fatalError";
    message.textContent = `LOAD ERROR: ${error.message}`;
    document.body.appendChild(message);
  });
