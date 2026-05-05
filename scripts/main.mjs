import {renderElevationOverlay} from "./elevation.mjs";
import {renderTerrainOverlay} from "./terrain.mjs";
import {registerSettings } from "./module-settings.mjs";
import {registerModuleButtons} from "./module-buttons.mjs";
// import '../movement.mjs'  //this needs to be fixed later, the math is hard



/* -------------------------------------------------- */
/*   Initialization                                   */
/* -------------------------------------------------- */
Hooks.once("init", () => {
  registerSettings();
  registerModuleButtons();

});

Hooks.on('canvasReady', () => {
  renderElevationOverlay();
  renderTerrainOverlay();
});