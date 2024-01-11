//Load external dependencies
const express = require("express");
const { join } = require("path");
const { createServer } = require("http");
const { Worker } = require("worker_threads");
const { Server } = require("socket.io");
const seedrandom = require("seedrandom");
const fs = require("fs");

//Setup GUI
const port = 2000;
const app = express();
const path = join(__dirname, "GUI");
const server = createServer(app);
const io = new Server(server);
app.use(express.static(path));
server.listen(port, () => {
    console.log("GUI running at http://localhost:" + port);
});

//Create a random number generator for predictable results on the genetic algorithm
const sd = 1;
let random = new seedrandom(sd);

//Ranges that each constant can be when training the AI ([ left_bound, right_bound, onlyInteger ])
const C_range = [
    [ 2, 2, 1 ],
    [ 0, 1e6, 0 ],
    [ 0, 1e3, 0 ],
    [ 1, 2, 1 ],
    [ 0, 1e3, 0 ],
    [ 1, 2, 1 ],
    [ 0, 1e3, 0 ],
    [ 1, 2, 1 ],
    [ 0, 1e3, 0 ],
    [ 1, 2, 1 ],
    [ 0, 1e3, 0 ],
    [ 1, 2, 1 ],
    [ 0, 1e3, 0 ],
    [ 1, 2, 1 ],
    [ 0, 2, 0 ],
    [ 1, 2, 1 ],
    [ 0, 2, 0 ],
    [ 1, 2, 1 ],
    [ 0, 2, 0 ],
    [ 1, 2, 1 ],
    [ 0, 2, 0 ],
    [ 1, 2, 1 ],
    [ 0, 2, 0 ],
    [ 1, 2, 1 ],
    [ 0, 2, 0 ],
    [ 1, 2, 1 ],
    [ 0, 300, 1 ],
    [ 2, 100, 1 ],
    [ 3, 100, 1 ],
    [ 0, 2, 0 ]
];
//Describes what ranges of indices in C each represent a gene
const C_genes = [
    [ 0, 0 ],
    [ 1, 1 ],
    [ 2, 3 ],
    [ 4, 5 ],
    [ 6, 7 ],
    [ 8, 9 ],
    [ 10, 11 ],
    [ 12, 13 ],
    [ 14, 15 ],
    [ 16, 17 ],
    [ 18, 19 ],
    [ 20, 21 ],
    [ 22, 23 ],
    [ 24, 25 ],
    [ 26, 26 ],
    [ 27, 28 ],
    [ 29, 29 ],
];
//Describes default values at start of the algorithm
const C_default = [
    null,
    0,
    0,
    null,
    0,
    null,
    0,
    null,
    0,
    null,
    0,
    null,
    0,
    null,
    0,
    null,
    0,
    null,
    0,
    null,
    0,
    null,
    0,
    null,
    0,
    null,
    0,
    100,
    100,
    0
];
//Describes the shift std for each feature
const C_mutation = [
    [ 0.1 ],
    [ 0.001 ],
    [ 0.1, 0.01 ],
    [ 0.1 ],
    [ 0.1, 0.01 ],
    [ 0.1 ],
    [ 0.1, 0.01 ],
    [ 0.1 ],
    [ 0.1, 0.01 ],
    [ 0.1 ],
    [ 0.1, 0.01 ],
    [ 0.1 ],
    [ 0.1, 0.01 ],
    [ 0.1 ],
    [ 0.1, 0.01 ],
    [ 0.1 ],
    [ 0.1, 0.01 ],
    [ 0.1 ],
    [ 0.1, 0.01 ],
    [ 0.1 ],
    [ 0.1, 0.01 ],
    [ 0.1 ],
    [ 0.1, 0.01 ],
    [ 0.1 ],
    [ 0.1, 0.01 ],
    [ 0.1 ],
    [ 0.1 ],
    [ 0.1 ],
    [ 0.1 ],
    [ 0.1 ]
]

//Training settings
const thread_count = 8;
const generation_size = 1000;
const individuals_carry_size = 500;
const inclusion_limit = 3;
const progression_leeway = 3;
const max_generations = 100;
const score_goal = Infinity;
const trial_count = 3;
const time_weight = 0;
const score_weight = 1;
const flee_time_weight = -1 / 6;
const mutation_rate = 1 / 29;
const shift_rate = 1 / (29 * 3);
const partition_exponentiator = Math.E;
const interval_wait = 1000 / 60;
const histogram_count = 10;
const exploration_multiplier = 3;
const exploration_threshold = 3;
const save_index = 1;
const start_from_save = false;

