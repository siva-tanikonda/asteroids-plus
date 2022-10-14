var settings = {
    updates_per_second: 60,
    show_bounds: true,
    show_positions: true,
    person_playing: true
};

var canvas = document.getElementById("canvas");
var canvas_bounds = canvas.getBoundingClientRect();
var ctx = canvas.getContext("2d");
var user_input = new UserInput();
var old_timestamp = 0;

ctx.imageSmoothingEnabled = false;

resizeCanvas();
Asteroid.analyzeAsteroidTypes();

var game = new Game();

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas_bounds = canvas.getBoundingClientRect();
}

function update(delay) {
    if (isNaN(delay) || delay == 0) return;
    var left, right, forward, fire, teleport;
    left = right = forward = fire = teleport = false;
    if (settings.person_playing) {
        left = user_input.left;
        right = user_input.right;
        forward = user_input.forward;
        fire = user_input.fire;
        teleport = user_input.teleport;
    }
    game.update(left, right, forward, fire, teleport, delay);
}

function draw() {
    ctx.clearRect(0, 0, canvas_bounds.width, canvas_bounds.height);
    game.draw();
}

function loop(timestamp) {
    seconds_passed = (timestamp - old_timestamp) / 1000;
    old_timestamp = timestamp;
    update(seconds_passed / (1 / 60) * settings.updates_per_second / 60);
    draw();
    window.requestAnimationFrame(loop);
}

loop();