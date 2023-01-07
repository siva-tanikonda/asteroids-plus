//Settings, including debug settings, ai settings, and game speed settings
var settings = {
    game_precision: 25,
    game_speed: 1,
    ai_playing: false,
    show_hitboxes: false,
    show_positions: false,
    show_velocity: false,
    show_acceleration: false,
    show_game_data: false,
    show_ai_debug: false
};

//Updates the settings based on what boxes are checked and what values the user enters
function updateSettings() {
    
    var game_speed = document.getElementById("game-speed-input").value;
    if (!isNaN(game_speed) && game_speed != 0)
        settings.game_speed = game_speed;
    
    settings.show_hitboxes = document.getElementById("game-hitbox-input").checked;
    settings.show_positions = document.getElementById("game-position-input").checked;
    settings.show_velocity = document.getElementById("game-velocity-input").checked;
    settings.show_acceleration = document.getElementById("game-acceleration-input").checked;
    settings.ai_playing = document.getElementById("game-ai-input").checked;
    settings.show_game_data = document.getElementById("game-data-input").checked;
    var ai_debug_input = document.getElementById("game-ai-debug-input");
    var ai_debug_text = document.getElementById("game-ai-debug-text");
    ai_debug_input.disabled = !settings.ai_playing;
    if (ai_debug_input.disabled)
        ai_debug_text.style.opacity = 0.5;
    else
        ai_debug_text.style.opacity = 1;
    if (!settings.ai_playing)
        ai_debug_input.checked = false;
    settings.show_ai_debug = ai_debug_input.checked;

}