//Multithreading/testing info
let Cs = [];
let generation = 1;
let individual = 1;
let seed = 0;
let trial = 1;
let used_threads_count = null;
let testing_progress = 0;
let used_threads = [];
let fitness = [];
let statistics = [];
let histograms = [];
let seeds = [];
const threads = [];
let max_fitness_mean = 0;
let carry_scores = false;
let individuals_carried = 0;
let stream_thread = -1;
let streaming = false;
let num_users = 0;

io.on("connection", (socket) => {
    num_users++;
    socket.on("stream", (msg) => {
        streaming = msg;
    });
    socket.on("disconnect", (msg) => {
        num_users--;
    });
});

//Calculates the fitness score of a trial
function calculateFitness(score, time, flee_time) {
    return Math.max(0, score * score_weight + time * time_weight + flee_time * flee_time_weight);
}

//Samples from normal distribution
function sampleNormalDistribution(mean, std) {
    const a = 1 - random();
    const b = random();
    const c = Math.sqrt(-2.0 * Math.log(a)) * Math.cos(2.0 * Math.PI * b);
    return c * std + mean;
}

//Fills C-values that aren't defined in a certain C-value
function fillC(C_small) {
    let C = new Array(C_range.length);
    for (let i = 0; i < C_range.length; i++) {
        if (C_small.length <= i) {
            if (C_default[i] == null) {
                C[i] = C_range[i][0] + random() * (C_range[i][1] - C_range[i][0]);
            } else {
                C[i] = C_default[i];
            }
        } else {
            C[i] = C_small[i];
        }
    }
    return C;
}

//Generates a random C
function createFirstGenerationC() {
    let C = new Array(C_range.length);
    for (let i = 0; i < C_range.length; i++) {
        if (C_default[i] == null) {
            C[i] = C_range[i][0] + random() * (C_range[i][1] - C_range[i][0]);
        } else {
            C[i] = C_default[i];
        }
    }
    return C;
}

//Creates a generation of random Cs
function createFirstGeneration() {
    if (start_from_save) {
        const generation_prefix = "generation";
        let max_previous_generation = 0;
        fs.readdirSync("Saves/Save" + save_index + "/Generations").forEach(file => {
            const number = parseInt(file.substring(generation_prefix.length));
            max_previous_generation = Math.max(max_previous_generation, number);
        });
        for (let i = 1; i < max_previous_generation; i++) {
            const generation_data = eval(fs.readFileSync("./Saves/Save" + save_index + "/Generations/generation" + i + ".json", "utf-8"));
            const generation_results = generation_data[2];
            const generation_seed = generation_data[0];
            statistics.push(analyzeGenerationResults(generation_results));
            histograms.push(createGenerationHistogram(generation_results));
            seeds.push(generation_seed);
        }
        if (max_previous_generation > 0) {
            fitness = new Array(generation_size).fill(0);
            testing_progress = 0;
            individual = 1;
            generation = max_previous_generation + 1;
            const previous_generation_data = eval(fs.readFileSync("./Saves/Save" + save_index + "/Generations/generation" + max_previous_generation + ".json", "utf-8"));
            const previous_generation_results = previous_generation_data[2];
            for (let i = 0; i < previous_generation_results.length; i++) {
                previous_generation_results[i][1] = fillC(previous_generation_results[i][1]);
            }
            seed = previous_generation_data[0];
            trial = 1;
            max_fitness_mean = previous_generation_data[1];
            console.log("Loaded Data From Save " + save_index);
            const analysis = analyzeGenerationResults(previous_generation_results);
            statistics.push(analysis);
            histograms.push(createGenerationHistogram(previous_generation_results));
            carry_scores = true;
            individuals_carried = 0;
            if (progression_leeway == Infinity || max_fitness_mean <= analysis[1] + progression_leeway * analysis[2]) {
                max_fitness_mean = Math.max(max_fitness_mean, analysis[1]);
                carry_scores = false;
            }
            const Cs = createGeneration(previous_generation_results, analysis);
            testing_progress = individuals_carried * trial_count;
            individual = individuals_carried + 1;
            return Cs;
        }
    }
    fitness = new Array(generation_size).fill(0);
    testing_progress = 0;
    individual = 1;
    generation = 1;
    const Cs = [];
    for (let i = 0; i < generation_size; i++) {
        Cs.push(createFirstGenerationC());
    }
    return Cs;
}

