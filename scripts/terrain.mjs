// import { getElevationColor } from './elevation.mjs';

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

/* -------------------------------------------------- */
/*   Sqaure Selection Function                        */
/* -------------------------------------------------- */
export const selectTerrainSquares = ({erasing = false} = {}) => {
  return new Promise((resolve) => {
    const stage = canvas.app.stage;
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

    const updateHud = () => {
      if (!hud) return;
      const brush = BRUSH_SIZES[currentBrushIdx];
      const mult = 2;
      hud.innerHTML = `
        <h1>Terrain ${erasing ? 'Eraser' : 'Painter'}</h1> 
        <h3 style="display: flex; justify-content: space-between;">
          ${isErasing
            ? `<p><strong style="color:#ff6666;">Unselect Mode</strong><p>`
            : ``
          }
          <p>Brush Size: <strong>${brush}</strong><p>
        </h3>
        <div style="font-size:13px; color:#ccc">Select Squares. [ ] for brush size.<br>Alt to unselect. Esc to cancel, Enter to confirm.</div>
      `;
    };

    let hud = document.createElement("div");
    hud.style.cssText = `position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 12px; border-radius: 8px; border: 2px solid #FFAA00; z-index: 9999;`;
    document.body.appendChild(hud);
    updateHud();

    const drawHighlights = (altHeld = false) => {
      graphics.clear();
      for (const square of selectedSquares) {
        const color = 0xffff00;
        graphics.beginFill(color, 0.4).drawRect(square.x * GRID, square.y * GRID, GRID, GRID).endFill();
      }

      if (hoverSquare) {
        const color = altHeld ? 0xff4444 : 0xffff00;
        const b = BRUSH_SIZES[currentBrushIdx];
        graphics.lineStyle(2, color, 0.9).beginFill(color, 0.2);
        graphics.drawRect((hoverSquare.x - b + 1) * GRID, (hoverSquare.y - b + 1) * GRID, (2 * b - 1) * GRID, (2 * b - 1) * GRID);
        graphics.endFill();
      }
    };

    const toGrid = (pos) => ({ x: Math.floor(pos.x / GRID), y: Math.floor(pos.y / GRID) });

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

    const eraseBrush = (center) => {
      const b = BRUSH_SIZES[currentBrushIdx];
      for (let i = center.x - b + 1; i <= center.x + b - 1; i++) {
        for (let j = center.y - b + 1; j <= center.y + b - 1; j++) {
          const idx = selectedSquares.findIndex(s => s.x === i && s.y === j);
          if (idx >= 0) selectedSquares.splice(idx, 1);
        }
      }
    };

    const onPointerMove = (e) => {
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

    const handleKey = (key, fn) => {
      key.preventDefault();
      key.stopPropagation();
      fn();
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') handleKey(event, () => { cleanup(); resolve(null); });
      if (event.key === 'Enter') handleKey(event, () => { overlay.off('pointermove', onPointerMove); hoverSquare = null; drawHighlights(); resolve({ squares: selectedSquares, cleanup }); });
      if (event.key === '[')       handleKey(event, () => { currentBrushIdx = (currentBrushIdx - 1 + BRUSH_SIZES.length) % BRUSH_SIZES.length; updateHud(); drawHighlights(event.altKey); });
      if (event.key === ']')       handleKey(event, () => { currentBrushIdx = (currentBrushIdx + 1) % BRUSH_SIZES.length; updateHud(); drawHighlights(event.altKey); });
    };

    const cleanup = () => {
      stage.removeChild(overlay, graphics);
      document.removeEventListener('keydown', onKeyDown);
      document.body.removeChild(hud);
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
    const color = 0x000000;
    
    // Draw a pattern (slashes) to distinguish from solid elevation colors
    graphics.lineStyle(4, color, 0.5);
    graphics.moveTo((x) * GRID, (y+ 0.5) * GRID).lineTo((x+0.5) * GRID, (y) * GRID);
    graphics.moveTo((x) * GRID, (y+ 1) * GRID).lineTo((x+1) * GRID, (y) * GRID);
    graphics.moveTo((x+0.5) * GRID, (y+ 1) * GRID).lineTo((x+1) * GRID, (y+0.5) * GRID);
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

// "Difficult Terrain Designer"
export const paintDifficultTerrain = async () => {
  ui.notifications.info('Click/drag to paint difficult terrain.');
  
  const result = await selectTerrainSquares();

  if (!result || !result.squares || result.squares.length === 0) {
    ui.notifications.warn('No squares selected.');
    if (result?.cleanup) result.cleanup();
    return;
  }

  const { squares, cleanup } = result;

  try {
    for (const square of squares) {
      await setSquareTerrain(square, square.multiplier);
    }
    renderTerrainOverlay(); 
  } finally {
    cleanup();
  }
};

// "Terrain Eraser Tool"
export const eraseDifficultTerrain = async () => {
  ui.notifications.info('Click/drag to select for clearing difficult terrain.');
  
  const result = await selectTerrainSquares();

  if (!result || !result.squares || result.squares.length === 0) {
    ui.notifications.warn('No squares selected.');
    if (result?.cleanup) result.cleanup();
    return;
  }

  const { squares, cleanup } = result;

  try {
    for (const square of squares) {
      await setSquareTerrain(square, 1);
    }
    renderTerrainOverlay(); 
  } finally {
    cleanup();
  }
};

// "Clear Scene Terrain Markers"
export const clearAllTerrain = async () => {
  if (!canvas.scene) return;
  await canvas.scene.unsetFlag(MODULE_ID, TERRAIN_FLAG_KEY);
  clearTerrainOverlay();
  ui.notifications.info('All terrain markers have been cleared.');
};




