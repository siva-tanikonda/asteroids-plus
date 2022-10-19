var settings = {
    game_speed: 10,
    ai_playing: false,
    show_bounds: true,
    show_positions: true,
    show_velocity: true,
    show_acceleration: true
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
    for (var i = 0; i < settings.game_speed; i++) {
        if (settings.ai_playing)
            ai.update(game.ship, game.saucers, game.saucer_bullets, game.asteroids, delay / settings.game_speed);
        pause = user_input.pause;
        start = user_input.start;
        if (!settings.ai_playing) {
            left = user_input.left;
            right = user_input.right;
            forward = user_input.forward;
            fire = user_input.fire;
            teleport = user_input.teleport;
        } else {
            left = ai.controls.left;
            right = ai.controls.right;
            forward = ai.controls.forward;
            fire = ai.controls.fire;
            teleport = ai.controls.teleport;
        }
        var done = game.update(left, right, forward, fire, teleport, start, pause, delay / settings.game_speed);
        if (done)
            this.game = new Game();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas_bounds.width, canvas_bounds.height);
    game.draw();
    ai.drawDebugVisuals();
}

function loop(timestamp) {
    seconds_passed = (timestamp - old_timestamp) / 1000;
    old_timestamp = timestamp;
    update(seconds_passed * 6 * settings.game_speed);
    draw();
    window.requestAnimationFrame(loop);
}

loop();