//Settings, including debug settings, ai settings, and game speed settings
const settings = {
    game_precision: 25,
    game_speed: 1,
    debug: {
        show_hitboxes: false,
        show_positions: false,
        show_velocity: false,
        show_acceleration: false,
        remove_particles: false,
        show_game_data: false
    }
};

//Checks if we enabled all debug settings in the previous iteration
let previous_enable_all_debug = false;

//Updates the settings based on what boxes are checked and what values the user enters
function updateSettings() {
    
    const game_speed = document.getElementById("game-speed-input").value;
    if (!isNaN(game_speed) && game_speed != 0)
        settings.game_speed = game_speed;
    
    //check if we enabled all debug settings
    const enable_all_debug = document.getElementById("game-enable-all-debug-input").checked;
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

    if (!enable_all_debug) {
        settings.debug.show_hitboxes = document.getElementById("game-hitbox-input").checked;
        settings.debug.show_positions = document.getElementById("game-position-input").checked;
        settings.debug.show_velocity = document.getElementById("game-velocity-input").checked;
        settings.debug.show_acceleration = document.getElementById("game-acceleration-input").checked;
        settings.debug.remove_particles = document.getElementById("game-particles-input").checked;
        settings.debug.show_game_data = document.getElementById("game-data-input").checked;
    } else {
        for (let i in settings.debug)
            settings.debug[i] = true;
    }

}