const { test, sampleNormalDistribution } = require("./test.js");
const fs = require("fs");


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
    [ 4, 4, 1 ],
    [ 4, 4, 1 ],
    [ 0, 1000, 1 ]
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
    [ 23, 23 ]
]
//Other training constants
const generation_size = 1000;
const species_carry_size = 10;
const species_random_size = 190;
const species_creation_size = 600;
const species_adjustment_size = 200;
const trial_count = 10;
const trial_seed_multiplier = 73/31;
const max_generations = Infinity;
const species_creation_mutation_rate = 0.2;
const species_adjustment_mutation_rate = 0.1;
const species_adjustment_mutation_std = 0.1;
const partition_exponentiator = 2;
const start_from_saved_generation = false;
const max_display_text_length = 100;

//Runs the AI for a given C
function runGame(C, generation, id) {
    let mean_score = 0;
    let mean_time = 0;
    for (let i = 0; i < trial_count; i++) {
        const results = test(C, generation, id, i + 1, max_display_text_length, 1 + i * trial_seed_multiplier);
        mean_score += results[0];
        mean_time += results[1];
    }
    mean_score /= trial_count;
    mean_time /= trial_count;
    return [ mean_score, mean_time ];
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
        const results = eval(fs.readFileSync("./Save/generation.txt", "utf-8"));
        for (let i = 0; i < results.length; i++)
            Cs.push(results[i][2]);
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
    for (let i = 0; i < Cs.length; i++) {
        const results = runGame(Cs[i], generation, i, trial_count, trial_seed_multiplier, max_display_text_length);
        scores.push([ results[0], results[1], Cs[i] ]);
    }
    return scores;
}

//Analyzes the median, mean, STD, min, and max scores of a generation
function analyzeGenerationResults(results) {
    const analysis = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
    //Calculate Median score
    results.sort((a, b) => { return a[0] - b[0] });
    if (results.length % 2) analysis[0] = results[Math.floor(results.length / 2)][0];
    else analysis[0] = (results[results.length / 2][0] + results[results.length / 2 - 1][0]) / 2;
    //Calculate Mean score
    for (let i = 0; i < results.length; i++)
        analysis[1] += results[i][0];
    analysis[1] /= results.length;
    //Calculate STD score
    for (let i = 0; i < results.length; i++)
        analysis[2] += (results[i][0] - analysis[1]) ** 2;
    analysis[2] = Math.sqrt(analysis[2] / results.length);
    //Calculate Min/Max score
    analysis[3] = results[0][0];
    analysis[4] = results[results.length - 1][0];
    //Calculate Median time
    results.sort((a, b) => { return a[1] - b[1] });
    if (results.length % 2) analysis[5] = results[Math.floor(results.length / 2)][1];
    else analysis[5] = (results[results.length / 2][1] + results[results.length / 2 - 1][1]) / 2;
    //Calculate Mean time
    for (let i = 0; i < results.length; i++)
        analysis[6] += results[i][1];
    analysis[6] /= results.length;
    //Calculate STD time
    for (let i = 0; i < results.length; i++)
        analysis[7] += (results[i][1] - analysis[6]) ** 2;
    analysis[7] = Math.sqrt(analysis[7] / results.length);
    //Calculate Min/Max score
    analysis[8] = results[0][1];
    analysis[9] = results[results.length - 1][1];
    return analysis;
}

//Print-out the results in the console
function printGenerationAnalysis(generation, analysis) {
    let text = "Generation " + generation + ": Median Score - " + analysis[0];
    while (text.length < max_display_text_length)
        text += " ";
    const blank = new Array(("Generation " + generation + ":  ").length).join(" ");
    console.log(text);
    console.log(blank + "Mean Score - " + analysis[1]);
    console.log(blank + "STD Score - " + analysis[2]);
    console.log(blank + "Min Score - " + analysis[3]);
    console.log(blank + "Max Score - " + analysis[4]);
    console.log(blank + "Median Time - " + analysis[5]);
    console.log(blank + "Mean Time - " + analysis[6]);
    console.log(blank + "STD Time - " + analysis[7]);
    console.log(blank + "Min Time - " + analysis[8]);
    console.log(blank + "Max Time - " + analysis[9]);
}

//Open Save Files
function openSaveFiles() {
    if (!fs.existsSync("./Save"))
        fs.mkdirSync("./Save");
    fs.openSync("./Save/best.txt", "a+");
    fs.openSync("./Save/generation.txt", "a+");
}

//Saves the generation to a file
function saveGeneration(results) {
    fs.writeFileSync("./Save/generation.txt", JSON.stringify(results), (err) => {
        if (err) throw err;
    });
    results.sort((a, b) => { return b[0] - a[0] });
    const previous_best = eval(fs.readFileSync("./Save/best.txt", "utf-8"));
    if (previous_best == null || results[0][0] > previous_best[0])
        fs.writeFileSync("./Save/best.txt", JSON.stringify(results[0]), (err) => {
            if (err) throw err;
        });

}

