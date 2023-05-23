//Some basic canvas rendering variables
var canvas = document.getElementById("canvas");
var side_bar = document.getElementById("side-bar");
var canvas_bounds = canvas.getBoundingClientRect();
var ctx = canvas.getContext("2d");
var user_input = new UserInput();
var old_timestamp = 0;
var tab_active = true;

//Some debugging information
var fps = 0;
var fps_cooldown = 0;
var fps_reset_rate = 2e-2;

//Set anti-aliasing to high
ctx.imageSmoothingLevel = 'high';

//Do initial setup steps for the game
resizeCanvas();
Asteroid.analyzeAsteroidConfigurations();
Saucer.analyzeSaucerConfigurations();

//Objects for the game and the ai
var game = new Game(true);
var ai = new AI();

//Resizes the HTML5 canvas when needed
function resizeCanvas() {
    canvas.width = window.innerWidth - side_bar.getBoundingClientRect().width;
    canvas.height = window.innerHeight;
    canvas_bounds = canvas.getBoundingClientRect();
}
window.addEventListener("resize", resizeCanvas);

//Check if the tab is active or not
window.onfocus = () => { tab_active = true; };
window.onblur = () => { tab_active = false; };
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState == "visible")
        tab_active = true;
    else
        tab_active = false;
});

//Updates the game
function update(delay) {

    //Basic rules for the update function
    if (isNaN(delay) || delay == 0 || !tab_active) return;

    updateSettings();

    //Based on settings.game_speed, we update to allow for precise collision code and simultaneously whatever speed the player wants the game to run
    var iterations = settings.game_precision * settings.game_speed;
    for (var i = 0; i < iterations; i++) {

        //If the ai is playing, update the ai
        if (settings.ai_playing)
            ai.update(delay / settings.game_precision);

        //Updates user inputs based on whether the ai or player is playing
        if (!settings.ai_playing)
            user_input.applyControls();
        else
            ai.applyControls();

        //Updates the game and creates a new game if the player chose to restart the game
        var done = game.update(delay / settings.game_precision);
        if (done)
            this.game = new Game();
        
        resetControls();

    }

}

//Draws the game
function draw() {
    ctx.clearRect(0, 0, canvas_bounds.width, canvas_bounds.height);
    game.drawGame();
    if (settings.ai_playing)
        ai.drawDebug();
    game.drawOverlay();
}

//The game loop is created and executed
function loop(timestamp) {
    seconds_passed = (timestamp - old_timestamp) / 1000;
    old_timestamp = timestamp;
    if (settings.show_game_data) {
        if (fps_cooldown <= 0)
            fps = 1 / seconds_passed, fps_cooldown = 1;
        fps_cooldown = Math.max(0, fps_cooldown - fps_reset_rate);
    }
    update(seconds_passed * 60);
    draw();
    window.requestAnimationFrame(loop);
}
loop();