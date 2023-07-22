//Settings, including debug settings, ai settings, and game speed settings
const settings = {
    game_precision: 25,
    game_speed: 1,
    remove_particles: false,
    debug: {
        show_hitboxes: false,
        show_positions: false,
        show_velocity: false,
        show_acceleration: false,
        show_game_data: false
    },
    ai: false,
    ai_settings: {
        show_strategy: false
    }
};

//Checks if we enabled all debug settings in the previous iteration
let previous_enable_all_debug = false;
let previous_ai_enabled = false;

//Updates the settings based on what boxes are checked and what values the user enters
function updateSettings() {
    
    const game_speed = document.getElementById("game-speed-input").value;
    if (!isNaN(game_speed) && game_speed != 0)
        settings.game_speed = game_speed;
    
    //check if we enabled all debug settings
    const enable_all_debug = document.getElementById("game-enable-all-debug-input").checked;
    document.getElementById("game-enable-all-debug-input").blur();
    if (enable_all_debug && !previous_enable_all_debug) {
        const elements = document.getElementById("debug-settings-container").children;
        for (let i = 0; i < elements.length; i++) {
            const items = elements[i].children;
            for (let j = 0; j < items.length; j++) {
                items[j].disabled = true;
                items[j].style.opacity = "0.5";
            }
        }
    } else if (!enable_all_debug && previous_enable_all_debug) {
        const elements = document.getElementById("debug-settings-container").children;
        for (let i = 0; i < elements.length; i++) {
            const items = elements[i].children;
            for (let j = 0; j < items.length; j++) {
                items[j].disabled = false;
                items[j].style.opacity = "1";
            }
        }
    }
    previous_enable_all_debug = enable_all_debug;

    //Manage debug settings
    if (!enable_all_debug) {
        settings.debug.show_hitboxes = document.getElementById("game-hitbox-input").checked;
        settings.debug.show_positions = document.getElementById("game-position-input").checked;
        settings.debug.show_velocity = document.getElementById("game-velocity-input").checked;
        settings.debug.show_acceleration = document.getElementById("game-acceleration-input").checked;
        settings.debug.show_game_data = document.getElementById("game-data-input").checked;
        document.getElementById("game-hitbox-input").blur();
        document.getElementById("game-position-input").blur();
        document.getElementById("game-velocity-input").blur();
        document.getElementById("game-acceleration-input").blur();
        document.getElementById("game-data-input").blur();
    } else {
        for (let i in settings.debug)
            settings.debug[i] = true;
    }

    //Check if we have particles on or off
    settings.remove_particles = document.getElementById("game-particles-input").checked;
    document.getElementById("game-particles-input").blur();

    //Manage AI toggling
    settings.ai = document.getElementById("game-ai-input").checked;
    document.getElementById("game-ai-input").blur();
    if (settings.ai && !previous_ai_enabled)
        document.getElementById("ai-settings-container").hidden = false;
    else if (!settings.ai && previous_ai_enabled)
        document.getElementById("ai-settings-container").hidden = true;
    previous_ai_enabled = settings.ai;

    //Manage AI settings
    settings.ai_settings.show_strategy = document.getElementById("game-ai-strategy-input").checked;
    document.getElementById("game-ai-strategy-input").blur();
    if (!settings.ai)
        settings.ai_settings.show_strategy = false;

}