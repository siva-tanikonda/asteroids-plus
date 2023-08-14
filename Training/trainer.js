const { Worker } = require("worker_threads");
const fs = require("fs");

//Ranges that each constant can be when training the AI ([ left_bound, right_bound, onlyInteger ])
const C_range = [
    [ 1, 1, 1 ],
    [ 0, 1e6, 0 ],
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
    [ 4, 20, 1 ],
    [ 4, 20, 1 ],
    [ 0, 1000, 1 ],
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
    [ 20, 20 ],
    [ 21, 22 ],
    [ 23, 23 ],
    [ 24, 24 ]
]
const C_default = [
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null
];

//Other training constants
const thread_count = 8;
const generation_size = 1000;
const species_carry_size = 250;
const max_generations = Infinity;
const score_goal = Infinity;
const time_weight = 0;
const score_weight = 1;
const mutation_rate = 0.1;
const mutation_std = 0.1;
const partition_exponentiator = 2;
const max_display_text_length = 100;
const progress_bar_length = 50;
const interval_wait = 1000 / 60;
const save_index = 6;
const start_from_save = false;

//Multithreading/testing info
let Cs = [];
let generation = 1;
let individual = 1;
let used_threads_count = null;
let testing_progress = 0;
let used_threads = [];
let fitness = [];
const threads = [];

//Calculates the fitness score of a trial
function calculateFitness(score, time) {
    return score * score_weight + time * time_weight;
}

//Samples from normal distribution
function sampleNormalDistribution(mean, std) {
    const a = 1 - Math.random();
    const b = Math.random();
    const c = Math.sqrt(-2.0 * Math.log(a)) * Math.cos(2.0 * Math.PI * b);
    return c * std + mean;
}

//Generates a random C
function createFirstGenerationC() {
    let C = new Array(C_range.length);
    for (let i = 0; i < C_range.length; i++) {
        if (C_default[i] == null) {
            if (C_range[i][2] == 1)
                C[i] = C_range[i][0] + Math.floor(Math.random() * (C_range[i][1] - C_range[i][0] + 1))
            else
                C[i] = C_range[i][0] + Math.random() * (C_range[i][1] - C_range[i][0]);
        } else C[i] = C_default[i];
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
        if (max_previous_generation > 0) {
            fitness = new Array(generation_size).fill(0);
            testing_progress = 0;
            individual = 1;
            generation = max_previous_generation + 1;
            const previous_generation_results = eval(fs.readFileSync("./Saves/Save" + save_index + "/Generations/generation" + max_previous_generation + ".json", "utf-8"));
            const analysis = analyzeGenerationResults(previous_generation_results);
            return createGeneration(previous_generation_results, analysis);
        }
    }
    fitness = new Array(generation_size).fill(0);
    testing_progress = 0;
    individual = 1;
    generation = 1;
    const Cs = [];
    for (let i = 0; i < generation_size; i++)
        Cs.push(createFirstGenerationC());
    return Cs;
}

//Analyzes the median, mean, STD, min, and max scores of a generation
function analyzeGenerationResults(results) {
    const analysis = [ 0, 0, 0, 0, 0 ];
    //Calculate Median fitness
    results.sort((a, b) => { return a[0] - b[0] });
    if (results.length % 2) analysis[0] = results[Math.floor(results.length / 2)][0];
    else analysis[0] = (results[results.length / 2][0] + results[results.length / 2 - 1][0]) / 2;
    //Calculate Mean fitness
    for (let i = 0; i < results.length; i++)
        analysis[1] += results[i][0];
    analysis[1] /= results.length;
    //Calculate STD fitness
    for (let i = 0; i < results.length; i++)
        analysis[2] += (results[i][0] - analysis[1]) ** 2;
    analysis[2] = Math.sqrt(analysis[2] / results.length);
    //Calculate Min/Max fitness
    analysis[3] = results[0][0];
    analysis[4] = results[results.length - 1][0];
    return analysis;
}

//Print-out the results in the console
function printGenerationAnalysis(generation, analysis) {
    let text = "Generation " + generation + ": Median Fitness - " + analysis[0];
    while (text.length < max_display_text_length)
        text += " ";
    const blank = new Array(("Generation " + generation + ":  ").length).join(" ");
    console.log(text);
    console.log(blank + "Mean Fitness - " + analysis[1]);
    console.log(blank + "STD Fitness - " + analysis[2]);
    console.log(blank + "Min Fitness - " + analysis[3]);
    console.log(blank + "Max Fitness - " + analysis[4]);
}

//Open Save Files
function openSaveFiles() {
    if (!fs.existsSync("./Saves"))
        fs.mkdirSync("./Saves");
    if (!fs.existsSync("./Saves/Save" + save_index))
        fs.mkdirSync("./Saves/Save" + save_index);
    if (!fs.existsSync("./Saves/Save" + save_index + "/Generations"))
        fs.mkdirSync("./Saves/Save" + save_index + "/Generations");
    if (!start_from_save) {
        fs.rmSync("./Saves/Save" + save_index + "/Generations", { recursive: true });
        fs.mkdirSync("./Saves/Save" + save_index + "/Generations");
    }
    fs.openSync("./Saves/Save" + save_index + "/best_fitness.json", "a+");
}

