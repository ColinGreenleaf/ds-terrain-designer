const ELEVATION_FLAG_KEY = 'elevation-levels';
const MODULE_ID = 'ds-terrain-designer';
const ELEVATION_OVERLAY_NAME = 'elevation-overlay-container';
const ELEVATIONS = [-2, -1, 1, 2, 3, 4, 5, 6];
const BRUSH_SIZES = [1, 2, 3]


/* -------------------------------------------------- */
/*   Utility Functions / Getters and Setters         */
/* -------------------------------------------------- */
const getElevationColor = (elevation) => {
  if (elevation === 0) return 0xffffff;
  const elevColorString = game.settings.get(MODULE_ID, `ElevationColor${elevation}`)
  const colorNum = Number(Color.from(elevColorString))
  return colorNum;
};

const getElevationMap = () => {
  return canvas.scene.getFlag(MODULE_ID, ELEVATION_FLAG_KEY) ?? {};
};

const setElevationMap = async (map) => {
  await canvas.scene.unsetFlag(MODULE_ID, ELEVATION_FLAG_KEY);
  if (Object.keys(map).length > 0) {
    await canvas.scene.setFlag(MODULE_ID, ELEVATION_FLAG_KEY, map);
  }
};

const toKey = (square) => `${square.x},${square.y}`;

export const getSquareElevation = (square) => {
  const map = getElevationMap();
  return map[toKey(square)] ?? 0;
};

export const setSquareElevation = async (square, elevation) => {
  const map = foundry.utils.deepClone(getElevationMap());
  const key = toKey(square);

  if (elevation === 0) {
    delete map[key];
  } else {
    map[key] = elevation;
  }

  await setElevationMap(map);
};

export const getSquaresWithElevation = () => {
  const map = getElevationMap();
  return Object.entries(map).map(([key, value]) => {
    const [x, y] = key.split(',').map(Number);
    return { x, y, elevation: value };
  });
};

export const clearSquareElevation = async (square) => {
  await setSquareElevation(square, 0);
};

export const clearAllElevations = async () => {
  if (!canvas.scene) return;
  //dialog confirmation before executing to prevent accidental clearing
  const confirmClear = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Confirm Elevation Clearing" },
      content: "<p>Are you sure you want to clear all elevations for this scene?</p>"
  });
  if (confirmClear){
    await canvas.scene.unsetFlag(MODULE_ID, ELEVATION_FLAG_KEY);
    clearElevationOverlay();
    ui.notifications.info('All elevation markers have been cleared.');
  }
};


/* -------------------------------------------------- */
/*   Gradient Design Helpers                          */
/* -------------------------------------------------- */
let _gradientTexture = null;
let _gradientTextureSize = null;
let _cornerTexture = null;

// map of where the shadow should appear realtive to the high square
const SHADOW_PUSH = [
    { dx:  0, dy: -1, side: 'bottom' }, 
    { dx:  1, dy:  0, side: 'left'   }, 
    { dx:  0, dy:  1, side: 'top'    }, 
    { dx: -1, dy:  0, side: 'right'  }, 
];

const CORNER_PUSH = [
    { dx: -1, dy: -1, corner: 'br' }, 
    { dx:  1, dy: -1, corner: 'bl' }, 
    { dx:  1, dy:  1, corner: 'tl' }, 
    { dx: -1, dy:  1, corner: 'tr' } 
];

const EDGE_ROTATIONS = {
    top:    { rotation: 0,             anchorX: 0, anchorY: 0 },
    right:  { rotation: Math.PI / 2,   anchorX: 0, anchorY: 1 },
    bottom: { rotation: Math.PI,       anchorX: 1, anchorY: 1 },
    left:   { rotation: -Math.PI / 2,  anchorX: 1, anchorY: 0 },
};

const CORNER_ROTATIONS = {
    tl: { rotation: 0,             ax: 0, ay: 0 },
    tr: { rotation: Math.PI / 2,   ax: 0, ay: 1 },
    br: { rotation: Math.PI,       ax: 1, ay: 1 },
    bl: { rotation: -Math.PI / 2,  ax: 1, ay: 0 }
};

