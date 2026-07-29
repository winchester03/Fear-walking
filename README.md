# Fear Walking — Build 0.0.4

Changes:
- Restored a textured forest floor using a lightweight procedural dirt, moss, needle, and leaf-litter texture.
- Removed the old cutscene clearing and central trunk-collapse logic.
- Rebuilt tree placement as a dense deterministic forest independent of the cutscene.
- Preserved 10k / 3k / 1k approximate tree LOD ranges at 0–25 m, 25–75 m, and 75–110 m.
- Removed costly fern, shrub, and grass model loading for better mobile performance.
- Randomly dispersed 26 fallen trunks throughout the forest.
- Added a five-minute full day/night cycle beginning at sunset.
- Added sunset, dusk, night, dawn, sunrise, and daytime lighting transitions.
- Stars fade in and out with night.
- Added a test clock in the upper-right corner.
