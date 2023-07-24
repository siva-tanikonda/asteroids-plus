const { Game } = require("./training_game.js");
const { AI } = require("./training_ai.js");
const { sampleNormalDistribution } = require("./math.js");
const fs = require("fs");


//Ranges that each constant can be when training the AI ([ left_bound, right_bound, onlyInteger ])
const C_range = [
    [ 0, 1e4, 1 ],
    [ 1, 2, 1 ],
    [ 0, 1e-3, 0 ],
    [ 1, 2, 1 ],
    [ 0, 1e-3, 0 ],
    [ 1, 2, 1 ],
    [ 0, 1e-3, 0 ],
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
    [ 0, 1000, 1 ]
];
//Describes what ranges of indices in C each represent a gene
const C_genes = [
    [ 0, 1 ],
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
    [ 23, 23 ]
]
//Other training constants
const generation_size = 1000;
const max_generations = Infinity;
const score_goal = Infinity;
const mutation_rate = 0.25;
const mutation_variance = 0.1;
const species_creation_amount = 490;
const species_creation_mutation_multiplier = 1;
const carry_over = 10;
const partition_exponentiator = 4;
const time_weightage = 100;
const score_weightage = 0;
const start_from_saved_generation = false;

//Game settings
const game_precision = 25;
const game_speed = 1;
const delay = 1;
const max_display_text_length = 100;

//Runs the AI for a given C
function runGame(C, generation, id) {
    const controls = {
        left: false,
        right: false,
        forward: false,
        fire: false,
        teleport: false,
        start: false,
        pause: false
    };
    const game = new Game(controls);
    const ai = new AI(C, game);
    let dead = false;
    while (!dead) {
        ai.update(1);
        ai.applyControls(controls);
        const iteration_updates = game_precision * game_speed;
        for (let j = 0; j < iteration_updates; j++) {
            const done = game.update(delay / game_precision);
            if (done) {
                dead = true;
                break;
            }
        }
        let text = "Generation " + generation + ": Species " + (id + 1) + ", Score " + game.score + ", Time Elapsed " + Math.floor(game.time);
        while (text.length < max_display_text_length)
            text += " ";
        process.stdout.write(text + "\r");
    }
    return game.time * time_weightage + game.score * score_weightage;
}

//Generates a random C
function generateRandomC() {
    let C = new Array(C_range.length);
    for (let i = 0; i < C_range.length; i++) {
        if (C_range[i][2] == 1)
            C[i] = C_range[i][0] + Math.floor(Math.random() * (C_range[i][1] - C_range[i][0] + 1))
        else
            C[i] = C_range[i][0] + Math.random() * (C_range[i][1] - C_range[i][0]);
    }
    return C;
}

//Creates a generation of random Cs
function createFirstGeneration() {
    if (start_from_saved_generation) {
        const Cs = [];
        const scores = eval(fs.readFileSync("./Save/generation.txt", "utf-8"));
        for (let i = 0; i < scores.length; i++)
            Cs.push(scores[i][1]);
        return Cs;
    }
    const Cs = [];
    for (let i = 0; i < generation_size; i++)
        Cs.push(generateRandomC());
    return Cs;
}

//Runs the AI for each C-value in the generation
function testGeneration(Cs, generation) {
    let scores = [];
    for (let i = 0; i < Cs.length; i++) 
        scores.push([ runGame(Cs[i], generation, i), Cs[i] ]);
    return scores;
}

//Analyzes the median, mean, STD, min, and max scores of a generation
function analyzeGenerationResults(scores) {
    const results = [ 0, 0, 0, 0, 0 ];
    //Get just the scores (remove the Cs)
    const just_scores = [];
    for (let i = 0; i < scores.length; i++)
        just_scores.push(scores[i][0]);
    scores = just_scores;
    //Calculate Median
    scores.sort((a, b) => { return a - b });
    if (scores.length % 2) results[0] = scores[Math.floor(scores.length / 2)];
    else results[0] = (scores[scores.length / 2] + scores[scores.length / 2 - 1]) / 2;
    //Calculate Mean
    for (let i = 0; i < scores.length; i++)
        results[1] += scores[i];
    results[1] /= scores.length;
    //Calculate STD
    for (let i = 0; i < scores.length; i++)
        results[2] += (scores[i] - results[1]) ** 2;
    results[2] = Math.sqrt(results[2] / scores.length);
    //Calculate Min/Max
    results[3] = scores[0];
    results[4] = scores[scores.length - 1];
    return results;
}