//Analyzes the median, mean, STD, min, and max scores of a generation
function analyzeGenerationResults(results) {
    const analysis = [ 0, 0, 0, 0, 0 ];
    //Calculate Median fitness
    results.sort((a, b) => { return a[0] - b[0] });
    if (results.length % 2) {
        analysis[0] = results[Math.floor(results.length / 2)][0];
    } else {
        analysis[0] = (results[results.length / 2][0] + results[results.length / 2 - 1][0]) / 2;
    }
    //Calculate Mean fitness
    for (let i = 0; i < results.length; i++) {
        analysis[1] += results[i][0];
    }
    analysis[1] /= results.length;
    //Calculate STD fitness
    for (let i = 0; i < results.length; i++) {
        analysis[2] += (results[i][0] - analysis[1]) ** 2;
    }
    analysis[2] = Math.sqrt(analysis[2] / results.length);
    //Calculate Min/Max fitness
    analysis[3] = results[0][0];
    analysis[4] = results[results.length - 1][0];
    return analysis;
}

//Creates a histogram given generation results
function createGenerationHistogram(results) {
    let max = 0;
    for (let i = 0; i < results.length; i++) {
        max = Math.max(max, results[i][0]);
    }
    const div = max / histogram_count;
    const counts = new Array(histogram_count).fill(0);
    for (let i = 0; i < results.length; i++) {
        let bucket = Math.max(0, Math.min(histogram_count - 1, Math.floor(results[i][0] / div)));
        counts[bucket]++;
    }
    const buckets = [];
    for (let i = 0; i < counts.length; i++) {
        buckets.push([i * div, (i + 1) * div, counts[i]]);
    }
    return buckets;
}

//Open save files
function openSaveFiles() {
    if (!fs.existsSync("./Saves")) {
        fs.mkdirSync("./Saves");
    }
    if (!fs.existsSync("./Saves/Save" + save_index)) {
        fs.mkdirSync("./Saves/Save" + save_index);
    }
    if (!fs.existsSync("./Saves/Save" + save_index + "/Generations")) {
        fs.mkdirSync("./Saves/Save" + save_index + "/Generations");
    }
    if (!start_from_save) {
        fs.rmSync("./Saves/Save" + save_index + "/Generations", { recursive: true });
        fs.mkdirSync("./Saves/Save" + save_index + "/Generations");
    }
    fs.openSync("./Saves/Save" + save_index + "/best_fitness.json", "a+");
}

//Saves the generation to a file
function saveGeneration(results, generation) {
    fs.openSync("./Saves/Save" + save_index + "/Generations/generation" + generation + ".json", "a+");
    fs.writeFileSync("./Saves/Save" + save_index + "/Generations/generation" + generation + ".json", JSON.stringify([ seed, max_fitness_mean, results ]), (err) => {
        if (err) throw err;
    });
    results.sort((a, b) => { return b[0] - a[0] });
    const rounded_result = [ results[0][0], roundC(results[0][1]) ];
    fs.writeFileSync("./Saves/Save" + save_index + "/best_fitness.json", JSON.stringify(rounded_result), (err) => {
        if (err) throw err;
    });
}

