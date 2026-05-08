# Draw Steel Terrain Designer


This module give the GM easy-to-use terrain design features inspired by the Codex VTT's terrain elevation tools.

GMs can paint elevations directly onto a scene grid, and a customizable overlay visible to all players will indicate which squares are elevated. Tokens that move onto these squares will automatically have their elevations adjusted to match the terrain, which enables "High Ground" edges on attacks against targets below you.

This module is still a work in progress, please report any bugs or requested features via the Github's "Issues" tab.


## HOW TO USE:
This module adds a set of Scene Control tools, accessed via the new main toolbar button shaped like a mountain.
<img width="48" height="48" alt="image" src="https://github.com/user-attachments/assets/79d0086c-1016-4279-83f0-1ab5f0e39618" />
Selecting this panel give you access to the tools this module provides.
<img width="44" height="288" alt="image" src="https://github.com/user-attachments/assets/c77946b4-83d2-483d-9723-53b20708ebe1" />

From top to bottom, these are:
### Elevation Painter
This tool allows you to set the elevation of selected squares by clicking and dragging the squares you want to be "elevated". You can cycle through elevations as you paint this way to paint multiple different elevation regions in one pass.
### Elevation Eraser
This tool allows you to select elevated squares which you want to remove elevation from.
### Clear Scene Elevation
This allows you to immediately clear all marked elevation for the currently active scene.
### Check Elevation
This player-facing tool allows non-GM players to hover over tiles and see their elevation, as well as highlighting as any other squares with the same elevation. Useful if you have disabled the "number overlay" and want to easily check the elevation of a square/area.
### Difficult Terrain Painter
This tool allows you to mark sqaures as difficult terrain by clicking and dragging the squares you want to be marked.
### Difficult Terrain Eraser
This tool allows you to select squares which you want to remove difficult terrain markers from.
### Clear Scene Difficult Terrain
This allows you to immediately clear all marked difficult terrain for the currently active scene.

___

Once squares have been marked via this module, an overlay will appear indicating which squares are elevated. These overlays are customizable: the elevation overlay has two modes of visualization - Gradient and Colored Tile. Additionally, you can choose whether or not to have a number appear in each tile indicating its elevation. Each possible elevation is represented by a unique color, which can be individually customized via the module settings. The Difficult Terrain overlay can also be customized to alter the pattern color and the density of lines that comprise the overlay.

Example of how these overlays look in a scene:
<img width="1510" height="810" alt="image" src="https://github.com/user-attachments/assets/c52a1fc5-215a-4337-a1fd-3a0378843a38" />








