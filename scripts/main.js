//Settings, including debug settings, ai settings, and game speed settings
var settings = {
    game_precision: 10,
    game_speed: 2,
    ai_playing: true,
    show_bounds: true,
    show_positions: true,
    show_velocity: true,
    show_acceleration: true,
    show_target_radius: true,
    show_danger_radius: true,
    show_danger_level: true,
    show_danger_flee: true,
    show_target_min_distance: true,
    tester_iterations: 100,
    tester_console_updates: true,
    optimization_mode: false
};

//Some basic canvas rendering variables
var canvas = document.getElementById("canvas");
var canvas_bounds = canvas.getBoundingClientRect();
var ctx = canvas.getContext("2d");
var user_input = new UserInput();
var old_timestamp = 0;

//Turn-off anti-aliasing
ctx.imageSmoothingEnabled = false;

//Do initial setup steps for the game
resizeCanvas();
Asteroid.analyzeAsteroidConfigurations();
Saucer.analyzeSaucerConfigurations();

//Objects for the game and the ai
var game = new Game(true);
var ai = new AI();
var tester = new Tester(settings.tester_iterations, settings.tester_console_updates);

//Resizes the HTML5 canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas_bounds = canvas.getBoundingClientRect();
}

//Updates the game
function update(delay) {

    //Basic rules for the update function
    if (isNaN(delay) || delay == 0) return;
    var left, right, forward, fire, teleport;
    left = right = forward = fire = teleport = start = pause = false;

    //Based on settings.game_speed, we update to allow for precise collision code and simultaneously whatever speed the player wants the game to run
    var iterations = settings.game_precision * settings.game_speed;
    for (var i = 0; i < iterations; i++) {

        //If the ai is playing, update the ai
        if (settings.ai_playing)
            ai.update(delay / settings.game_precision);

        if (tester.running)
            tester.update();

        //Updates user inputs based on whether the ai or player is playing
        pause = user_input.pause;

        if (!tester.running)
            start = user_input.start;
        else 
            start = tester.controls.start;

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
if (!settings.optimization_mode)
    loop();