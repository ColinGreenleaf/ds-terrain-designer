import {selectForAssignment, selectForClearing, clearAllElevations, checkSquareElevation} from "./elevation.mjs";
import {paintDifficultTerrain, eraseDifficultTerrain, clearAllTerrain} from "./terrain.mjs";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class DesignerPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "designer-panel",
    tag: "form",
    window: {
      title: "Terrain Designer Panel",
      resizable: true,
    },
    position: {
      width: 400,
      height: "auto",
    },
  };
  static PARTS = {
    form: {
      template: "modules/ds-terrain-designer/templates/designer-panel.hbs",
    },
  };

  // Replaces getData(options)
  async _prepareContext(options) {
    return {
      // ...your data here
    };
  }

  // Replaces activateListeners(html)
  _onRender(context, options) {
    const html = $(this.element);
    
    html.find(".paint-elevation").on("click", ev => {
      console.log("Paint elevation button clicked");
      ev.preventDefault();
      selectForAssignment();
    });

    html.find(".erase-elevation").on("click", ev => {
      console.log("Erase elevation button clicked");
      ev.preventDefault();
      selectForClearing();
    });

    html.find(".clear-elevation").on("click", ev => {
      console.log("Clear all elevation button clicked");
      ev.preventDefault();
      clearAllElevations();
    });

    html.find(".paint-difficult-terrain").on("click", ev => {
      console.log("Paint difficult terrain button clicked");
      ev.preventDefault();
      paintDifficultTerrain();
    });

    html.find(".erase-difficult-terrain").on("click", ev => {
      console.log("Erase difficult terrain button clicked");
      ev.preventDefault();
      eraseDifficultTerrain();
    });

    html.find(".clear-difficult-terrain").on("click", ev => {
      console.log("Clear all difficult terrain button clicked");
      ev.preventDefault();
      clearAllTerrain();
    });
  }
}