const BASE_GRADIENT_STRENGTH = 0.65;
const CONTOUR_DARK_ALPHA = 0.6;
const CONTOUR_LIGHT_ALPHA = 0.3;

const getCornerTexture = () => {
    const size = canvas.grid.size;
    if (_cornerTexture && _gradientTextureSize === size) return _cornerTexture;
    const offscreen = document.createElement('canvas');
    offscreen.width = size;
    offscreen.height = size;
    const ctx = offscreen.getContext('2d');
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.35);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    if (_cornerTexture) _cornerTexture.destroy();
    _cornerTexture = PIXI.Texture.from(offscreen);
    return _cornerTexture;
};

const getGradientTexture = () => {
    const size = canvas.grid.size;
    if (_gradientTexture && _gradientTextureSize === size) return _gradientTexture;
    const offscreen = document.createElement('canvas');
    offscreen.width = size;
    offscreen.height = size;
    const ctx = offscreen.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, size * 0.35);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    if (_gradientTexture) _gradientTexture.destroy();
    _gradientTexture = PIXI.Texture.from(offscreen);
    _gradientTextureSize = size;
    return _gradientTexture;
};


/* -------------------------------------------------- */
/*   Modal Sqaure Selection Function                  */
/* -------------------------------------------------- */
export const selectSquares = ({ useElevation = false} = {}) => {
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
    let currentElevationIdx = 2;
    let currentBrushIdx = 0;
    let hoverSquare = null;
    let isPainting = false;
    let isErasing = false;


    //hud handling
    const updateHud = () => {
      if (!hud) return;
      const brush = BRUSH_SIZES[currentBrushIdx];
      hud.innerHTML = useElevation
        ? `
        <h1>Elevation Painter</h1> 
        <h3 style="display: flex; justify-content: space-between;">
          ${isErasing
            ? `<p><strong style="color:#ff6666;">Unselect Mode</strong><p>`
            : `<p>Elevation: <strong style="color: #${getElevationColor(ELEVATIONS[currentElevationIdx]).toString(16).padStart(6, "0")};">${ELEVATIONS[currentElevationIdx]}</strong><p>
              `
          }
          <p>Brush Size: <strong>${brush}</strong><p>
        </h3>
        <div style="font-size:13px; color:#ccc">Click/drag squares to select them.<br>Num keys 1-8 or Tab to change elevation. Use [ ] to change brush size.<br>Alt+Click to unselect. Esc to cancel, Enter to confirm</div>
        `
        : `
          <h1>Elevation Eraser</h1>
          <h3>
            Brush Size: <strong>${brush}</strong>
            ${isErasing ? `<strong style="color:#ff6666;">Unselect Mode</strong>` : ''}
          </h3>
          <div style="font-size:13px; color:#ccc">Click/drag squares to select them.<br> Use [ ] to change brush size, Alt+Click to unselect.<br> Esc to cancel, Enter to confirm</div>
        `;
    };

    let hud = document.createElement("div");
    hud.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.75);
      color: white;
      padding: 8px 18px;
      border-radius: 8px;
      font-size: 18px;
      font-family: sans-serif;
      pointer-events: none;
      z-index: 9999;
      border: 2px solid #aaa;
    `;
    document.body.appendChild(hud);
    updateHud();

    //draw highlights on selected squares and hovered
    const drawHighlights = (altHeld = false) => {
      graphics.clear();
      const currentElevation = ELEVATIONS[currentElevationIdx];

      for (const square of selectedSquares) {
        const color = (useElevation ? getElevationColor(square.elevation) : 0xffff00);
        graphics.lineStyle(2, color, 0.9);
        graphics.beginFill(color, 0.35);
        graphics.drawRect(square.x * GRID, square.y * GRID, GRID, GRID);
        graphics.endFill();
      }

      if (hoverSquare) {
        const existing = selectedSquares.find(s => s.x === hoverSquare.x && s.y === hoverSquare.y);
        // show red brush preview when erasing, otherwise normal color
        const color = altHeld ? 0xff4444 : (useElevation ? getElevationColor(currentElevation) : 0xffff00);
        graphics.lineStyle(2, color, 0.9);
        graphics.beginFill(color, existing ? 0.15 : 0.55);
        const startPosX = (hoverSquare.x - BRUSH_SIZES[currentBrushIdx] + 1) * GRID;
        const startPosY = (hoverSquare.y - BRUSH_SIZES[currentBrushIdx] + 1) * GRID;
        const scale = (2 * BRUSH_SIZES[currentBrushIdx] - 1) * GRID;
        graphics.drawRect(startPosX, startPosY, scale, scale);
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
          const square = { x: i, y: j };
          const idx = selectedSquares.findIndex(s => s.x === i && s.y === j);
          if (idx >= 0) {
            if (useElevation && selectedSquares[idx].elevation !== ELEVATIONS[currentElevationIdx]) {
              selectedSquares.splice(idx, 1);
              selectedSquares.push({ ...square, ...(useElevation && { elevation: ELEVATIONS[currentElevationIdx] }) });
            }
          } else {
            selectedSquares.push({ ...square, ...(useElevation && { elevation: ELEVATIONS[currentElevationIdx] }) });
          }
        }
      }
    };

    //unselect any sqaures within the brush range
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
    const onPointerMove = (event) => {
      hoverSquare = toGrid(event.data.getLocalPosition(stage));
      if (event.altKey !== isErasing) {
        isErasing = event.altKey;
        updateHud();
      }
      if (isPainting) {
        event.altKey ? eraseBrush(hoverSquare) : paintBrush(hoverSquare);
      }
      drawHighlights(event.altKey);
    };

    const onPointerDown = (event) => {
      isPainting = (event.button === 0);
      isErasing = event.altKey;
      hoverSquare = toGrid(event.data.getLocalPosition(stage));
      event.altKey ? eraseBrush(hoverSquare) : (event.button === 0 && paintBrush(hoverSquare));
      drawHighlights(event.altKey);
    };

    const onPointerUp = () => {
      isPainting = false;
    };


    //functions to handle key presses
    const handleKey = (key, fn) => {
      key.preventDefault();
      key.stopPropagation();
      fn();
    };

    const onKeyDown = (event) => {
      if (useElevation && event.key >= '1' && event.key <= '6') {
        handleKey(event, () => {currentElevationIdx = ELEVATIONS.indexOf(parseInt(event.key)); updateHud(); drawHighlights(event.altKey);}); return;
      }

      //add keybinds for negative elevations
      if (useElevation && event.key == '7') {
        handleKey(event, () => {currentElevationIdx = 0; updateHud(); drawHighlights(event.altKey);}); return;
      }
      if (useElevation && event.key == '8') {
        handleKey(event, () => {currentElevationIdx = 1; updateHud(); drawHighlights(event.altKey);}); return;
      }


      if (event.key === 'Escape')       handleKey(event, () => { cleanup(); resolve(null); });
      else if (event.key === 'Enter')   handleKey(event, () => { overlay.off('pointermove', onPointerMove); hoverSquare = null; drawHighlights(); resolve({ squares: selectedSquares, cleanup }); });
      else if (event.key === '[')       handleKey(event, () => { currentBrushIdx = (currentBrushIdx - 1 + BRUSH_SIZES.length) % BRUSH_SIZES.length; updateHud(); drawHighlights(event.altKey); });
      else if (event.key === ']')       handleKey(event, () => { currentBrushIdx = (currentBrushIdx + 1) % BRUSH_SIZES.length; updateHud(); drawHighlights(event.altKey); });
      else if (event.key === 'Tab')     handleKey(event, () => { currentElevationIdx = (currentElevationIdx + 1) % ELEVATIONS.length; updateHud(); drawHighlights(event.altKey); });
    };

    const onKeyUp = (event) => {
      if (event.key === 'Alt') {
        isErasing = false;
        updateHud();
        drawHighlights(false);
      }
    };


    //cleanup and init
    const cleanup = () => {
      overlay.off('pointermove', onPointerMove);
      overlay.off('pointerdown', onPointerDown);
      overlay.off('pointerup', onPointerUp);
      stage.removeChild(overlay);
      stage.removeChild(graphics);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.body.removeChild(hud);
    };

    overlay.on('pointermove', onPointerMove);
    overlay.on('pointerdown', onPointerDown);
    overlay.on('pointerup', onPointerUp);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    drawHighlights();
  });
};


/* -------------------------------------------------- */
/*   Handler for Token Movement onto Elevated Tiles   */
/* -------------------------------------------------- */
Hooks.on('updateToken', async (tokenDoc, changes, options, userId) => {
  if (game.modules.get('draw-steel-combat-tools')?.api?.isFMActive?.()) return;
  if (changes.x !== undefined || changes.y !== undefined) {
    const gridSize = canvas.grid.size;
    const gridX = Math.floor((changes.x ?? tokenDoc.x) / gridSize);
    const gridY = Math.floor((changes.y ?? tokenDoc.y) / gridSize);
    const squareElevation = getSquareElevation({ x: gridX, y: gridY });
    
    if (squareElevation !== 0 && tokenDoc.elevation !== squareElevation) {
      await tokenDoc.update({ elevation: squareElevation });
    } else if (squareElevation === 0 && tokenDoc.elevation !== 0) {
      await tokenDoc.update({ elevation: 0 });
    } 

    //scale the token up/down based on elevation for "closer to camera" effect
    if (game.settings.get(MODULE_ID, "ElevationScaling")) {
      // If no base scale stored yet, record the token's current scale as the baseline
      let baseScale = tokenDoc.getFlag(MODULE_ID, 'baseScale');
      if (baseScale == null) {
        baseScale = tokenDoc.texture.scaleX;
        await tokenDoc.setFlag(MODULE_ID, 'baseScale', baseScale);
      }

      // If returning to elevation 0, restore base scale, otherwise alter scale relative to elevation
      if (squareElevation === 0) {
        await tokenDoc.update({
          "texture.scaleX": baseScale,
          "texture.scaleY": baseScale,
        });
      } else {
        await tokenDoc.update({
          "texture.scaleX": baseScale + squareElevation / 25,
          "texture.scaleY": baseScale + squareElevation / 25,
        });
      }
    } else if (tokenDoc.texture.scaleX !== 0) {
      // Scaling disabled — restore to base if we have one, otherwise 1
      const baseScale = tokenDoc.getFlag(MODULE_ID, 'baseScale') ?? 1;
      await tokenDoc.update({
        "texture.scaleX": baseScale,
        "texture.scaleY": baseScale,
      });
    }
  }
});




/* -------------------------------------------------- */
/*   Overlay Render Manager and Helpers               */
/* -------------------------------------------------- */
export const renderElevationOverlay = () => {
  if (!game.settings.get(MODULE_ID, "OverlayVisualization")) return; 

  const overlayMode = game.settings.get(MODULE_ID, "OverlayStyle");
  if (overlayMode === 'gradient') renderGradient();
  else if (overlayMode === 'color') renderColorTiles();

  const drawNumbers = game.settings.get(MODULE_ID, "NumberOverlay");
  if (drawNumbers) renderNumbers();

}

//helper to render gradients
export const renderGradient = () => {
    const existing = canvas.primary.getChildByName(ELEVATION_OVERLAY_NAME);
    if (existing) existing.destroy({ children: true, texture: false });

    const map = getElevationMap();
    if (!Object.keys(map).length) return;

    const GRID = canvas.grid.size;
    const container = new PIXI.Container();
    container.name = ELEVATION_OVERLAY_NAME;

    const gradientContainer = new PIXI.Container();
    const graphics = new PIXI.Graphics();
    container.addChild(gradientContainer);
    container.addChild(graphics);

    const gradTex = getGradientTexture();
    const cornerTex = getCornerTexture();

    // POSITIVE ELEVATION
    for (const [key, elev] of Object.entries(map)) {
      if (elev <= 0) continue;
      const [x, y] = key.split(',').map(Number);

        // 1. PROJECT ORTHOGONAL SHADOWS
      for (const { dx, dy, side } of SHADOW_PUSH) {
        const nx = x + dx;
        const ny = y + dy;
        const neighborElev = map[`${nx},${ny}`] ?? 0;

        if (neighborElev < elev) {
          const delta = elev - neighborElev;
          const alpha = BASE_GRADIENT_STRENGTH * Math.min(1, 0.3 + delta * 0.2);
          const { rotation, anchorX, anchorY } = EDGE_ROTATIONS[side];

          const sprite = new PIXI.Sprite(gradTex);
          sprite.width = sprite.height = GRID;
          sprite.alpha = alpha;
          sprite.rotation = rotation;
          sprite.anchor.set(anchorX, anchorY);

          // Position on the neighbor
          const npx = nx * GRID;
          const npy = ny * GRID;
          
          const bOff = (side === 'bottom') ? -GRID : 0;
          const lOff = (side === 'left') ? -GRID : 0;
          const rOff = (side === 'right') ? -GRID : 0;

          sprite.x = npx + (anchorX * GRID) + bOff + lOff;
          sprite.y = npy + (anchorY * GRID) + rOff + bOff;
          gradientContainer.addChild(sprite);
        }
      }

      // 2. PROJECT CORNER SHADOWS
      for (const { dx, dy, corner } of CORNER_PUSH) {
        const nx = x + dx;
        const ny = y + dy;
        const neighborElev = map[`${nx},${ny}`] ?? 0;

        if (neighborElev < elev) {
          const adj1 = map[`${x + dx},${y}`] ?? 0;
          const adj2 = map[`${x},${y + dy}`] ?? 0;
          if (adj1 >= elev || adj2 >= elev) continue;

          const delta = elev - neighborElev;
          const alpha = BASE_GRADIENT_STRENGTH * Math.min(1, 0.2 + delta * 0.15);
          const { rotation, ax, ay } = CORNER_ROTATIONS[corner];

          const sprite = new PIXI.Sprite(cornerTex);
          sprite.width = sprite.height = GRID;
          sprite.alpha = alpha;
          sprite.rotation = rotation;
          sprite.anchor.set(ax, ay);

          const npx = nx * GRID;
          const npy = ny * GRID;
          const xOff = (corner === 'br' || corner === 'bl') ? -GRID : 0;
          const yOff = (corner === 'tr' || corner === 'br') ? -GRID : 0;

          sprite.x = npx + (ax * GRID) + xOff;
          sprite.y = npy + (ay * GRID) + yOff;
          gradientContainer.addChild(sprite);
        }
      }
    }


    // NEGATIVE ELEVATION
    const OPPOSITE_SIDE   = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
    const OPPOSITE_CORNER = { tl: 'br', tr: 'bl', bl: 'tr', br: 'tl' };

    for (const [key, elev] of Object.entries(map)) {
      if (elev >= 0) continue; 
      const [x, y] = key.split(',').map(Number);

      //ORTHOGONAL inward shadows
      for (const { dx, dy, side } of SHADOW_PUSH) {
        const neighborElev = map[`${x+dx},${y+dy}`] ?? 0;
        if (neighborElev <= elev) continue;

        const delta = neighborElev - elev;
        const alpha = BASE_GRADIENT_STRENGTH * Math.min(1, 0.3 + delta * 0.2);

        const oppSide = OPPOSITE_SIDE[side];
        const { rotation, anchorX, anchorY } = EDGE_ROTATIONS[oppSide];

        const sprite = new PIXI.Sprite(gradTex);
        sprite.width = sprite.height = GRID;
        sprite.alpha = alpha;
        sprite.rotation = rotation;
        sprite.anchor.set(anchorX, anchorY);

        const px = x * GRID;
        const py = y * GRID;
        const bOff = (oppSide === 'bottom') ? -GRID : 0;
        const lOff = (oppSide === 'left')   ? -GRID : 0;
        const rOff = (oppSide === 'right')  ? -GRID : 0;

        sprite.x = px + (anchorX * GRID) + bOff + lOff;
        sprite.y = py + (anchorY * GRID) + rOff + bOff;
        gradientContainer.addChild(sprite);
      }

      // 4b. CORNER inward shadows
      for (const { dx, dy, corner } of CORNER_PUSH) {
        const neighborElev = map[`${x+dx},${y+dy}`] ?? 0;
        if (neighborElev <= elev) continue;

        const adj1 = map[`${x+dx},${y}`] ?? 0;
        const adj2 = map[`${x},${y+dy}`] ?? 0;
        if (adj1 > elev || adj2 > elev) continue;

        const delta = neighborElev - elev;
        const alpha = BASE_GRADIENT_STRENGTH * Math.min(1, 0.2 + delta * 0.15);

        const oppCorner = OPPOSITE_CORNER[corner];
        const { rotation, ax, ay } = CORNER_ROTATIONS[oppCorner];

        const sprite = new PIXI.Sprite(cornerTex);
        sprite.width = sprite.height = GRID;
        sprite.alpha = alpha;
        sprite.rotation = rotation;
        sprite.anchor.set(ax, ay);

        const px = x * GRID;
        const py = y * GRID;
        const xOff = (oppCorner === 'br' || oppCorner === 'bl') ? -GRID : 0;
        const yOff = (oppCorner === 'tr' || oppCorner === 'br') ? -GRID : 0;

        sprite.x = px + (ax * GRID) + xOff;
        sprite.y = py + (ay * GRID) + yOff;
        gradientContainer.addChild(sprite);
      }
    }

    // 3. CONTOUR LINES 
    const drawnEdges = new Set();
    for (const [key, elev] of Object.entries(map)) {
      const [x, y] = key.split(',').map(Number);
      
      for (const { dx, dy } of [{dx:0, dy:-1}, {dx:1, dy:0}, {dx:0, dy:1}, {dx:-1, dy:0}]) {
        const neighborElev = map[`${x+dx},${y+dy}`] ?? 0;
        if (neighborElev === elev) continue;

        const side = dx === 1 ? 'r' : dx === -1 ? 'l' : dy === 1 ? 'b' : 't';
        const edgeKey = side === 'r' ? `v:${x+1},${y}` : side === 'l' ? `v:${x},${y}` : side === 'b' ? `h:${x},${y+1}` : `h:${x},${y}`;
        if (drawnEdges.has(edgeKey)) continue;
        drawnEdges.add(edgeKey);

        const isV = side === 'r' || side === 'l';
        const lx1 = isV ? (x + (side === 'r' ? 1 : 0)) * GRID : x * GRID;
        const ly1 = isV ? y * GRID : (y + (side === 'b' ? 1 : 0)) * GRID;
        const lx2 = isV ? lx1 : (x + 1) * GRID;
        const ly2 = isV ? (y + 1) * GRID : ly1;

        graphics.lineStyle(2, 0xffffff, CONTOUR_LIGHT_ALPHA);
        graphics.moveTo(lx1, ly1).lineTo(lx2, ly2);
        graphics.lineStyle(2, 0x000000, CONTOUR_DARK_ALPHA);
        graphics.moveTo(lx1, ly1).lineTo(lx2, ly2);
      }
    }

    canvas.primary.addChild(container);
};

//helper to render colored tiles based on square's elevation
export const renderColorTiles = () => {
    const existing = canvas.primary.getChildByName(ELEVATION_OVERLAY_NAME);
    if (existing) existing.destroy({ children: true, texture: false });

    const map = getElevationMap();
    if (!Object.keys(map).length) return;

    const GRID = canvas.grid.size;
    const container = new PIXI.Container();
    container.name = ELEVATION_OVERLAY_NAME;

    const graphics = new PIXI.Graphics();
    container.addChild(graphics);
    const squares = getSquaresWithElevation();

    graphics.clear();

    for (const square of squares) {
      const color = getElevationColor(square.elevation);

        graphics.beginFill(color, game.settings.get(MODULE_ID, `ColorTileOpacity`));
        graphics.drawRect(square.x * GRID, square.y * GRID, GRID, GRID);
        graphics.endFill();
    };

    canvas.primary.addChild(container);
}

//helper to render numbers in corner of squares
export const renderNumbers = () => {
  const existingText = canvas.stage.getChildByName('elevation-labels-container');
  if (existingText) canvas.stage.removeChild(existingText);

  const container = new PIXI.Container();
  container.name = 'elevation-labels-container';
  canvas.stage.addChild(container);

  const squares = getSquaresWithElevation();
  
  squares.forEach(square => {
    const elevation = square.elevation;
    if (elevation === 0) return;

    const text = new PIXI.Text(elevation.toString(), {
      fontFamily: 'Arial',
      fontSize: Math.round(canvas.grid.size * 0.15),
      fontWeight: 'normal',
      fill: (game.settings.get(MODULE_ID, 'NumberOverlayColor') ? getElevationColor(elevation) : 0x000000),
      stroke: 0x000000,
      strokeThickness: (game.settings.get(MODULE_ID, 'NumberOverlayColor') ? 2 : 0),
      align: 'center'
    });

    text.anchor.set(0, 0);
    text.x = square.x * canvas.grid.size;
    text.y = square.y * canvas.grid.size;
    text.zIndex = 1000;
    text.alpha = 0.6;

    container.addChild(text);
  });

  container.sortChildren();
}

//overlay re-render processing
Hooks.on('updateScene', (scene, delta) => {
  if (scene.id !== canvas.scene?.id) return;
  
  const elevationChanged = foundry.utils.hasProperty(
    delta, 
    `flags.${MODULE_ID}.${ELEVATION_FLAG_KEY}`
  ) || foundry.utils.hasProperty(
    delta,
    `flags.${MODULE_ID}.-=${ELEVATION_FLAG_KEY}`
  );

  if (!elevationChanged) return;

  renderElevationOverlay();
});


/* -------------------------------------------------- */
/*   Scene Button Methods                             */
/* -------------------------------------------------- */


// "Elevation Painter"
export const selectForAssignment = async () => {
  ui.notifications.info('Click/drag squares to paint elevation.');
  const result = await selectSquares({ useElevation: true});

  if (!result || !result.squares || result.squares.length === 0) {
    ui.notifications.warn('No squares selected.');
    if (result?.cleanup) result.cleanup();
    return;
  }

  const { squares, cleanup } = result;

  try {
    const map = foundry.utils.deepClone(getElevationMap())
    for (const square of squares) {
      const key = toKey(square);
      if (square.elevation === 0) delete map[key];
      else map[key] = square.elevation;
    }
    await setElevationMap(map);
    renderElevationOverlay();
  } finally {
    cleanup();
  }
};

// "Elevation Eraser"
export const selectForClearing = async () => {
    ui.notifications.info('Click squares to select them.');

  const result = await selectSquares();
  if (!result || !result.squares || result.squares.length === 0) {
    ui.notifications.warn('No squares selected.');
    if (result && result.cleanup) result.cleanup();
    return;
  }

  const { squares, cleanup } = result;
  try {
    const map = foundry.utils.deepClone(getElevationMap());
    for (const square of squares) {
      delete map[toKey(square)];
    }
    await setElevationMap(map);
    renderElevationOverlay();
  } finally {
    cleanup();
  }
};

// "Clear Scene Elevation"
export const clearElevationOverlay = () => {
    const existing = canvas.primary.getChildByName(ELEVATION_OVERLAY_NAME);
    if (existing) existing.destroy({ children: true, texture: false });
};

// "Check Elevation"
export const checkSquareElevation = async () => {
  ui.notifications.info('Hover to check elevations. Press Escape to exit.');
  return new Promise((resolve) => {
    const stage = canvas.app.stage;
    const graphics = new PIXI.Graphics();
    const overlay = new PIXI.Container();

    const GRID = canvas.grid.size;
    
    // Create a floating label to show the elevation number
    const label = new PIXI.Text("", {
      fontFamily: 'Arial',
      fontSize: Math.ceil(GRID * 0.5),
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 4,
      fontWeight: 'bold'
    });

    overlay.interactive = true;
    overlay.eventMode = 'static';
    overlay.hitArea = new PIXI.Rectangle(0, 0, canvas.dimensions.width, canvas.dimensions.height);
    
    stage.addChild(graphics);
    stage.addChild(label);
    stage.addChild(overlay);

    

    const drawHighlights = (hoverSquare, mousePos) => {
      graphics.clear();
      
      const hoverElevation = getSquareElevation(hoverSquare);
      const color = getElevationColor(hoverElevation);
      
      // Update the floating label
      label.text = `${hoverElevation}`;
      label.x = mousePos.x; // Offset from cursor
      label.y = mousePos.y - GRID * 0.5;
      label.style.fill = color;

      // Highlight all squares with the same elevation
      const map = getElevationMap();
      
      // We always draw the hover square, even if elevation is 0
      graphics.lineStyle(4, color, 0.8);
      
      // Find all matches
      for (const [key, elev] of Object.entries(map)) {
        if (elev === hoverElevation && elev !== 0) {
          const [x, y] = key.split(',').map(Number);
          graphics.beginFill(color, 0.3);
          graphics.drawRect(x * GRID, y * GRID, GRID, GRID);
          graphics.endFill();
        }
      }

      // Special highlight for the square currently under the mouse
      graphics.lineStyle(6, 0xffffff, 0.5);
      graphics.drawRect(hoverSquare.x * GRID, hoverSquare.y * GRID, GRID, GRID);
    };

    const onPointerMove = (event) => {
      const mousePos = event.data.getLocalPosition(stage);
      const hoverSquare = {
        x: Math.floor(mousePos.x / GRID),
        y: Math.floor(mousePos.y / GRID)
      };
      drawHighlights(hoverSquare, mousePos);
    };

    const cleanup = () => {
      overlay.off('pointermove', onPointerMove);
      stage.removeChild(overlay);
      stage.removeChild(graphics);
      stage.removeChild(label);
      document.removeEventListener('keydown', onKeyDown);
      resolve();
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        cleanup();
      }
    };

    overlay.on('pointermove', onPointerMove);
    document.addEventListener('keydown', onKeyDown);
  });
};


/* -------------------------------------------------- */
/* ADD EDGE WHEN STANDING ABOVE TARGET                */
/* -------------------------------------------------- */
Hooks.once('ready', () => {

  //hijack the Draw Steel systems' getTargetModifiers and add an additional case to inject an edge when the user is fully above the target
  const AbilitySystem = CONFIG.Item.dataModels?.ability;
  if (!AbilitySystem) {
    console.warn(`${MODULE_ID} | Could not find Draw Steel ability data model — elevation edge hook skipped.`);
    return;
  }

  // Store the original method
  const _original = AbilitySystem.prototype.getTargetModifiers;

  //override the method with new condition
  AbilitySystem.prototype.getTargetModifiers = function(target) {
    const modifiers = _original.call(this, target);

    const userToken = canvas.tokens.controlled.find(t => t.actor === this.actor)
      ?? canvas.tokens.placeables.find(t => t.actor === this.actor);

    if (userToken && target) {
      const userElevation   = userToken.document.elevation ?? 0;
      const targetElevation = target.document?.elevation ?? target.elevation ?? 0;
      const targetSize = target.actor?.system?.combat?.size?.value ?? 1;

      if ((targetElevation + targetSize) <= userElevation) {
        modifiers.edges += 1;
        if (game.settings.get(MODULE_ID, 'HighGroundReminder')) ui.notifications.info(`${userToken.actor.name} attacks ${target.actor.name} from high ground, gaining an edge on the attack.`);
      }
    }
    return modifiers;
  };

  console.log(`${MODULE_ID} | Elevation edge hook registered on Draw Steel ability system.`);
});
