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
let mouse_position = new Vector();
const fps_reset_rate = 2e-2;

//This is the set of constants for the AI

const c = [
    2.0,
    19747.503437827723,
    30.6054931693623,
    1.420893725130041,
    161.86180785470265,
    1.116318532551359,
    91.43356691977756,
    1.337119497748945,
    97.75351816169501,
    1.1645158852000133,
    0.0,
    1.8951588495928302,
    0.0,
    1.6796029606935776,
    1.15070992304737,
    1.1091200835768333,
    1.682328377463139,
    1.8270480973339343,
    0.6580105631614104,
    1.0,
    0.9400609205891134,
    1.0,
    1.1065269148954069,
    2.0,
    0.5667614853389948,
    2.0,
    102.41435168450025,
    4.0,
    6.0,
    9.577048531766428,
    22.62230017174059,
    22.19262960578817,
    12.240252379993821,
    15.520887296916765
];

//Do initial setup steps for the game/game window
resizeCanvas();
Game.analyzeGameConfiguration();

//Create the game and AI
let game = new Game(true);
let ai = new AI(c, game.getAIShipData());

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
    if (isNaN(delay) || delay == 0) {
        return;
    }

    //Updates the game/AI settings
    updateSettings();

    //For the tab-out glitch where it freezes the webpage, we will have the following quick fix
    delay = Math.min(delay, 60);

    //Applies user controls
    user_input.applyControls();

    //Updates AI decisions and applies input to the game
    if (settings.ai) {
        ai.update(delay);
        ai.applyControls();
        controls.teleport = false;
    }

    //Based on settings.game_speed, we update to allow for precise collision code and simultaneously whatever speed the player wants the game to run
    let iteration_updates = config.game_precision * settings.game_speed;
    for (let i = 0; i < iteration_updates; i++) {
        //Updates the game and creates a new game if the player chose to restart the game
        let done = game.update(delay / config.game_precision);
        //If the game-over screen was exited, we reset the game
        if (done) {
            game = new Game();
        }
    }

}

//Draws the game
function draw() {
    ctx.clearRect(0, 0, canvas_bounds.width, canvas_bounds.height);
    game.drawGame();
    if (settings.ai_settings.show_strategy) {
        ai.drawDebug();
    }
    game.drawOverlay();
}

//The game loop is created and executed
function loop(timestamp) {
    //Manage the FPS tracker
    seconds_passed = (timestamp - old_timestamp) / 1000;
    old_timestamp = timestamp;
    if (settings.debug.show_game_data) {
        if (fps_cooldown <= 0) {
            fps = 1 / seconds_passed;
            fps_cooldown = 1;
        }
        fps_cooldown = Math.max(0, fps_cooldown - fps_reset_rate);
    }
    //Update/draw the game and AI debug
    update(seconds_passed * 60);
    draw();
    window.requestAnimationFrame(loop);
}
loop();

canvas.addEventListener("mousemove", (evt) => {
    mouse_position = new Vector(evt.clientX - canvas_bounds.left, evt.clientY - canvas_bounds.top);
});