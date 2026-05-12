import { DesignerPanel } from "./designer-panel.mjs";

const TERRAIN_FLAG_KEY = 'difficult-terrain';
const MODULE_ID = 'ds-terrain-designer';
const TERRAIN_OVERLAY_NAME = 'terrain-overlay-container';
const BRUSH_SIZES = [1, 2, 3];

/* -------------------------------------------------- */
/*   Utility Functions / Getters and Setters          */
/* -------------------------------------------------- */
const getTerrainMap = () => {
  return canvas.scene.getFlag(MODULE_ID, TERRAIN_FLAG_KEY) ?? {};
};

const setTerrainMap = async (map) => {
  await canvas.scene.unsetFlag(MODULE_ID, TERRAIN_FLAG_KEY);
  if (Object.keys(map).length > 0) {
    await canvas.scene.setFlag(MODULE_ID, TERRAIN_FLAG_KEY, map);
  }
};

export const clearTerrainOverlay = () => {
    const existing = canvas.primary.getChildByName(TERRAIN_OVERLAY_NAME);
    if (existing) existing.destroy({ children: true, texture: false });
};

const toKey = (square) => `${square.x},${square.y}`;

export const getSquareTerrain = (square) => {
  const map = getTerrainMap();
  return map[toKey(square)] ?? 1; // Default multiplier is 1 (normal)
};

export const setSquareTerrain = async (square, multiplier) => {
  const map = foundry.utils.deepClone(getTerrainMap());
  const key = toKey(square);

  if (multiplier <= 1) {
    delete map[key];
  } else {
    map[key] = multiplier;
  }

  await setTerrainMap(map);
};

//function to sync difficult terrain region to one combined region so each square doesn't spawn it's own individual region
const syncRegionsWithFlags = async () => {
  if (!game.settings.get(MODULE_ID, "UseRegion")) return;
  const map = getTerrainMap();
  const GRID = canvas.grid.size;
  const regionName = "Difficult Terrain (DSTD)";
  
  // Find existing region
  let region = canvas.scene.regions.find(r => r.name === regionName);
  
  // Generate shapes based on the current flag map
  const shapes = Object.keys(map).map(key => {
    const [x, y] = key.split(',').map(Number);
    return {
      type: "rectangle",
      x: x * GRID,
      y: y * GRID,
      width: GRID,
      height: GRID
    };
  });

  if (shapes.length === 0) {
    if (region) await region.delete();
    return;
  }

  const regionData = {
    name: regionName,
    color: "#ff0000",
    shapes: shapes,
    behaviors: [{
      type: "modifyMovementCost",
      name: "Modify Movement Cost",
      enabled: true,
      system: { difficulties: { walk: 2 } }
    }]
  };

  if (region) {
    await region.update({ shapes: shapes });
  } else {
    await canvas.scene.createEmbeddedDocuments("Region", [regionData]);
  }
};

