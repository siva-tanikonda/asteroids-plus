//Load external dependencies
const { Worker } = require("worker_threads");

//C-value to evaluate
const C = [2,0,47.516861904159214,1,101.83238569619166,1,32.07558716524954,1,0,2,0.2440989214049779,2,0.08464114624522935,2,0.061955703292572016,2,0.7998236396404192,1,0.09401192158015922,2,0.17804424599251795,2,0,20,12,0.7593765092352138,0,2,83.8686188659054,1];

//Settings for the evaluator
const thread_count = 11;
const trial_count = 100;
const score_weight = 1;
const time_weight = 0;
const flee_time_weight = 0;
const progress_bar_length = 50;
const interval_wait = 1000 / 60;
const max_display_text_length = 100;

//Global variables needed for evaluation
let trial = 1;
let used_threads_count = 0;
let testing_progress = 0;
let used_threads = [];
let fitness = [];
const threads = [];

//Calculates the fitness of the AI
function calculateFitness(score, time, flee_time) {
    return score_weight * score + time * time_weight + flee_time * flee_time_weight;
}

//Analyzes the results of all trials
function analyzeResults(results) {
    const analysis = [ 0, 0, 0, 0, 0 ];
    //Calculate Median fitness
    results.sort((a, b) => { return a - b });
    if (results.length % 2) analysis[0] = results[Math.floor(results.length / 2)];
    else analysis[0] = (results[results.length / 2] + results[results.length / 2 - 1]) / 2;
    //Calculate Mean fitness
    for (let i = 0; i < results.length; i++)
        analysis[1] += results[i];
    analysis[1] /= results.length;
    //Calculate STD fitness
    for (let i = 0; i < results.length; i++)
        analysis[2] += (results[i] - analysis[1]) ** 2;
    analysis[2] = Math.sqrt(analysis[2] / results.length);
    //Calculate Min/Max fitness
    analysis[3] = results[0];
    analysis[4] = results[results.length - 1];
    return analysis;
}

//Prints an analysis of the trials
function printAnalysis(analysis) {
    let text = "Median Fitness - " + analysis[0];
    while (text.length < max_display_text_length)
        text += " ";
    console.log(text);
    console.log("Mean Fitness - " + analysis[1]);
    console.log("STD Fitness - " + analysis[2]);
    console.log("Min Fitness - " + analysis[3]);
    console.log("Max Fitness - " + analysis[4]);
}

//Sends a message to another thread
function sendMessage(id, msg) {
    if (used_threads[id]) return;
    used_threads_count++;
    used_threads[id] = true;
    threads[id].postMessage(msg);
}

//Creates threads to use to run trials
function createThreads() {
    used_threads = new Array(thread_count).fill(false);
    used_threads_count = 0;
    for (let i = 0; i < thread_count; i++) {
        threads.push(new Worker("./tester.js"));
        sendMessage(i, JSON.stringify([ i + 1 ]));
        threads[i].on("message", (msg) => {
            const input = JSON.parse(msg);
            used_threads[i] = false;
            used_threads_count--;
            if (input.length == 2) {
                fitness[input[0] - 1] = calculateFitness(input[1][0], input[1][1], input[1][2]);
                testing_progress++;    
            }
        });
    }
}

//Closes the threads
function closeThreads() {
    console.log("Closing Threads...");
    for (let i = 0; i < thread_count; i++)
        threads[i].postMessage("exit");
}

//Evaluation function
function evaluate() {
    createThreads();
    let analysis = [ 0, 0, 0, 0, 0 ];
    fitness = new Array(trial_count).fill(0);
    testing_progress = 0;
    trial = 1;
    const interval = setInterval(() => {
        if (used_threads_count == thread_count) return;
        if (trial <= trial_count) { //Sends trials to threads to evaluate
            for (let i = 0; i < thread_count; i++)
                if (!used_threads[i]) {
                    sendMessage(i, JSON.stringify([ C, trial, trial ]));
                    trial++;
                    break;
                }
            const progress = testing_progress / trial_count;
            const bars = "#".repeat(Math.floor(progress * progress_bar_length));
            const blanks = "-".repeat(progress_bar_length - bars.length);
            let text = "Progress: [" + bars + blanks + "] -> " + (progress * 100).toFixed(1) + "%";
            while (text.length < max_display_text_length)
                text += " ";
            process.stdout.write(text + "\r");
        } else if (testing_progress == trial_count) { //Analyzes results when all trial outcomes are in
            analysis = analyzeResults(fitness);
            printAnalysis(analysis);
            clearInterval(interval);
            closeThreads();
        }
    }, interval_wait);
}

evaluate();