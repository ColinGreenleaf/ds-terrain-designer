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

  static _instance = null;

  constructor(options) {
    super(options);
    this.toolState = {
      activeTool: null,
      mode: null,
      elevation: null,
      brushSize: null,
      isErasing: false,
      instructions: null,
    };
    this.activeToolCancel = null;
    this.activeToolConfirm = null;
  }

  static getInstance() {
    if (!DesignerPanel._instance || !DesignerPanel._instance.element) {
      DesignerPanel._instance = new DesignerPanel();
    }
    return DesignerPanel._instance;
  }

  setActiveTool(cancelFn, confirmFn) {
    if (this.activeToolCancel && this.activeToolCancel !== cancelFn) {
      this.activeToolCancel();
    }
    this.activeToolCancel = cancelFn;
    this.activeToolConfirm = confirmFn;
  }

  cancelActiveTool() {
    if (this.activeToolCancel) {
      const cancel = this.activeToolCancel;
      this.activeToolCancel = null;
      this.activeToolConfirm = null;
      cancel();
    }
  }

  confirmActiveTool() {
    if (this.activeToolConfirm) {
      const confirm = this.activeToolConfirm;
      this.activeToolCancel = null;
      this.activeToolConfirm = null;
      confirm();
    }
  }

  async _prepareContext(options) {
    return {
      toolState: this.toolState,
    };
  }

  updateToolStatus(updates) {
    this.toolState = { ...this.toolState, ...updates };
    this.render(false);
  }

  close(options) {
    this.cancelActiveTool();
    return super.close(options);
  }

  clearToolStatus() {
    this.activeToolCancel = null;
    this.activeToolConfirm = null;
    this.toolState = {
      activeTool: null,
      mode: null,
      elevation: null,
      brushSize: null,
      isErasing: false,
      instructions: null,
    };
    this.render(false);
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

    html.find(".cancel-tool").on("click", ev => {
      this.cancelActiveTool();
    });

    html.find(".confirm-tool").on("click", ev => {
      this.confirmActiveTool();
    });

    html.find(".confirm-tool").on("click", ev => {
      //complete the active tool's action
    });
  }
}