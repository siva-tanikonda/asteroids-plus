const canvas = document.getElementById("canvas");
const stream = document.getElementById("stream");
const left_button = document.getElementById("left-button");
const right_button = document.getElementById("right-button");
const auto_checkbox = document.getElementById("auto-checkbox");
const continue_button = document.getElementById("continue-button");
const ctx = canvas.getContext("2d");
const sctx = stream.getContext("2d");
const socket = io();

const histogram_factor = 8;
const line_plot_factor = 5;

let data = {
    progress: 0,
    generation: 1,
    statistics: [ ],
    histograms: [ ],
    thread: -1
};
let stream_data = [];
let previous_packet_generation = -1;
let generation = 1;
let auto_progression = false;
let streaming = false;

resizeCanvas();

//Resizes HTML5 Canvas when needed
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stream.style.left = "5%";
    stream.style.top = window.innerHeight / 2 - stream.offsetHeight / 2 + "px";
    canvas_bounds = canvas.getBoundingClientRect();
    stream_bounds = stream.getBoundingClientRect();
}
window.addEventListener("resize", resizeCanvas);

//Updates how the generations progress (toggles whether we move to new generation when one generation is done)
function updateProgressionType() {
    if (auto_checkbox.checked) {
        continue_button.disabled = true;
    } else {
        continue_button.disabled = false;
    }
}

//Changes the current generation we are viewing
function updateGeneration(add) {
    generation += add;
    generation = Math.min(generation, data.generation);
    generation = Math.max(generation, 1);
}

//Toggles the auto-progression
function toggleAutoProgression() {
    auto_progression = !auto_progression;
}

//Toggles the stream
function toggleStream() {
    if (streaming) {
        socket.emit("stream", false);
        streaming = false;
    } else {
        socket.emit("stream", true);
        streaming = true;
    }
}

//Draws a histogram of the fitness scores for a generation
function drawHistogram() {
    ctx.fillStyle = "white";
    if (generation == data.generation) {
        const stats = "Progress: " + (data.progress * 100).toFixed(2) + "%";
        ctx.font = "20px Roboto Mono Regular";
        const text_length = ctx.measureText(stats).width;
        ctx.fillText(stats, canvas.width / 2 - text_length / 2, canvas.height / 2 - 30);
    } else {
        ctx.font = "20px Roboto Mono Regular";
        let text_length = ctx.measureText("Fitness Stats").width;
        ctx.fillText("Fitness Stats", canvas.width / 2 - text_length / 2, 150);
        ctx.font = "12.5px Roboto Mono Regular";
        const median = data.statistics[generation - 1][0].toFixed(2);
        const mean = data.statistics[generation - 1][1].toFixed(2);
        const std = data.statistics[generation - 1][2].toFixed(2);
        const min = data.statistics[generation - 1][3].toFixed(2);
        const max = data.statistics[generation - 1][4].toFixed(2); 
        const stats = "Median: " + median + ", Mean: " + mean + ", STD: " + std + ", Min: " + min + ", Max: " + max;
        text_length = ctx.measureText(stats).width;
        ctx.fillText(stats, canvas.width / 2 - text_length / 2, 200);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "white";
        const histogram_length = 2 * canvas.width / histogram_factor;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - canvas.width / histogram_factor, canvas.height - 300 + 0.5);
        ctx.lineTo(canvas.width / 2 + canvas.width / histogram_factor, canvas.height - 300 + 0.5);
        ctx.stroke();
        ctx.beginPath();
        const bucket_length = histogram_length / data.histograms[generation - 1].length;
        const histogram_height = canvas.height - 600;
        let largest_bucket = 0;
        for (let i = 0; i < data.histograms[generation - 1].length; i++) {
            largest_bucket = Math.max(largest_bucket, data.histograms[generation - 1][i][2]);
        }
        ctx.font = "12px Roboto Mono Regular";
        ctx.moveTo(canvas.width / 2 - canvas.width / histogram_factor, canvas.height - 300);
        ctx.lineTo(canvas.width / 2 - canvas.width / histogram_factor, canvas.height - 290);
        text_length = ctx.measureText(0).width;
        ctx.fillText(0, canvas.width / 2 - canvas.width / histogram_factor - text_length / 2, canvas.height - 275);
        for (let i = 0; i < data.histograms[generation - 1].length; i++) {
            ctx.moveTo(canvas.width / 2 - canvas.width / histogram_factor + bucket_length * (i + 1), canvas.height - 300);
            ctx.lineTo(canvas.width / 2 - canvas.width / histogram_factor + bucket_length * (i + 1), canvas.height - 290);
            let text = data.histograms[generation - 1][i][1].toFixed(0);
            text_length = ctx.measureText(text).width;
            ctx.fillText(text, canvas.width / 2 - canvas.width / histogram_factor - text_length / 2 + bucket_length * (i + 1), canvas.height - 275);
            const bucket_height = histogram_height * (data.histograms[generation - 1][i][2] / largest_bucket);
            ctx.fillRect(canvas.width / 2 - canvas.width / histogram_factor + bucket_length * i + 0.75, canvas.height - 300 - bucket_height, bucket_length - 1.5, bucket_height);
            text = data.histograms[generation - 1][i][2];
            if (text != 0) {
                text_length = ctx.measureText(text).width;
                ctx.fillText(text, canvas.width / 2 - canvas.width / histogram_factor + bucket_length * i + bucket_length / 2 - text_length / 2, canvas.height - 310 - bucket_height);
            }
        }
        ctx.stroke();
    }
    ctx.font = "20px Roboto Mono Regular";
    const text_length = ctx.measureText("Generation " + generation).width;
    ctx.fillText("Generation " + generation, canvas.width / 2 - text_length / 2, canvas.height - 227);
}