//Creates a new generation from the results of a previous generation
function createGeneration(results, analysis) {
    //Use STDs to find out the distribution of each C based on scores
    const time_partition = [];
    const score_partition = [];
    for (let i = 0; i < results.length; i++) {
        //Calculate the standard deviation of our result
        const std_score = (results[i][0] - analysis[1]) / analysis[2];
        const std_time = (results[i][1] - analysis[6]) / analysis[7];
        if (std_time >= 0)
            time_partition.push([ std_time, results[i][2] ]);
        if (std_score >= 0)
            score_partition.push([ std_score, results[i][2] ]);
    }
    //Sort the partitions
    time_partition.sort((a, b) => { return b[0] - a[0] });
    score_partition.sort((a, b) => { return b[0] - a[0] });
    //Carry-over some of the C-values
    const Cs = [];
    for (let i = 0; i < Math.min(time_partition.length, species_carry_size / 2); i++)
        Cs.push(time_partition[i][1]);
    for (let i = 0; i < Math.min(score_partition.length, species_carry_size / 2); i++)
        Cs.push(score_partition[i][1]);
    const actaul_carry_over = Cs.length;
    //Generate random species
    for (let i = 0; i < species_random_size + species_carry_size - actaul_carry_over; i++)
        Cs.push(generateRandomC());
    //Normalize the inputs
    let partition_sum = 0;
    const partition = [];
    for (let i = 0; i < time_partition.length; i++)
        partition_sum += time_partition[i][0] ** partition_exponentiator;
    for (let i = 0; i < score_partition.length; i++)
        partition_sum += score_partition[i][0] ** partition_exponentiator;  
    for (let i = 0; i < time_partition.length; i++)
        partition.push([ (time_partition[i][0] ** partition_exponentiator) / partition_sum, time_partition[i][1] ]);
    for (let i = 0; i < score_partition.length; i++)
        partition.push([ (score_partition[i][0] ** partition_exponentiator) / partition_sum, score_partition[i][1] ]);
    //Generate new species from current species
    for (let i = 0; i < species_creation_size; i++) {
        const C = new Array(C_range.length);
        let seed = Math.random();
        let id = 0;
        while (id < partition.length - 1) {
            seed -= partition[id][0];
            if (seed < 0 && partition[id][0] > 0) break;
            id++;
        }
        for (let j = 0; j < C_genes.length; j++) {
            //Find out which gene to take based on the partition
            const l = C_genes[j][0];
            const r = C_genes[j][1];
            //Copy the gene to the new generation
            for (let k = l; k <= r; k++)
                C[k] = partition[id][1][k];
            //Check if we want to create a new species or not
            if (Math.random() < species_creation_mutation_rate) {
                for (let k = l; k <= r; k++) {
                    if (C_range[k][2] == 1)
                        C[k] = C_range[k][0] + Math.floor(Math.random() * (C_range[k][1] - C_range[k][0] + 1))
                    else
                        C[k] = C_range[k][0] + Math.random() * (C_range[k][1] - C_range[k][0]);
                }
            } 
        }
        Cs.push(C);
    }
    //Mutate current species
    for (let i = 0; i < species_adjustment_size; i++) {
        const C = new Array(C_range.length);
        let seed = Math.random();
        let id = 0;
        while (id < partition.length - 1) {
            seed -= partition[id][0];
            if (seed < 0 && partition[id][0] > 0) break;
            id++;
        }
        for (let j = 0; j < C_genes.length; j++) {
            //Find out which gene to take based on the partition
            const l = C_genes[j][0];
            const r = C_genes[j][1];
            //Copy the gene to the new generation
            for (let k = l; k <= r; k++)
                C[k] = partition[id][1][k];
            //Check if we want to mutate the gene and if so, then mutate
            if (Math.random() < species_adjustment_mutation_rate) {
                const difference = sampleNormalDistribution(0, species_adjustment_mutation_std);
                C[l] += (C_range[l][1] - C_range[l][0]) * difference;
                C[l] = Math.max(C_range[l][0], C[l]);
                C[l] = Math.min(C_range[l][1], C[l]);
                if (C_range[l][2] == 1)
                    C[l] = Math.round(C[l]);
            } 
        }
        Cs.push(C);
    }
    return Cs;
}

function train() {
    openSaveFiles();
    let Cs = createFirstGeneration();
    let analysis = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
    let generation = 1;
    let results = null;
    while (generation <= max_generations) {
        results = testGeneration(Cs, generation);
        analysis = analyzeGenerationResults(results);
        printGenerationAnalysis(generation, analysis);
        Cs = createGeneration(results, analysis);
        saveGeneration(results);
        generation++;
    }
    //Print-out the best C out of the final generation to print
    let max_score = -1;
    let C = null;
    for (let i = 0; i < results.length; i++)
        if (max_score < results[i][0])
            max_score = results[i][0], C = results[i][2];
    console.log("Max Score: " + max_score);
    console.log("Best C: [" + C + "]");
}

train();