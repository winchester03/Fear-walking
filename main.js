import { createGame } from "./game.js";
import { createScene } from "./scene.js";
import { createTerrain } from "./terrain.js";
import { createLighting } from "./lighting.js";
import { createForest } from "./models.js";
import { createNightSky } from "./sky.js";

const canvas = document.getElementById("gameCanvas");
const { engine, scene } = createGame(canvas);
const { camera } = createScene(scene, canvas);

createTerrain(scene);
const lighting = createLighting(scene);
createNightSky(scene, lighting.cycle, camera);

const clock = document.createElement("div");
clock.id = "dayClock";
document.body.appendChild(clock);
let clockElapsed = 0;
scene.onBeforeRenderObservable.add(() => {
  clockElapsed += engine.getDeltaTime();
  if (clockElapsed < 250) return;
  clockElapsed = 0;
  const hours = Math.floor(lighting.cycle.timeOfDay);
  const minutes = Math.floor((lighting.cycle.timeOfDay - hours) * 60);
  clock.textContent = `${lighting.cycle.phase}  ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());

createForest(scene, camera)
  .then(({ counts }) => {
    console.log("Fear Walking 0.0.6 forest ready", counts);
    document.getElementById("loadingScreen")?.remove();
  })
  .catch(error => {
    console.error("Forest failed", error);
    document.getElementById("loadingScreen")?.remove();
    const message = document.createElement("div");
    message.id = "fatalError";
    message.textContent = `LOAD ERROR: ${error.message}`;
    document.body.appendChild(message);
  });