//Draws the line plot for the overall training statistics
function drawPlot(title, x, y, width, height, label_x, label_y) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "white";
    ctx.beginPath();
    ctx.moveTo(x, y + 0.5);
    ctx.lineTo(x, y + height + 0.5);
    ctx.lineTo(x + width, y + height + 0.5);
    ctx.stroke();
    ctx.font = "20px Roboto Mono Regular";
    let text_width = ctx.measureText(title).width;
    ctx.fillStyle = "white";
    ctx.fillText(title, x + (width - text_width) / 2, y - 20);
    ctx.font = "15px Roboto Mono Regular";
    text_width = ctx.measureText(label_x).width;
    ctx.fillText(label_x, x + (width - text_width) / 2, y + height + 40);
    text_width = ctx.measureText(label_y).width;
    ctx.fillText(label_y, x - text_width - 30, y + height / 2);
    let max = 0;
    for (let i = 0; i < data.statistics.length; i++) {
        max = Math.max(max, data.statistics[i][4]);
        max = Math.max(max, data.statistics[i][1] + data.statistics[i][2]);
    }
    max = max.toFixed(2);
    ctx.font = "12px Roboto Mono Regular";
    text_width = ctx.measureText(max).width;
    ctx.fillText(max, x - text_width / 2, y - 5);
    ctx.fillText(data.statistics.length, x + width + 5, y + height + 5);
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    for (let i = 0; i < data.statistics.length; i++) {
        ctx.lineTo(x + (i + 1) * width / data.statistics.length, y + height - height * (data.statistics[i][1] / max));
    }
    ctx.stroke();
    ctx.moveTo(x, y + height + 75);
    ctx.lineTo(x + 15, y + height + 75);
    ctx.stroke();
    ctx.fillStyle = "white";
    ctx.font = "12px Roboto Mono Regular";
    ctx.fillText("Mean Fitness", x + 20, y + height + 78);
    ctx.strokeStyle = "rgb(132, 179, 240)";
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    for (let i = 0; i < data.statistics.length; i++) {
        ctx.lineTo(x + (i + 1) * width / data.statistics.length, y + height - height * (data.statistics[i][3] / max));
    }
    ctx.stroke();
    ctx.moveTo(x, y + height + 110);
    ctx.lineTo(x + 15, y + height + 110);
    ctx.stroke();
    ctx.fillStyle = "rgb(132, 179, 240)";
    ctx.font = "12px Roboto Mono Regular";
    ctx.fillText("Min Fitness", x + 20, y + height + 113);
    ctx.strokeStyle = "rgb(240, 141, 139)";
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    for (let i = 0; i < data.statistics.length; i++) {
        ctx.lineTo(x + (i + 1) * width / data.statistics.length, y + height - height * (data.statistics[i][4] / max));
    }
    ctx.stroke();
    ctx.moveTo(x + 150, y + height + 75);
    ctx.lineTo(x + 165, y + height + 75);
    ctx.stroke();
    ctx.fillStyle = "rgb(240, 141, 139)";
    ctx.font = "12px Roboto Mono Regular";
    ctx.fillText("Max Fitness", x + 170, y + height + 78);
    ctx.fillStyle = "white";
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    for (let i = 0; i < data.statistics.length; i++) {
        ctx.lineTo(x + (i + 1) * width / data.statistics.length, y + height - height * (Math.max(0, data.statistics[i][1] - data.statistics[i][2]) / max));
    }
    for (let i = data.statistics.length - 1; i >= 0; i--) {
        ctx.lineTo(x + (i + 1) * width / data.statistics.length, y + height - height * (Math.max(0, data.statistics[i][1] + data.statistics[i][2]) / max));
    }
    ctx.lineTo(x, y + height);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "white";
    ctx.beginPath();
    ctx.setLineDash([ 3, 5 ]);
    ctx.moveTo(x, y + height);
    for (let i = 0; i < data.statistics.length; i++) {
        ctx.lineTo(x + (i + 1) * width / data.statistics.length, y + height - height * (Math.max(0, data.statistics[i][1] - data.statistics[i][2]) / max));
    }
    ctx.stroke();
    ctx.moveTo(x, y + height);
    for (let i = 0; i < data.statistics.length; i++) {
        ctx.lineTo(x + (i + 1) * width / data.statistics.length, y + height - height * (Math.max(0, data.statistics[i][1] + data.statistics[i][2]) / max));
    }
    ctx.stroke();
    ctx.moveTo(x + 150, y + height + 110);
    ctx.lineTo(x + 165, y + height + 110);
    ctx.stroke();
    ctx.fillStyle = "white";
    ctx.font = "12px Roboto Mono Regular";
    ctx.fillText("Mean ± STD Fitness", x + 170, y + height + 113);
    ctx.setLineDash([ ]);
}

