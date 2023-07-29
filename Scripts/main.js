//Some basic canvas rendering variables
const canvas = document.getElementById("canvas");
const side_bar = document.getElementById("side-bar");
const ctx = canvas.getContext("2d");
const user_input = new UserInput();
let canvas_bounds = canvas.getBoundingClientRect();
let old_timestamp = 0;
let tab_active = true;

//Some debugging information
let fps = 0;
let fps_cooldown = 0;
const fps_reset_rate = 2e-2;

//This is the set of constants for the AI
const C = [2,0,20.347315227046543,1,0,1,0,1,0.1792592281077181,2,1.0138420224227627,2,0.4886581378310931,1,0.6519775450959715,1,2,1,0.2493080966138037,2,121,74,38,1000];
//Do initial setup steps for the game
resizeCanvas();
Asteroid.analyzeAsteroidConfigurations();
Saucer.analyzeSaucerConfigurations();

//Objects for the game and the ai
let game = new Game(true);
let ai = new AI(C);

//Check if the tab is active or not
window.onfocus = () => { tab_active = true; };
window.onblur = () => { tab_active = false; };
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState == "visible")
        tab_active = true;
    else
        tab_active = false;
});

//Resizes the HTML5 canvas when needed
function resizeCanvas() {
    canvas.width = window.innerWidth - side_bar.getBoundingClientRect().width;
    canvas.height = window.innerHeight;
    canvas_bounds = canvas.getBoundingClientRect();
}
window.addEventListener("resize", resizeCanvas);

//Updates the game
function update(delay) {

    //Basic rules for the update function
    if (isNaN(delay) || delay == 0 || !tab_active) return;

    updateSettings();

    //Updates AI decisions and applies input to the game
    user_input.applyControls();
    if (settings.ai) {
        ai.update(delay);
        ai.applyControls();
        controls.teleport = false;
    }

    const iteration_updates = settings.game_precision * settings.game_speed;
    //Based on settings.game_speed, we update to allow for precise collision code and simultaneously whatever speed the player wants the game to run
    for (let i = 0; i < iteration_updates; i++) {
        //Updates the game and creates a new game if the player chose to restart the game
        const done = game.update(delay / settings.game_precision);
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
    seconds_passed = (timestamp - old_timestamp) / 1000;
    old_timestamp = timestamp;
    if (settings.debug.show_game_data) {
        if (fps_cooldown <= 0)
            fps = 1 / seconds_passed, fps_cooldown = 1;
        fps_cooldown = Math.max(0, fps_cooldown - fps_reset_rate);
    }
    update(seconds_passed * 60);
    draw();
    window.requestAnimationFrame(loop);
}
loop();