//Creates a new generation from the results of a previous generation
function createGeneration(results, analysis) {
    //Use STDs to find out the distribution of each C based on scores
    const partition = [];
    for (let i = 0; i < results.length; i++) {
        const std = (analysis[2] == 0) ? 0 : (results[i][0] - analysis[1]) / analysis[2];
        partition.push([ std, results[i][0], results[i][1] ]);
    }
    //Sort the partitions
    partition.sort((a, b) => { return b[0] - a[0] });
    //Carry-over some of the C-values
    const Cs = [];
    const median_partition = (analysis[2] == 0) ? 0 : (analysis[0] - analysis[1]) / analysis[2];
    for (let i = 0; i < individuals_carry_size; i++) {
        if (partition[i][0] < median_partition) {
            break;
        }
        if (carry_scores) {
            fitness[i] = partition[i][1];
            individuals_carried = i + 1;
        }
        Cs.push(partition[i][2]);
    }
    //Check if we should use exploration or exploitation mode
    let mutation_multiplier = 1;
    let exponentiator = partition_exponentiator;
    if (analysis[1] + exploration_threshold * analysis[2] > analysis[4]) {
        mutation_multiplier = exploration_multiplier;
    }
    //Normalize the inputs
    let partition_sum = 0;
    for (let i = 0; i < partition.length; i++) {
        if (partition[i][0] < median_partition) {
            break;
        }
        partition_sum += exponentiator ** Math.min(partition[i][0], inclusion_limit);
    }
    if (partition_sum == 0) {
        for (let i = 0; i < partition.length; i++) {
            if (partition[i][0] < median_partition) {
                partition[i][0] = 0;
                continue;
            }
            partition[i][0] = 1 / partition.length;
        }
    } else {
        for (let i = 0; i < partition.length; i++) {
            if (partition[i][0] < median_partition) {
                partition[i][0] = 0;
                continue;
            }
            partition[i][0] = (exponentiator ** Math.min(partition[i][0], inclusion_limit)) / partition_sum;
        }
    }
    //Run crossover from current species
    for (let i = 0; Cs.length < generation_size; i++) {
        const C = new Array(C_range.length);
        //Pick the individuals to combine and calculate the partition
        let rng = random();
        let id1 = 0;
        while (id1 < partition.length - 1) {
            rng -= partition[id1][0];
            if (rng < 0 && partition[id1][0] > 0) break;
            id1++;
        }
        rng = random();
        let id2 = 0;
        while (id2 < partition.length - 1) {
            rng -= partition[id2][0];
            if (rng < 0 && partition[id2][0] > 0) break;
            id2++;
        }
        const margin = partition[id1][0] / (partition[id1][0] + partition[id2][0]);
        for (let j = 0; j < C_genes.length; j++) {
            //Find out which gene to take based on the partition
            const l = C_genes[j][0];
            const r = C_genes[j][1];
            //Choose which parent to pick the gene from and copy it
            rng = random();
            for (let k = l; k <= r; k++) {
                if (rng < margin) {
                    C[k] = partition[id1][2][k];
                } else {
                    C[k] = partition[id2][2][k];
                }
            }
            //Mutate the individual multiplicatively
            if (random() < mutation_rate * mutation_multiplier) {
                for (let k = l; k <= r; k++) {
                    const old_class = Math.floor(C[r]) - 1;
                    let difference = 0;
                    difference = sampleNormalDistribution(0, C_mutation[k][0]);
                    C[k] *= Math.E ** difference;
                    C[k] = Math.max(C_range[k][0], C[k]);
                    C[k] = Math.min(C_range[k][1], C[k]);
                    const new_class = Math.floor(C[r]) - 1;
                    if (C_mutation[l].length == 2 && old_class != new_class) {
                        C[l] *= (C_mutation[l][new_class] / C_mutation[l][old_class]);
                        C[l] = Math.max(C_range[l][0], C[l]);
                        C[l] = Math.min(C_range[l][1], C[l]);
                    }
                }
            }
            //Mutate the individual with a shift
            if (random() < shift_rate * mutation_multiplier) {
                for (let k = l; k <= r; k++) {
                    const old_class = Math.floor(C[r]) - 1;
                    let difference = 0;
                    if (k == l && C_mutation[k].length > 1) {
                        difference = sampleNormalDistribution(0, C_mutation[k][Math.floor(C[r]) - 1]);
                    } else {
                        difference = sampleNormalDistribution(0, C_mutation[k][0]);
                    }
                    C[k] += (C_range[k][1] - C_range[k][0]) * difference;
                    C[k] = Math.max(C_range[k][0], C[k]);
                    C[k] = Math.min(C_range[k][1], C[k]);
                    const new_class = Math.floor(C[r]) - 1;
                    if (C_mutation[l].length == 2 && old_class != new_class) {
                        C[l] *= (C_mutation[l][new_class] / C_mutation[l][old_class]);
                        C[l] = Math.max(C_range[l][0], C[l]);
                        C[l] = Math.min(C_range[l][1], C[l]);
                    }
                }
            }
        }
        //For clutter setting, you set number of small asteroids allowed to be lower than num of small + medium asteroids
        C[27] = Math.min(C[27], C[28] + 1);
        Cs.push(C);
    }
    return Cs;
}