//Main data draw function
function drawData() {
    drawHistogram();
    const means = [];
    for (let i = 0; i < data.statistics.length; i++) {
        means.push(data.statistics[i][1]);
    }
    const line_plot_size = canvas.width / line_plot_factor;
    drawPlot("Statistics", canvas.width - line_plot_size - canvas.width / 20, canvas.height / 2 - stream.offsetHeight / 2, line_plot_size, line_plot_size, "Generation", "Fitness");
}

//Main update function
function update() {
    if (generation == 1) {
        left_button.style.visibility = "hidden";
    } else {
        left_button.style.visibility = "visible";
    }
    if (generation == data.generation) {
        right_button.style.visibility = "hidden";
    } else {
        right_button.style.visibility = "visible";
    }
}

//Main draw function
function draw() {
    ctx.clearRect(0, 0, canvas_bounds.width, canvas_bounds.height);
    ctx.fillStyle = "white";
    ctx.font = "20px Roboto Mono Regular";
    const text_width = ctx.measureText("Stream").width;
    ctx.fillText("Stream", canvas.width / 20 + stream.offsetWidth / 2 - text_width / 2, canvas.height / 2 - stream.offsetHeight / 2 - 20);
    drawData();
    drawStream();
}

//Manages animation loop
function loop() {
    update();
    draw();
    window.requestAnimationFrame(loop);
}
loop();

//Updates training statistics received from the server
socket.on("data", (packet) => {
    data = packet;
    generation = Math.min(generation, data.generation);
    if ((auto_progression || previous_packet_generation == -1) && previous_packet_generation != data.generation) {
        generation = data.generation;
    }
    previous_packet_generation = data.generation;
});

//Updates stream data
socket.on("stream", (packet) => {
    stream_data = packet;
})