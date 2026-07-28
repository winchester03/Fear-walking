import { startMenuMusic } from "./audio.js";

export function createMainMenu({ onRescue, onFreeRoam }) {
  const menu = document.createElement("div");
  menu.id = "mainMenu";
  menu.innerHTML = `
    <div class="menu-panel" aria-label="Main menu">
      <div class="menu-kicker">BUILD 0.6.0</div>
      <h1>THE FOREST</h1>
      <p>Select a test point.</p>
      <button id="menuRescue" type="button" disabled>RESCUE CUTSCENE</button>
      <button id="menuFreeRoam" type="button" disabled>FREE ROAM</button>
      <div id="audioPrompt" class="menu-note">TAP BEGIN TO START MENU MUSIC</div>
    </div>
    <button id="audioGate" class="audio-gate" type="button" aria-label="Begin">
      <span>TAP TO BEGIN</span>
    </button>
  `;
  document.body.appendChild(menu);

  const rescueButton = menu.querySelector("#menuRescue");
  const freeRoamButton = menu.querySelector("#menuFreeRoam");
  const prompt = menu.querySelector("#audioPrompt");
  const audioGate = menu.querySelector("#audioGate");

  let audioReady = false;
  let transitionRunning = false;

  async function enableMenuAudio(event) {
    event?.preventDefault();
    event?.stopPropagation();
    if (audioReady) return;

    audioGate.disabled = true;
    try {
      await startMenuMusic();
      audioReady = true;
      rescueButton.disabled = false;
      freeRoamButton.disabled = false;
      prompt.textContent = "MENU MUSIC PLAYING";
      audioGate.classList.add("hidden");
    } catch (error) {
      console.error("Menu audio failed", error);
      prompt.textContent = "TAP BEGIN AGAIN TO ENABLE AUDIO";
      audioGate.disabled = false;
    }
  }

  // click is more reliable than pointerdown for preserving the next button's
  // normal click behavior on iOS and desktop browsers.
  audioGate.addEventListener("click", enableMenuAudio);
  window.addEventListener("keydown", event => {
    if (!audioReady && !menu.classList.contains("hidden")) enableMenuAudio(event);
  });

  function run(callback, loadingText) {
    return event => {
      event.preventDefault();
      event.stopPropagation();
      if (!audioReady || transitionRunning) return;

      transitionRunning = true;
      rescueButton.disabled = true;
      freeRoamButton.disabled = true;
      prompt.textContent = loadingText;

      // Hide the menu immediately. The previous build awaited the entire
      // cutscene before hiding it, which made the menu appear frozen while the
      // correct cutscene audio played behind it.
      menu.classList.add("hidden");

      // Preserve the button gesture for audio playback, but yield one frame so
      // the hidden menu is painted before heavier cutscene setup begins.
      Promise.resolve(callback()).catch(error => {
        console.error("Menu selection failed", error);
        transitionRunning = false;
        rescueButton.disabled = false;
        freeRoamButton.disabled = false;
        prompt.textContent = "LOAD FAILED — TAP AGAIN";
        menu.classList.remove("hidden");
      });
    };
  }

  rescueButton.addEventListener("click", run(onRescue, "STARTING RESCUE…"));
  freeRoamButton.addEventListener("click", run(onFreeRoam, "ENTERING FOREST…"));

  return {
    show() {
      transitionRunning = false;
      menu.classList.remove("hidden");
      rescueButton.disabled = !audioReady;
      freeRoamButton.disabled = !audioReady;
      audioGate.disabled = false;
      audioGate.classList.toggle("hidden", audioReady);
      if (audioReady) startMenuMusic();
    },
    hide() {
      menu.classList.add("hidden");
    }
  };
}
