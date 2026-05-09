// const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;


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

    game.settings.register(MODULE_ID, "ElevationScaling", {
        name: `${MODULE_ID}.Settings.ElevationScaling.Name`,
        hint: `${MODULE_ID}.Settings.ElevationScaling.Hint`,
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        ...reloadOnChange
    });

    game.settings.register(MODULE_ID, "HighGroundReminder", {
        name: `${MODULE_ID}.Settings.HighGroundReminder.Name`,
        hint: `${MODULE_ID}.Settings.HighGroundReminder.Hint`,
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
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

    game.settings.register(MODULE_ID, 'ColorTileOpacity', {
        name: `${MODULE_ID}.Settings.ColorOpacity.Name`,
        hint: `${MODULE_ID}.Settings.ColorOpacity.Hint`,
        scope: 'world', 
        config: true,
        type: Number, 
        default: 0.3, 
        range: { min: 0, max: 1, step: 0.05 }, 
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


    game.settings.registerMenu(MODULE_ID, 'ElevationColorMenu', {
    name: `${MODULE_ID}.Settings.ElevationColorMenu.Name`, label: `${MODULE_ID}.Settings.ElevationColorMenu.Label`,
    hint: `${MODULE_ID}.Settings.ElevationColorMenu.Hint`,
    icon: 'fas fa-palette', type: ElevationColorSettingsMenu, restricted: true,
  });

    for (const elevation of elevations) {
        game.settings.register(MODULE_ID, `ElevationColor${elevation}`, {
            name: `Elevation ${elevation} Color`,
            scope: "world",
            config: false,
            type: String,
            default: defaultElevationColors[elevation],
            ...reloadOnChange
        });
    }    

    game.settings.register(MODULE_ID, 'TerrainStyle', {
        name: `${MODULE_ID}.Settings.TerrainStyle.Name`,
        hint: `${MODULE_ID}.Settings.TerrainStyle.Hint`,
        scope: "world", config: true, type: String,
        choices: {
        'light': `${MODULE_ID}.Settings.TerrainStyle.Choice.light`,
        'dense': `${MODULE_ID}.Settings.TerrainStyle.Choice.dense`,
        },
        default: 'dense',
        ...reloadOnChange
    });

    game.settings.register(MODULE_ID, `TerrainColor`, {
        name: `Difficult Terrain Color`,
        scope: "world",
        config: true,
        type: String,
        default: '#000000',
        ...reloadOnChange
    });


    Hooks.on("renderSettingsConfig", (app, html) => {
          const root = html instanceof HTMLElement ? html : html[0];

        //convert elevation color settings to color selects
        for (const key of elevations) {
            const input = root.querySelector(`input[name="${MODULE_ID}.ElevationColor${key}"]`);
            if (input) input.setAttribute("type", "color");
        }

        //convert difficult terrain color settings to color selects
        const input = root.querySelector(`input[name="${MODULE_ID}.TerrainColor"]`);
            if (input) input.setAttribute("type", "color");


        //inject headers to separate setting sections
        var secTop = html.querySelector(`select[name="${MODULE_ID}.OverlayStyle"]`)
            .closest('.form-group');
        if (secTop) {
        const row = secTop.closest('.form-group');
        row.insertAdjacentHTML('beforebegin', '<p style="font-size: 20px;">Elevation Overlay Config</p>');
        }   

        secTop = html.querySelector(`select[name="${MODULE_ID}.TerrainStyle"]`)
            .closest('.form-group');
        if (secTop) {
        const row = secTop.closest('.form-group');
        row.insertAdjacentHTML('beforebegin', '<p style="font-size: 20px;">Difficult Terrain Config</p>');
        }   
    });
};


class SettingsSubmenu extends ds.applications.api.DSApplication {
    static DEFAULT_OPTIONS = {
        tag: 'form',
        classes:  ['draw-steel'],
        window:   { minimizable: false, resizable: true },
        position: { width: 640, height: 'auto' },
        form: {
            handler: this._onSubmit,
            submitOnChange: false,
            closeOnSubmit: true
        }
    };

    static PARTS = {
        form: { template: 'modules/ds-terrain-designer/templates/elevation-color-submenu.hbs' },
    };

    static get regularKeys() { return []; }

    async _prepareContext(_options) {
        const items = this.constructor.regularKeys.map(key => {
            const setting = game.settings.settings.get(`${MODULE_ID}.${key}`);
            return {
            key: key,
            name: game.i18n.localize(setting.name),
            value: game.settings.get(MODULE_ID, key)
            };
        });
        return { items };
    } 

    static async _onSubmit(event, form, formData) {
        const updates = Object.entries(formData.object).map(([key, value]) => {
        return game.settings.set(MODULE_ID, key, value);
        });
        
        await Promise.all(updates);
        
        SettingsConfig.reloadConfirm({ world: true });
    }

    static async updateObject(event, formData) {
        const updates = Object.entries(formData.object).map(([key, value]) => {
            return game.settings.set(MODULE_ID, key, value);
        });

        await Promise.all(updates);

        SettingsConfig.reloadConfirm({ world: true });
    }
}

export class ElevationColorSettingsMenu extends SettingsSubmenu {
  static DEFAULT_OPTIONS = {
    id:     'ds-terrain-designer-elevation-colors',
    window: { title: 'Set Elevation Colors' },
  };

  static get regularKeys() {
    return elevations.map(e => `ElevationColor${e}`)
  }
}