/* -------------------------------------------------- */
/*   Sqaure Selection Function                        */
/* -------------------------------------------------- */
export const selectTerrainSquares = ({erasing = false} = {}) => {
  return new Promise((resolve) => {
    const stage = canvas.app.stage;
    const panel = DesignerPanel.getInstance();
    const selectedSquares = [];
    const graphics = new PIXI.Graphics();
    stage.addChild(graphics);

    const overlay = new PIXI.Container();
    overlay.interactive = true;
    overlay.eventMode = 'static';
    overlay.hitArea = new PIXI.Rectangle(0, 0, canvas.dimensions.width, canvas.dimensions.height);
    stage.addChild(overlay);

    const GRID = canvas.grid.size;
    let currentBrushIdx = 0;
    let hoverSquare = null;
    let isPainting = false;
    let isErasing = false;
    let cleanupDone = false;
    let resolved = false;

    const cleanup = () => {
      if (cleanupDone) return;
      cleanupDone = true;
      stage.removeChild(overlay, graphics);
      document.removeEventListener('keydown', onKeyDown);
      panel.clearToolStatus();
    };

    const resolveSelection = (result) => {
      if (resolved) return;
      resolved = true;
      resolve(result);
    };

    const cancelCurrentTool = () => {
      cleanup();
      resolveSelection(null);
    };

    const confirmCurrentTool = () => {
      overlay.off('pointermove', onPointerMove);
      hoverSquare = null;
      drawHighlights();
      resolveSelection({ squares: selectedSquares, cleanup });
    };

    panel.setActiveTool(cancelCurrentTool, confirmCurrentTool);

    //panel status handling
    const updatePanelStatus = () => {
      const brush = BRUSH_SIZES[currentBrushIdx];
      const toolName = erasing ? 'Erase Difficult Terrain' : 'Paint Difficult Terrain';

      const instructions = 'Click/drag squares to select.<br>Use [ ] to change brush size.<br>Hold Alt to unselect. Esc to cancel, Enter to confirm.';

      panel.updateToolStatus({
        activeTool: toolName,
        mode: isErasing ? 'Unselect' : 'Select',
        elevation: null,
        brushSize: brush,
        isErasing: isErasing,
        instructions: instructions,
      });
    };

    updatePanelStatus();

    //draw highlights on selected sqaures and hovered
    const drawHighlights = (altHeld = false) => {
      graphics.clear();
      for (const square of selectedSquares) {
        const color = 0x808080;
        graphics.beginFill(color, 0.4).drawRect(square.x * GRID, square.y * GRID, GRID, GRID).endFill();
      }

      if (hoverSquare) {
        const color = altHeld ? 0xff4444 : 0x808080;
        const b = BRUSH_SIZES[currentBrushIdx];
        graphics.lineStyle(2, color, 0.9).beginFill(color, 0.2);
        graphics.drawRect((hoverSquare.x - b + 1) * GRID, (hoverSquare.y - b + 1) * GRID, (2 * b - 1) * GRID, (2 * b - 1) * GRID);
        graphics.endFill();
      }
    };

    //convert pixel grid position to square grid
    const toGrid = (pos) => ({
      x: Math.floor(pos.x / GRID),
      y: Math.floor(pos.y / GRID)
    });

    //select any squares within the brush range
    const paintBrush = (center) => {
      const b = BRUSH_SIZES[currentBrushIdx];
      for (let i = center.x - b + 1; i <= center.x + b - 1; i++) {
        for (let j = center.y - b + 1; j <= center.y + b - 1; j++) {
          const idx = selectedSquares.findIndex(s => s.x === i && s.y === j);
          if (idx >= 0) selectedSquares.splice(idx, 1);
          selectedSquares.push({ x: i, y: j, multiplier: 2 });
        }
      }
    };

    //unselect any squares within the brush range
    const eraseBrush = (center) => {
      const b = BRUSH_SIZES[currentBrushIdx];
      for (let i = center.x - b + 1; i <= center.x + b - 1; i++) {
        for (let j = center.y - b + 1; j <= center.y + b - 1; j++) {
          const idx = selectedSquares.findIndex(s => s.x === i && s.y === j);
          if (idx >= 0) selectedSquares.splice(idx, 1);
        }
      }
    };

    //functions to handle mouse interactions
    const onPointerMove = (e) => {
      if (e.altKey !== isErasing) {
        isErasing = e.altKey;
        updatePanelStatus();
      }
      hoverSquare = toGrid(e.data.getLocalPosition(stage));
      if (isPainting) isErasing ? eraseBrush(hoverSquare) : paintBrush(hoverSquare);
      drawHighlights(e.altKey);
    };

    const onPointerDown = (e) => {
      isPainting = (e.button === 0);
      isErasing = e.altKey;
      hoverSquare = toGrid(e.data.getLocalPosition(stage));
      isErasing ? eraseBrush(hoverSquare) : paintBrush(hoverSquare);
      drawHighlights(e.altKey);
    };

    //functions to handle key presses
    const handleKey = (key, fn) => {
      key.preventDefault();
      key.stopPropagation();
      fn();
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') handleKey(event, () => { cleanup(); resolveSelection(null); });
      if (event.key === 'Enter') handleKey(event, () => { overlay.off('pointermove', onPointerMove); hoverSquare = null; drawHighlights(); resolveSelection({ squares: selectedSquares, cleanup }); });
      if (event.key === '[')       handleKey(event, () => { currentBrushIdx = (currentBrushIdx - 1 + BRUSH_SIZES.length) % BRUSH_SIZES.length; updatePanelStatus(); drawHighlights(event.altKey); });
      if (event.key === ']')       handleKey(event, () => { currentBrushIdx = (currentBrushIdx + 1) % BRUSH_SIZES.length; updatePanelStatus(); drawHighlights(event.altKey); });
    };

    overlay.on('pointermove', onPointerMove).on('pointerdown', onPointerDown).on('pointerup', () => isPainting = false);
    document.addEventListener('keydown', onKeyDown);
    drawHighlights();
  });
};

