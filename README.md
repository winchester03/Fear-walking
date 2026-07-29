# The Forest — Build 0.4.4

Changes:
- Replaced mesh-based horizontal collisions with a lightweight trunk collision solver.
- Added keyboard movement and capped large frame-time movement jumps.
- Added a full 360-degree wall of fire around the clearing.
- Added flames climbing perimeter trees, heavier black smoke, drifting embers, and expanded flickering firelight.
- Retained the burning central collapsed-log pile.
- Adjusted fog and moonlight for stronger orange fire contrast.
- Disabled unused ground mesh collisions.

Run from a local web server because the game uses JavaScript modules.

## Build 0.4.4
- Increased perimeter flame height, lifespan, width, and density.
- Increased smoke opacity, particle size, lifetime, and emission rate.
- Expanded firelight range and intensity around the full clearing.
- Added four low-cost bounce lights to imitate indirect ray-traced illumination.
- Added ACES tone mapping, adjusted exposure, and controlled bloom.
- Reduced fog density slightly so illuminated trees remain visible through smoke.
- Retained dynamic resolution and shadowless fire lights for stable performance.

## Build 0.4.4
- Raised ambient, moon, and environment lighting so trees remain visibly textured.
- Added a low-cost warm hemispheric fire fill to simulate smoke-scattered bounce light.
- Reduced contrast and bloom while increasing exposure, preventing black silhouettes and blown-out flames.
- Brightened bark, needles, fog, and terrain materials.
- Increased material light limits so nearby fire lights affect more surfaces.
- Shortened harsh point-light reach while strengthening broad indirect illumination.
