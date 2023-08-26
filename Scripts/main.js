//Some basic canvas rendering variables
const canvas = document.getElementById("canvas");
const side_bar = document.getElementById("side-bar");
const ctx = canvas.getContext("2d");
const user_input = new UserInput();
let canvas_bounds = canvas.getBoundingClientRect();
let old_timestamp = 0;

//FPS tracking information
let fps = 0;
let fps_cooldown = 0;
const fps_reset_rate = 2e-2;

//This is the set of constants for the AI
const C = [2,0,2.5e-2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

//Do initial setup steps for the game/game window
resizeCanvas();
Asteroid.analyzeAsteroidConfigurations();
Saucer.analyzeSaucerConfigurations();

//Objects for the game and the ai
let game = new Game(true);
let ai = new AI(C);

//Resizes the HTML5 canvas when needed
function resizeCanvas() {
    canvas.width = window.innerWidth - side_bar.getBoundingClientRect().width;
    canvas.height = window.innerHeight;
    canvas_bounds = canvas.getBoundingClientRect();
}
window.addEventListener("resize", resizeCanvas);

//Updates the game
function update(delay) {

    //Deals with boundary cases for the delay
    if (isNaN(delay) || delay == 0) return;

    //Updates the game/AI settings
    updateSettings();

    //Applies user controls
    user_input.applyControls();

    //Updates AI decisions and applies input to the game
    if (settings.ai) {
        ai.update(delay);
        ai.applyControls();
        controls.teleport = false;
    }

    //Based on settings.game_speed, we update to allow for precise collision code and simultaneously whatever speed the player wants the game to run
    const iteration_updates = settings.game_precision * settings.game_speed;
    for (let i = 0; i < iteration_updates; i++) {
        //Updates the game and creates a new game if the player chose to restart the game
        const done = game.update(delay / settings.game_precision);
        //If the game-over screen was exited, we reset the game
        if (done)
            game = new Game();
    }

}

//Draws the game
function draw() {
    ctx.clearRect(0, 0, canvas_bounds.width, canvas_bounds.height);
    game.drawGame();
    if (settings.ai_settings.show_strategy)
        ai.drawDebug();
    game.drawOverlay();
    if (settings.ai_settings.show_strategy)
        ai.drawDebugOverlay();
}

//The game loop is created and executed
function loop(timestamp) {
    //Manage the FPS tracker
    seconds_passed = (timestamp - old_timestamp) / 1000;
    old_timestamp = timestamp;
    if (settings.debug.show_game_data) {
        if (fps_cooldown <= 0)
            fps = 1 / seconds_passed, fps_cooldown = 1;
        fps_cooldown = Math.max(0, fps_cooldown - fps_reset_rate);
    }
    //Update/draw the game and AI debug
    update(seconds_passed * 60);
    draw();
    window.requestAnimationFrame(loop);
}
loop();