//Print-out the results in the console
function printGenerationResults(generation, results) {
    let text = "Generation " + generation + ": Median - " + results[0];
    while (text.length < max_display_text_length)
        text += " ";
    const blank = new Array(("Generation " + generation + ":  ").length).join(" ");
    console.log(text);
    console.log(blank + "Mean - " + results[1]);
    console.log(blank + "STD - " + results[2]);
    console.log(blank + "Min - " + results[3]);
    console.log(blank + "Max - " + results[4]);
}

//Open Save Files
function openSaveFiles() {
    if (!fs.existsSync("./Save"))
        fs.mkdirSync("./Save");
    fs.openSync("./Save/best.txt", "a+");
    fs.openSync("./Save/generation.txt", "a+");
}

//Saves the generation to a file
function saveGeneration(scores) {
    fs.writeFileSync("./Save/generation.txt", JSON.stringify(scores), (err) => {
        if (err) throw err;
    });
    const previous_best = eval(fs.readFileSync("./Save/best.txt", "utf-8"));
    if (previous_best == null || scores[0][0] > previous_best[0])
        fs.writeFileSync("./Save/best.txt", JSON.stringify(scores[0]), (err) => {
            if (err) throw err;
        });

}

//Creates a new generation from the results of a previous generation
function createGeneration(scores, results) {
    //Use STDs to find out the distribution of each C based on scores
    const partition = [];
    scores.sort((a, b) => b[0] - a[0]);
    for (let i = 0; i < scores.length; i++) {
        //Calculate the standard deviation of our result
        const value = (scores[i][0] - results[1]) / results[2];
        partition.push(value);
        if (value > 0) partition[i] = value;
        else partition[i] = 0;
    }
    //Carry-over some of the C-values
    const Cs = [];
    for (let i = 0; i < carry_over; i++)
        if (partition[i] > 0) Cs.push(scores[i][1]);
    //Normalizing inputs
    let partition_sum = 0;
    for (let i = 0; i < scores.length; i++)
        partition_sum += partition[i] ** partition_exponentiator;
    for (let i = 0; i < scores.length; i++)
        partition[i] = (partition[i] ** partition_exponentiator) / partition_sum;
    //Generating new species based on partition
    const actual_carry_over = Cs.length;
    let species_to_create = species_creation_amount;
    for (let i = 0; i < generation_size - actual_carry_over; i++) {
        const C = new Array(C_range.length);
        for (let j = 0; j < C_genes.length; j++) {
            //Find out which gene to take based on the partition
            const l = C_genes[j][0];
            const r = C_genes[j][1];
            let seed = Math.random();
            let id = 0;
            while (id < generation_size - 1) {
                seed -= partition[id];
                if (seed < 0 && partition[id] > 0) break;
                id++;
            }
            //Copy the gene to the new generation
            for (let k = l; k <= r; k++)
                C[k] = scores[id][1][k];
            //Check if we want to create a new species or not
            if (species_to_create > 0 && Math.random() < mutation_rate * species_creation_mutation_multiplier) {
                for (let k = l; k <= r; k++) {
                    if (C_range[k][2] == 1)
                        C[k] = C_range[k][0] + Math.floor(Math.random() * (C_range[k][1] - C_range[k][0] + 1))
                    else
                        C[k] = C_range[k][0] + Math.random() * (C_range[k][1] - C_range[k][0]);
                }
            } 
            //Check if we want to mutate the gene and if so, then mutate
            if (species_to_create <= 0 && Math.random() < mutation_rate) {
                for (let k = l; k <= r; k++) {
                    const difference = sampleNormalDistribution(0, mutation_variance);
                    C[k] += (C_range[k][1] - C_range[k][0]) * difference;
                    C[k] = Math.max(C_range[k][0], C[k]);
                    C[k] = Math.min(C_range[k][1], C[k]);
                    if (C_range[k][2] == 1)
                        C[k] = Math.round(C[k]);
                }
            } 
        }
        species_to_create = Math.max(0, species_to_create - 1);
        Cs.push(C);
    }
    return Cs;
}

function train() {
    openSaveFiles();
    let Cs = createFirstGeneration();
    let results = [ 0, 0, 0, 0, 0 ];
    let generation = 1;
    let scores = null;
    while (generation <= max_generations && results[4] < score_goal) {
        scores = testGeneration(Cs, generation);
        results = analyzeGenerationResults(scores);
        printGenerationResults(generation, results);
        Cs = createGeneration(scores, results);
        saveGeneration(scores);
        generation++;
    }
    //Print-out the best C out of the final generation to print
    let max_score = -1;
    let C = null;
    for (let i = 0; i < scores.length; i++)
        if (max_score < scores[i][0])
            max_score = scores[i][0], C = scores[i][1];
    console.log("Max Score: " + max_score);
    console.log("Best C: [" + C + "]");
}

train();