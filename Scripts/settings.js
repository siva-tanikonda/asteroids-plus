//Settings, including debug settings, ai settings, and game speed settings
const settings = {
    game_precision: 25,
    game_speed: 1,
    show_hitboxes: false,
    show_positions: false,
    show_velocity: false,
    show_acceleration: false,
    show_game_data: false,
    show_ai_debug: false
};

//Updates the settings based on what boxes are checked and what values the user enters
function updateSettings() {
    
    const game_speed = document.getElementById("game-speed-input").value;
    if (!isNaN(game_speed) && game_speed != 0)
        settings.game_speed = game_speed;
    
    settings.show_hitboxes = document.getElementById("game-hitbox-input").checked;
    settings.show_positions = document.getElementById("game-position-input").checked;
    settings.show_velocity = document.getElementById("game-velocity-input").checked;
    settings.show_acceleration = document.getElementById("game-acceleration-input").checked;
    settings.show_game_data = document.getElementById("game-data-input").checked;

}