//Sends a message to a thread
function sendMessage(id, msg) {
    if (used_threads[id]) {
        return;
    }
    used_threads_count++;
    used_threads[id] = true;
    threads[id].postMessage(msg);
}

//Creates tester threads
function createThreads() {
    used_threads = new Array(thread_count).fill(false);
    used_threads_count = 0;
    for (let i = 0; i < thread_count; i++) {
        threads.push(new Worker("./tester.js"));
        sendMessage(i, JSON.stringify([ i + 1 ]));
        threads[i].on("message", (msg) => {
            const input = JSON.parse(msg);
            //What to do if results are returned
            if (input.length == 2) {
                used_threads[i] = false;
                used_threads_count--;
                fitness[input[0] - 1] += calculateFitness(input[1][0], input[1][1], input[1][2]) / trial_count;
                testing_progress++;
                if (stream_thread == i) {
                    stream_thread = -1;
                }   
            } else if (input.length == 0) {
                used_threads[i] = false;
                used_threads_count--;
            } else {
                if (streaming) {
                    io.emit("stream", input);
                }
            }
        });
    }
}

//Closes all the tester threads
function closeThreads() {
    for (let i = 0; i < thread_count; i++) {
        threads[i].postMessage("exit");
    }
}

//Rounds a C-value
function roundC(C) {
    const C_rounded = [];
    for (let i = 0; i < C_range.length; i++) {
        C_rounded.push(C[i]);
        if (C_range[i][2] == 1) {
            C_rounded[i] = Math.round(C_rounded[i]);
        }
    }
    return C_rounded;
}

//This is the main training loop
function train() {
    openSaveFiles();
    createThreads();
    Cs = createFirstGeneration();
    let analysis = [ 0, 0, 0, 0, 0 ];
    let results = null;
    const interval = setInterval(() => {
        let packet = {
            progress: 1,
            generation: generation,
            statistics: statistics,
            histograms: histograms,
            seeds: seeds,
            thread: stream_thread
        };
        if (generation <= max_generations && individual <= generation_size) {
            //If currently testing something, then wait for next interval-step
            if (used_threads_count == thread_count) {
                return;
            }
            for (let j = 0; j < thread_count; j++)
                if (!used_threads[j]) {
                    if (streaming && stream_thread == -1 && Math.random() >= 0.5) {
                        stream_thread = j;
                        sendMessage(j, JSON.stringify([ roundC(Cs[individual - 1]), individual, seed * trial_count + trial - 1, 1 ]));
                    } else {
                        sendMessage(j, JSON.stringify([ roundC(Cs[individual - 1]), individual, seed * trial_count + trial - 1, -1 ]));
                    }
                    if (trial == trial_count) {
                        individual++;
                        trial = 1;
                    } else {
                        trial++;
                    }
                    break;
                }
            //Calculate testing progress
            const progress = testing_progress / (generation_size * trial_count);
            packet.progress = progress;
        } else if (testing_progress == generation_size * trial_count) {
            //If testing is done, compile and analyze the results and then finally create the new generation
            results = [];
            for (let i = 0; i < Cs.length; i++) {
                results.push([ fitness[i], Cs[i] ]);
            }
            analysis = analyzeGenerationResults(results);
            statistics.push(analysis);
            histograms.push(createGenerationHistogram(results));
            seeds.push(seed);
            fitness = new Array(generation_size).fill(0);
            testing_progress = 0;
            individual = 1;
            trial = 1;
            carry_scores = true;
            individuals_carried = 0;
            if (progression_leeway == Infinity || max_fitness_mean <= analysis[1] + progression_leeway * analysis[2]) {
                seed++;
                max_fitness_mean = Math.max(max_fitness_mean, analysis[1]);
                carry_scores = false;
            }
            Cs = createGeneration(results, analysis);
            saveGeneration(results, generation);
            testing_progress = individuals_carried * trial_count;
            individual = individuals_carried + 1;
            generation++;
        }
        //End the algorithm if we have reached our goal/generation limit
        if (generation > max_generations || analysis[1] >= score_goal) {
            clearInterval(interval);
            closeThreads();
            console.log("Training complete");
            io.close();
        }
        packet.statistics = statistics;
        packet.histograms = histograms;
        packet.thread = stream_thread;
        packet.seeds = seeds;
        if (num_users > 0) {
            io.emit("data", packet);
        }
    }, interval_wait);
}

train();