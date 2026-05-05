import {selectForAssignment, selectForClearing, clearAllElevations, checkSquareElevation} from "./elevation.mjs";
import {paintDifficultTerrain, eraseDifficultTerrain, clearAllTerrain} from "./terrain.mjs";


export const registerModuleButtons = () => {    
    Hooks.on('getSceneControlButtons', (controls) => {

        controls["elevationControls"] = {
        name: "elevationControls",
        order: Object.keys(controls).length + 1,
        title: "Terrain Designer Tools",
        layer: "elevationControls",
        icon: "fas fa-mountain",
        visible: true,

        tools: {
            'elevation': {
                name: 'elevation',
                title: 'Elevation Painter',
                icon: 'fas fa-arrow-up',
                button: true,
                visible: game.user.isGM,
                onClick: () => {selectForAssignment()}
            },
            'clear-elevation': {
                name: 'clear-elevation',
                title: 'Elevation Eraser',
                icon: 'fas fa-eraser',
                button: true,
                visible: game.user.isGM,
                onClick: () => {selectForClearing()}
            },
            'clear-all-elevation': {
                name: 'clear-all-elevation',
                title: 'Clear Scene Elevation',
                icon: 'fas fa-trash-alt',
                button: true,
                visible: game.user.isGM,
                onClick: () => {clearAllElevations()}
            },
            // 'check-elevation': {
            //     name: 'check-elevation',
            //     title: 'Check Elevation',
            //     icon: 'fas fa-search',
            //     button: true,
            //     visible: game.user.isGM,
            //     onClick: () => {checkSquareElevation()}
            // },
            'terrain': {
                name: 'terrain',
                title: 'Difficult Terrain Painter',
                icon: 'fas fa-hill-rockslide',
                button: true,
                visible: game.user.isGM,
                onClick: () => {paintDifficultTerrain()}
            },
            'clear-terrain': {
                name: 'clear-terrain',
                title: 'Difficult Terrain Eraser',
                icon: 'fas fa-eraser',
                button: true,
                visible: game.user.isGM,
                onClick: () => {eraseDifficultTerrain()}
            },
            'clear-all-terrain': {
                name: 'clear-all-terrain',
                title: 'Clear Scene Difficult Terrain',
                icon: 'fas fa-trash-alt',
                button: true,
                visible: game.user.isGM,
                onClick: () => {clearAllTerrain()}
            },
        }
    }

    });

}