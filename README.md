# Fear Walking 0.0.10

- Uses the supplied high-detail `pine-tree.glb` asset and its embedded texture pack.
- Merges the tree's many mesh pieces by material before instancing to reduce draw calls.
- Builds static thin-instance buffers once, preventing the movement crash caused by rebuilding buffers while walking.
- Restores textured terrain and existing mobile controls/day-night cycle.
