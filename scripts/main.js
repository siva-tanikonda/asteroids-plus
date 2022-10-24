var settings = {
    game_precision: 10,
    game_speed: 1,
    ai_playing: true,
    show_bounds: true,
    show_positions: true,
    show_velocity: true,
    show_acceleration: true,
    show_danger: true,
    show_target_radius: true,
    show_danger_radius: true
};

var canvas = document.getElementById("canvas");
var canvas_bounds = canvas.getBoundingClientRect();
var ctx = canvas.getContext("2d");
var user_input = new UserInput();
var old_timestamp = 0;

ctx.imageSmoothingQuality = "high";

resizeCanvas();
Asteroid.analyzeAsteroidConfigurations();
Saucer.analyzeSaucerConfigurations();

var game = new Game(true);
var ai = new AI();

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas_bounds = canvas.getBoundingClientRect();
}

function update(delay) {
    if (isNaN(delay) || delay == 0) return;
    var left, right, forward, fire, teleport;
    left = right = forward = fire = teleport = start = pause = false;
    for (var i = 0; i < settings.game_precision * settings.game_speed; i++) {
        if (settings.ai_playing)
            ai.update(game, delay / settings.game_precision);

        pause = user_input.pause;
        start = user_input.start;
        forward = user_input.forward;
        teleport = user_input.teleport;
        left = user_input.left;
        right = user_input.right;

        if (!settings.ai_playing) {
            left = user_input.left;
            right = user_input.right;
            forward = user_input.forward;
            fire = user_input.fire;
            teleport = user_input.teleport;
        } else {
            fire = ai.controls.fire;
            /*left = ai.controls.left;
            right = ai.controls.right;
            forward = ai.controls.forward;
            teleport = ai.controls.teleport;*/
        }
        var done = game.update(left, right, forward, fire, teleport, start, pause, delay / settings.game_precision);
        if (done)
            this.game = new Game();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas_bounds.width, canvas_bounds.height);
    game.draw();
    if (settings.ai_playing)
        ai.drawDebug(game);
}

function loop(timestamp) {
    seconds_passed = (timestamp - old_timestamp) / 1000;
    old_timestamp = timestamp;
    update(seconds_passed * 60 * settings.game_speed);
    draw();
    window.requestAnimationFrame(loop);
}

loop();