//Saves the generation to a file
function saveGeneration(results, generation) {
    fs.openSync("./Saves/Save" + save_index + "/Generations/generation" + generation + ".json", "a+");
    fs.writeFileSync("./Saves/Save" + save_index + "/Generations/generation" + generation + ".json", JSON.stringify(results), (err) => {
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
    for (let i = 0; i < species_carry_size; i++) {
        if (partition[i][0] < 0) continue;
        Cs.push(partition[i][2]);
    }
    //Normalize the inputs
    let partition_sum = 0;
    for (let i = 0; i < partition.length; i++) {
        partition[i][0] = Math.max(partition[i][0], 0);
        partition_sum += partition[i][0] ** partition_exponentiator;
    }
    if (partition_sum == 0) {
        for (let i = 0; i < partition.length; i++)
            partition[i][0] = 1 / partition.length;
    } else {
        for (let i = 0; i < partition.length; i++)
            partition[i][0] = (partition[i][0] ** partition_exponentiator) / partition_sum;
    }
    //Run crossover from current species
    for (let i = 0; Cs.length < generation_size; i++) {
        const C = new Array(C_range.length);
        //Pick the individual
        let seed = Math.random();
        let id1 = 0;
        while (id1 < partition.length - 1) {
            seed -= partition[id1][0];
            if (seed < 0 && partition[id1][0] > 0) break;
            id1++;
        }
        seed = Math.random();
        let id2 = 0;
        while (id2 < partition.length - 1) {
            seed -= partition[id2][0];
            if (seed < 0 && partition[id2][0] > 0) break;
            id2++;
        }
        const ratio1 = partition[id1][0] / (partition[id1][0] + partition[id2][0]);
        for (let j = 0; j < C_genes.length; j++) {
            //Find out which gene to take based on the partition
            const l = C_genes[j][0];
            const r = C_genes[j][1];
            //Choose which parent to pick the gene from and copy it
            for (let k = l; k <= r; k++)
                C[k] = ratio1 * partition[id1][2][k] + (1 - ratio1) * partition[id2][2][k];
            //Mutate the individual
            if (Math.random() < mutation_rate) {
                for (let k = l; k <= r; k++) {
                    const difference = sampleNormalDistribution(0, mutation_std);
                    C[k] += (C_range[k][1] - C_range[k][0]) * difference;
                    C[k] = Math.max(C_range[k][0], C[k]);
                    C[k] = Math.min(C_range[k][1], C[k]);
                }
            } 
        }
        Cs.push(C);
    }
    return Cs;
}

//Sends a message to a thread
function sendMessage(id, msg) {
    if (used_threads[id]) return;
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
            used_threads[i] = false;
            used_threads_count--;
            if (input.length == 2) {
                fitness[input[0] - 1] = calculateFitness(input[1][0], input[1][1]);
                testing_progress++;    
            }
        });
    }
}

//Closes all the tester threads
function closeThreads() {
    console.log("Closing Threads...");
    for (let i = 0; i < thread_count; i++)
        threads[i].postMessage("exit");
}

//Rounds a C-value
function roundC(C) {
    const C_rounded = [];
    for (let i = 0; i < C_range.length; i++) {
        C_rounded.push(C[i]);
        if (C_range[i][2] == 1)
            C_rounded[i] = Math.round(C_rounded[i]);
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
        if (generation <= max_generations && individual <= generation_size) {
            //If currently testing something, then attempt to test next trial
            if (used_threads_count == thread_count) return;
            for (let j = 0; j < thread_count; j++)
                if (!used_threads[j]) {
                    sendMessage(j, JSON.stringify([ roundC(Cs[individual - 1]), individual, generation ]));
                    individual++;
                    break;
                }
            const progress = testing_progress / generation_size;
            const bars = "#".repeat(Math.floor(progress * progress_bar_length));
            const blanks = "-".repeat(progress_bar_length - bars.length);
            let text = "Generation " + generation + ": [" + bars + blanks + "] -> " + (progress * 100).toFixed(1) + "%";
            while (text.length < max_display_text_length)
                text += " ";
            process.stdout.write(text + "\r");
        } else if (testing_progress == generation_size) {
            //If testing is done, compile and analyze the results and then finally create the new generation
            results = [];
            for (let i = 0; i < Cs.length; i++)
                results.push([ fitness[i], Cs[i] ]);
            analysis = analyzeGenerationResults(results);
            printGenerationAnalysis(generation, analysis);
            fitness = new Array(generation_size).fill(0);
            testing_progress = 0;
            individual = 1;
            Cs = createGeneration(results, analysis);
            saveGeneration(results, generation);
            generation++;
        }
        if (generation > max_generations || analysis[4] >= score_goal) {
            clearInterval(interval);
            closeThreads();
        }
    }, interval_wait);
}

train();