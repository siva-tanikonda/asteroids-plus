var fps = 60;
var user = true;

var canvas = document.getElementById("canvas");
var canvas_bounds = canvas.getBoundingClientRect();
var ctx = canvas.getContext("2d");
var user_input = new UserInput();
var game = new Game();

ctx.imageSmoothingQuality = "high";

function update() {
    if (user)
        game.update(user_input.left, user_input.right, user_input.forward);
}

function draw() {
    ctx.clearRect(0, 0, canvas_bounds.width, canvas_bounds.height);
    game.draw();
}

setInterval(() => { update(); draw(); }, 1000 / fps);