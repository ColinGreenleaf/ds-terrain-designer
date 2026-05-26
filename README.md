# Draw Steel Terrain Designer


This module give the GM easy-to-use terrain design features inspired by the Codex VTT's terrain elevation tools.

GMs can paint elevations directly onto a scene grid, and a customizable overlay visible to all players will indicate which squares are elevated. Tokens that move onto these squares will automatically have their elevations adjusted to match the terrain, which enables "High Ground" edges on attacks against targets below you.

This module is still a work in progress, please report any bugs or requested features via the Github's "Issues" tab.


## HOW TO USE:
This module adds a set of terrain design utilities, accessed via the new main toolbar button shaped like a mountain.

<img width="48" height="48" alt="image" src="https://github.com/user-attachments/assets/79d0086c-1016-4279-83f0-1ab5f0e39618" />

Selecting this panel give you access to the "Elevation Checker" (player-facing) and the "Terrain Designer Panel" (GM only).

<img width="39" height="85" alt="image" src="https://github.com/user-attachments/assets/f63bf84e-9e34-4854-9198-973247eccc51" />

Opening the Terrain Designer Panel, you will find this:

<img width="430" height="230" alt="image" src="https://github.com/user-attachments/assets/885fc933-4898-4679-9fd2-a6103b0840b2" />

Each button will allow you to paint, erase, or clear all scene terrain of the given type.

Clicking the "Paint" or "Erase" button for each will activate a square selection mode, and pop up a description of the currently active tool:

<img width="424" height="542" alt="image" src="https://github.com/user-attachments/assets/da37a714-3d56-4637-ae39-4196851c2d63" />

___

Once squares have been marked via this module, an overlay will appear indicating which squares are elevated. These overlays are customizable. the elevation overlay has two modes of visualization - Gradient and Colored Tile. Additionally, you can choose whether or not to have a number appear in each tile indicating its elevation. Each possible elevation is represented by a unique color, which can be individually customized via the module settings. The Difficult Terrain overlay can also be customized to alter the pattern color and the density of lines that comprise the overlay.

Squares marked with elevation will automatically update a token's elevation when it moves onto them. Squares marked with difficult terrain automatically get a scene region placed on them with the "Modify Movement Cost" behavior.

Example of how these overlays look in a scene:
<img width="1510" height="810" alt="image" src="https://github.com/user-attachments/assets/c52a1fc5-215a-4337-a1fd-3a0378843a38" />








