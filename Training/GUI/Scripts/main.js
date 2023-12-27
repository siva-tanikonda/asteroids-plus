const canvas = document.getElementById("canvas");
const left_button = document.getElementById("left-button");
const right_button = document.getElementById("right-button");
const auto_checkbox = document.getElementById("auto-checkbox");
const continue_button = document.getElementById("continue-button");
const ctx = canvas.getContext("2d");
const socket = io();

const histogram_factor = 5;
const line_plot_factor = 10;

let data = {
    progress: 0,
    generation: 1,
    statistics: [ ],
    histograms: [ ]
};
let previous_packet_generation = -1;
let generation = 1;
let auto_progression = false;

resizeCanvas();

//Resizes HTML5 Canvas when needed
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas_bounds = canvas.getBoundingClientRect();
}
window.addEventListener("resize", resizeCanvas);

function updateProgressionType() {
    if (auto_checkbox.checked) {
        continue_button.disabled = true;
    } else {
        continue_button.disabled = false;
    }
}

function updateGeneration(add) {
    generation += add;
    generation = Math.min(generation, data.generation);
    generation = Math.max(generation, 1);
}

function toggleAutoProgression() {
    auto_progression = !auto_progression;
}

function drawHistogram() {
    ctx.fillStyle = "white";
    if (generation == data.generation) {
        const stats = "Progress: " + (data.progress * 100).toFixed(2) + "%";
        ctx.font = "30px Roboto Mono Regular";
        const text_length = ctx.measureText(stats).width;
        ctx.fillText(stats, canvas.width / 2 - text_length / 2, canvas.height / 2 - 30);
    } else {
        ctx.font = "25px Roboto Mono Regular";
        let text_length = ctx.measureText("Fitness Stats").width;
        ctx.fillText("Fitness Stats", canvas.width / 2 - text_length / 2, 150);
        ctx.font = "15px Roboto Mono Regular";
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
            ctx.fillRect(canvas.width / 2 - canvas.width / histogram_factor + bucket_length * i + 1, canvas.height - 300 - bucket_height, bucket_length - 1, bucket_height);
            text = data.histograms[generation - 1][i][2];
            if (text != 0) {
                text_length = ctx.measureText(text).width;
                ctx.fillText(text, canvas.width / 2 - canvas.width / histogram_factor + bucket_length * i + bucket_length / 2 - text_length / 2, canvas.height - 310 - bucket_height);
            }
        }
        console.log(data.histograms[generation - 1]);
        ctx.stroke();
    }
    ctx.font = "20px Roboto Mono Regular";
    const text_length = ctx.measureText("Generation " + generation).width;
    ctx.fillText("Generation " + generation, canvas.width / 2 - text_length / 2, canvas.height - 227);
}

function drawLinePlot(title, x, y, width, height, label_x, label_y, entries) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "white";
    ctx.beginPath();
    ctx.moveTo(x, y + 0.5);
    ctx.lineTo(x, y + height + 0.5);
    ctx.lineTo(x + width, y + height + 0.5);
    ctx.stroke();
    let text_width = ctx.measureText(title).width;
    ctx.font = "15px Roboto Mono Regular";
    ctx.fillStyle = "white";
    ctx.fillText(title, x + (width - text_width) / 2, y - 25);
    text_width = ctx.measureText(label_x).width;
    ctx.fillText(label_x, x + (width - text_width) / 2, y + height + 40);
    text_width = ctx.measureText(label_y).width;
    ctx.fillText(label_y, x - text_width - 30, y + height / 2);
    let max = 0;
    for (let i = 0; i < entries.length; i++) {
        max = Math.max(max, entries[i]);
    }
    max = max.toFixed(2);
    ctx.font = "12px Roboto Mono Regular";
    text_width = ctx.measureText(max).width;
    ctx.fillText(max, x - text_width / 2, y - 5);
    ctx.fillText(entries.length + 1, x + width + 5, y + height + 5);
    ctx.beginPath();
    ctx.moveTo(x + width / (entries.length + 1), y + height - height * (entries[0] / max));
    for (let i = 1; i < entries.length; i++) {
        ctx.lineTo(x + (i + 1) * width / (entries.length + 1), y + height - height * (entries[i] / max));
    }
    ctx.stroke();
}

function drawData() {
    drawHistogram();
    const means = [];
    for (let i = 0; i < data.statistics.length; i++) {
        means.push(data.statistics[i][1]);
    }
    const line_plot_size = canvas.width / line_plot_factor;
    drawLinePlot("Mean", canvas.width - line_plot_size - 150, 100, line_plot_size, line_plot_size, "Generation", "Fitness", means);
    const stds = [];
    for (let i = 0; i < data.statistics.length; i++) {
        stds.push(data.statistics[i][2]);
    }
    drawLinePlot("STD", canvas.width - line_plot_size - 150, line_plot_size + 250, line_plot_size, line_plot_size, "Generation", "Fitness", stds);
}

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

function draw() {
    ctx.clearRect(0, 0, canvas_bounds.width, canvas_bounds.height);
    drawData();
}

function loop() {
    update();
    draw();
    window.requestAnimationFrame(loop);
}
loop();

socket.on("data", (packet) => {
    data = packet;
    if ((auto_progression || previous_packet_generation == -1) && previous_packet_generation != data.generation) {
        generation = data.generation;
    }
    previous_packet_generation = data.generation;
});