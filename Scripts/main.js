//Some basic canvas rendering variables
var canvas = document.getElementById("canvas");
var side_bar = document.getElementById("side-bar");
var canvas_bounds = canvas.getBoundingClientRect();
var ctx = canvas.getContext("2d");
var user_input = new UserInput();
var old_timestamp = 0;
var tab_active = true;

//Set anti-aliasing to high
ctx.imageSmoothingLevel = 'high';

//Do initial setup steps for the game
resizeCanvas();
Asteroid.analyzeAsteroidConfigurations();
Saucer.analyzeSaucerConfigurations();

//Objects for the game and the ai
var game = new Game(true);
var ai = new AI();

//Resizes the HTML5 canvas
function resizeCanvas() {
    canvas.width = window.innerWidth - side_bar.getBoundingClientRect().width;
    canvas.height = window.innerHeight;
    canvas_bounds = canvas.getBoundingClientRect();
}

//Added EventListener for window resize
window.addEventListener("resize", resizeCanvas);

//Added EventListener to see if tab is active or not
window.onfocus = () => { tab_active = true; };
window.onblur = () => { tab_active = false; };

//Updates the game
function update(delay) {

    //Basic rules for the update function
    if (isNaN(delay) || delay == 0 || !tab_active) return;
    var left, right, forward, fire, teleport;
    left = right = forward = fire = teleport = start = pause = false;

    updateSettings();

    //Based on settings.game_speed, we update to allow for precise collision code and simultaneously whatever speed the player wants the game to run
    var iterations = delay / Math.min(settings.max_delay, delay / settings.game_precision) * settings.game_speed;
    for (var i = 0; i < iterations; i++) {

        //If the ai is playing, update the ai
        if (settings.ai_playing)
            ai.update(delay / settings.game_precision);

        //Updates user inputs based on whether the ai or player is playing
        pause = user_input.pause;
        start = user_input.start;
        if (!settings.ai_playing) {
            left = user_input.left;
            right = user_input.right;
            forward = user_input.forward;
            fire = user_input.fire;
            teleport = user_input.teleport;
        } else {
            fire = ai.controls.fire;
            left = ai.controls.left;
            right = ai.controls.right;
            forward = ai.controls.forward;
            teleport = ai.controls.teleport;
        }

        //Updates the game and creates a new game if the player chose to restart the game
        var done = game.update(left, right, forward, fire, teleport, start, pause, delay / settings.game_precision);
        if (done)
            this.game = new Game();
        
    }

}

//Draws the game
function draw() {
    game.drawGame();
    if (settings.ai_playing)
        ai.drawDebug();
    game.drawOverlay();
}

//The game loop is created and executed
function loop(timestamp) {
    seconds_passed = (timestamp - old_timestamp) / 1000;
    old_timestamp = timestamp;
    update(seconds_passed * 60);
    ctx.clearRect(0, 0, canvas_bounds.width, canvas_bounds.height);
    draw();
    window.requestAnimationFrame(loop);
}
loop();