/* -------------------------------------------------- */
/*   Overlay Render Manager and Helpers               */
/* -------------------------------------------------- */
export const renderTerrainOverlay = () => {
  const existing = canvas.primary.getChildByName(TERRAIN_OVERLAY_NAME);
  if (existing) existing.destroy({ children: true });

  const map = getTerrainMap();
  if (!Object.keys(map).length) return;

  const container = new PIXI.Container();
  container.name = TERRAIN_OVERLAY_NAME;
  const graphics = new PIXI.Graphics();
  container.addChild(graphics);

  const GRID = canvas.grid.size;
  for (const [key, mult] of Object.entries(map)) {
    const [x, y] = key.split(',').map(Number);

    const terrainColorString =  game.settings.get(MODULE_ID, `TerrainColor`)
    const color = Number(Color.from(terrainColorString))
    
    // Draw a pattern (slashes) to distinguish from solid elevation colors
    graphics.lineStyle(4, color, 0.4);
    graphics.moveTo((x) * GRID, (y+ 0.5) * GRID).lineTo((x+0.5) * GRID, (y) * GRID);
    graphics.moveTo((x) * GRID, (y+ 1) * GRID).lineTo((x+1) * GRID, (y) * GRID);
    graphics.moveTo((x+0.5) * GRID, (y+ 1) * GRID).lineTo((x+1) * GRID, (y+0.5) * GRID);

    if (game.settings.get(MODULE_ID, `TerrainStyle`) === 'dense') {
      graphics.moveTo((x) * GRID, (y+ 0.25) * GRID).lineTo((x+0.25) * GRID, (y) * GRID);
      graphics.moveTo((x) * GRID, (y+ 0.75) * GRID).lineTo((x+0.75) * GRID, (y) * GRID);
      graphics.moveTo((x+0.25) * GRID, (y+ 1) * GRID).lineTo((x+1) * GRID, (y+0.25) * GRID);
      graphics.moveTo((x+0.75) * GRID, (y+ 1) * GRID).lineTo((x+1) * GRID, (y+0.75) * GRID);
    }
  }

  canvas.primary.addChild(container);
};

Hooks.on('updateScene', (scene, delta) => {
  if (foundry.utils.hasProperty(delta, `flags.${MODULE_ID}.${TERRAIN_FLAG_KEY}`)) {
    renderTerrainOverlay();
  }
});


/* -------------------------------------------------- */
/*   Scene Button Methods                             */
/* -------------------------------------------------- */

export const paintDifficultTerrain = async () => {
  // ui.notifications.info('Click/drag to paint difficult terrain.');
  
  const result = await selectTerrainSquares();

  if (!result || !result.squares || result.squares.length === 0) {
    // ui.notifications.warn('No squares selected.');
    if (result?.cleanup) result.cleanup();
    return;
  }

  const { squares, cleanup } = result;
  const GRID = canvas.grid.size;

  try {
    const map = foundry.utils.deepClone(getTerrainMap());
    for (const square of squares) {
      const key = toKey(square);
      if (square.multiplier <= 1) delete map[key];
      else map[key] = square.multiplier;
    }
    await setTerrainMap(map);
    //match the difficult terrain region to the marked squares
    await syncRegionsWithFlags();
    renderTerrainOverlay();
  } finally {
    cleanup();
  }
};

// "Difficult Terrain Eraser"
export const eraseDifficultTerrain = async () => {
  // ui.notifications.info('Click/drag to select for clearing difficult terrain.');
  
  const result = await selectTerrainSquares({ erasing: true });

  if (!result || !result.squares || result.squares.length === 0) {
    // ui.notifications.warn('No squares selected.');
    if (result?.cleanup) result.cleanup();
    return;
  }

  const { squares, cleanup } = result;
  const GRID = canvas.grid.size;

try {
    const map = foundry.utils.deepClone(getTerrainMap());
    const regionsToDelete = [];

    for (const square of squares) {
      //remove squares from overlay
      const key = toKey(square);
      delete map[key];
    }

    await setTerrainMap(map);
    //match the difficult terrain region to the marked squares
    await syncRegionsWithFlags();
    renderTerrainOverlay();
  } finally {
    cleanup();
  }
};

// "Clear Scene Difficult Terrain"
export const clearAllTerrain = async () => {
  if (!canvas.scene) return;
  //dialog confirmation before executing to prevent accidental clearing
  const confirmClear = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Confirm Difficult Terrain Clearing" },
      content: "<p>Are you sure you want to clear all difficult terrain for this scene?</p>"
  });
  if (confirmClear) {
    await canvas.scene.unsetFlag(MODULE_ID, TERRAIN_FLAG_KEY);
    clearTerrainOverlay();
    //find region created by this module (if any) and delete it
    const region = canvas.scene.regions.find(r => r.name === "Difficult Terrain (DSTD)");
    if (region) await region.delete();

    ui.notifications.info('All terrain markers and regions have been cleared.');
  }
  
};




