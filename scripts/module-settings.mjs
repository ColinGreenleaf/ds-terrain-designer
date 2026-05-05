
const MODULE_ID = 'ds-terrain-designer';
const elevations = ["-2", "-1", "1", "2", "3", "4", "5", "6"]
const defaultElevationColors = { 
        "-2": '#00b118', 
        "-1": '#7bff00', 
        "1": '#ffff00', 
        "2": '#ff8800', 
        "3": '#ff0000', 
        "4": '#ff00ff', 
        "5": '#00ffff', 
        "6": '#003cff'
    }


export const registerSettings = () => {
    console.log('registering settings')
  const reloadOnChange = { onChange: () => SettingsConfig.reloadConfirm({ world: true }) };

    game.settings.register(MODULE_ID, "OverlayVisualization", {
        name: `${MODULE_ID}.Settings.OverlayVisualization.Name`,
        hint: `${MODULE_ID}.Settings.OverlayVisualization.Hint`,
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        ...reloadOnChange
    });

    game.settings.register(MODULE_ID, 'OverlayStyle', {
        name: `${MODULE_ID}.Settings.OverlayStyle.Name`,
        hint: `${MODULE_ID}.Settings.OverlayStyle.Hint`,
        scope: "world", config: true, type: String,
        choices: {
        'gradient': `${MODULE_ID}.Settings.OverlayStyle.Choice.gradient`,
        'color': `${MODULE_ID}.Settings.OverlayStyle.Choice.color`,
        },
        default: 'gradient',
        ...reloadOnChange
    });

    game.settings.register(MODULE_ID, "NumberOverlay", {
        name: `${MODULE_ID}.Settings.NumberOverlay.Name`,
        hint: `${MODULE_ID}.Settings.NumberOverlay.Hint`,
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        ...reloadOnChange
    });
    game.settings.register(MODULE_ID, "NumberOverlayColor", {
        name: `${MODULE_ID}.Settings.NumberOverlayColor.Name`,
        hint: `${MODULE_ID}.Settings.NumberOverlayColor.Hint`,
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        ...reloadOnChange        
    });

    for (const elevation of elevations) {
        game.settings.register(MODULE_ID, `ElevationColor${elevation}`, {
        name: `Elevation ${elevation} Color`,
        scope: "world",
        config: true,
        type: String,
        default: defaultElevationColors[elevation],
        ...reloadOnChange
    });
    }

    game.settings.register(MODULE_ID, 'ColorTileOpacity', {
        name: "Color Tile Opacity", hint: "choose the opacity of the color overlay when enabled",
        scope: 'world', 
        config: true,
        type: Number, 
        default: 0.3, 
        range: { min: 0, max: 1, step: 0.05 }, 
        ...reloadOnChange
    });


    Hooks.on("renderSettingsConfig", (app, html) => {
          const root = html instanceof HTMLElement ? html : html[0]; // handle either case
        for (const key of elevations) {
            const input = root.querySelector(`input[name="${MODULE_ID}.ElevationColor${key}"]`);
            if (input) input.setAttribute("type", "color");
        }
    });

};
