# The Forest — Build 0.4.8

Changes:
- Fixed horizontal movement lock caused by spawning inside overlapping deadfall colliders.
- Added escape-aware collision handling while preserving collisions on fallen trunks.
- Moved the player spawn away from the densest part of the central collapse.
- Re-centered and normalized the rescue helicopter directly above the clearing.
- Kept the helicopter approximately 40 feet above the tree tops.
- Moved wildfire clusters several meters deeper into the surrounding tree line.
- Shifted burning-tree selection deeper into the forest so the first row of trees remains visible.

Run from a local web server because the game uses JavaScript modules.


## Build 0.4.9
- Corrected helicopter orientation and raised it 10 ft.
- Added front rescue spotlight.
- Added automated first-person rescue cutscene with fades, head roll/pans, disabled controls, and gurney lift.

Build 0.6.1 menu-audio fix: the first tap/key only unlocks and starts the looping menu track. Menu selections remain disabled until audio is active, and the track fades only when a game mode is selected.

Build 0.6.1: replaced the monster screech recording with the corrected user-supplied asset and normalized the filename casing used by the audio loader.


Build 0.6.1: fixed iOS one-shot audio unlocking and direct playback for the monster screech and final woman scream.


Build 0.6.2: extended the ground-level opening, slowed the overall rescue pacing, added a gradual hoist ramp before constant ascent, and sharpened/lifted the distant monster screech while retaining concussion filtering and forest echo.


## Revised tree LOD
- 0-25 m: approximately 10,000 triangles per tree
- 25-75 m: approximately 3,000 triangles per tree
- 75-110 m: approximately 1,000 triangles per tree
- The original 19 MB million-triangle tree is not loaded.
