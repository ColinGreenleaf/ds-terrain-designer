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









































//   /* -------------------------------------------------- */
//   /*   Revenger's Wrap Hook Controls                    */
//   /* -------------------------------------------------- */
// const toggleRevengersWrap = (enabled) => {
//   if (enabled) {
//     //find relevant actors
//     const wrapActors = getActorsWithItem(game, REVENGERS_WRAP_NAME);
//     const combatActors = game.combat?.combatants.filter(c => c.actor).map(c => c.actor) ?? [];

//     /* -------------------------apply a mark to the actor that is selected when Revenger's Wrap wearer takes damage------------------------- */
//     window._revengeHook = Hooks.on('updateActor', async (actor, changes, options) => {
//       applyMarkWhenWearerDamaged(actor, changes, options, wrapActors, combatActors);
//     });

//     /* -------------------------clear mark from all actors when Revenger's Wrap wearer's turn ends------------------------- */
//     window._eotHook = Hooks.on('combatTurnChange', async (combat, prior, current) => {
//       clearRevengeOnTurnEnd(combat, prior, wrapActors, combatActors);
//     });

//     /* -------------------------roll additional effects when the wearer targets a marked enemy with a strike------------------------- */
//     window._revengeRollHook = Hooks.on('createChatMessage', async (message) => {
//       applyRevengeStrikeEffects(message, game, wrapActors, combatActors);
//     });
//   } else {
//     Hooks.off('updateActor', window._revengeHook);
//     Hooks.off('combatTurnChange', window._eotHook);
//     Hooks.off('createChatMessage', window._revengeRollHook);
//     window._revengeHook = null;
//     window._eotHook = null;
//     window._revengeRollHook = null;
//     clearRevengeMarks(game.combat?.combatants.filter(c => c.actor).map(c => c.actor) ?? []);
//   };
// }

//   /* -------------------------------------------------- */
//   /*   Bloodbound Band Hook Controls                    */
//   /* -------------------------------------------------- */
// const toggleBloodboundBand = (enabled) => {
//   if (enabled) {
//     //find relevant actors
//     const bandActors = getActorsWithItem(game, BLOODBOUND_BAND_NAME);

//     /* -------------------------apply shared damage when an actor with the band takes damage------------------------- */
//     window._bloodboundHook = Hooks.on('updateActor', async (actor, changes, options) => {
//       dealSharedDamage(bandActors, actor, changes, options);
//     });
//   } else {
//     Hooks.off('updateActor', window._bloodboundHook);
//     window._bloodboundHook = null;
//   } 
// }
