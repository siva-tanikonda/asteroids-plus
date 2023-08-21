//Some basic canvas rendering variables
const canvas = document.getElementById("canvas");
const side_bar = document.getElementById("side-bar");
const ctx = canvas.getContext("2d");
const user_input = new UserInput();
let canvas_bounds = canvas.getBoundingClientRect();
let old_timestamp = 0;

//Some debugging information
let fps = 0;
let fps_cooldown = 0;
const fps_reset_rate = 2e-2;

//This is the set of constants for the AI
const C = [2,0,45.89217003925497,1,106.05230385515718,1,31.89765204328199,1,0,1,0.3990388120192756,1,0.09561219769120652,2,0.06466617138349005,2,0.7150548981550583,2,0.08641493593917365,2,0.22039000459263447,2,0,18,15,0.5693706616929236,0,2,125.58715358642553,1];
//Do initial setup steps for the game
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

    //Basic rules for the update function
    if (isNaN(delay) || delay == 0) return;

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