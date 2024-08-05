#include <climits>
#include "trainer.h"

// Calculates the net fitness value (including carry-over generation fitness) of a particular agent 
double calculateTrainerGenerationDataFitness(const TrainerGenerationData *data) {
    double fitness = 0;
    for (double metric : data->metrics) {
        fitness += metric;
    }
    fitness /= data->metrics.size();
    return fitness;
}

// Compares the net fitness of two entities (returns true if the first fitness is greater than the second one)
bool compareTrainerGenerationDataPointers(const TrainerGenerationData *data1, const TrainerGenerationData *data2) {
    double fitness1 = calculateTrainerGenerationDataFitness(data1);
    double fitness2 = calculateTrainerGenerationDataFitness(data2);
    return fitness1 > fitness2;
}

Trainer::Trainer(const json &config) : generation_size(config["training_config"]["generation_size"]), current_generation(1), viewing_generation(1), stage(0), seed(0), evaluation_progress(0), evaluation_index(0), old_click(false), done(false), save(config["training_config"]["save"]) {
    // Loads each stage of the training configuration
    this->processStages(config["training_config"]["training_generations"], config["training_config"]["evaluation_generation"]);
    this->deleteSavedData();
    this->createFirstGeneration(config["training_config"]["random_starting_weights"]);
}

Trainer::~Trainer() {
    // Only dynamically-allocated memory is the generation_data
    for (TrainerGenerationData *generation_data : this->data) {
        delete generation_data;
    }
}

// Update function for the trainer
void Trainer::update(bool rendering, EvaluationManager *evaluation_manager, EventManager *event_manager) {
    // Process the switching between generations in the UI
    Vector mp = event_manager->getMousePosition();
    Vector button_corner_1(Game::getWidth() / 3 + 150, Game::getHeight() - 115);
    Vector button_corner_2(button_corner_1.x + 30, button_corner_1.y + 30);
    bool some_click = false;
    if (!this->old_click && this->viewing_generation < this->current_generation && mp.x >= button_corner_1.x && mp.x <= button_corner_2.x && mp.y >= button_corner_1.y && mp.y <= button_corner_2.y && event_manager->getClick()) {
        this->viewing_generation++;
        this->old_click = true;
    }
    button_corner_1.x -= 330;
    button_corner_2.x -= 330;
    if (!this->old_click && this->viewing_generation > 1 && mp.x >= button_corner_1.x && mp.x <= button_corner_2.x && mp.y >= button_corner_1.y && mp.y <= button_corner_2.y && event_manager->getClick()) {
        this->viewing_generation--;
        this->old_click = true;
    }
    if (rendering) {
        this->old_click = false;
    }
    // If training is complete, we have nothing to update (the user is just able to view the histograms and graphs)
    if (this->done) {
        return;
    }
    if (this->evaluation_progress < (this->generation_size) * (this->stages[this->stage].trial_count)) {
        // If we are in the process of evaluating this generation
        if (this->evaluation_index < this->generation_size) {
            // Attempt to send the next evaluation request
            int seed = this->seed * this->stages[this->stage].trial_count + (this->stages[this->stage].trial_count - this->data[this->evaluation_index]->seeds_remaining);
            bool request_sent = evaluation_manager->sendRequest(this->data[this->evaluation_index]->c, seed, this->evaluation_index);
            if (request_sent) {
                // If we sent the request, we reduce the number of seeds remaining and if there are no more seeds left for the current agent, we go to evaluate the next agent
                this->data[this->evaluation_index]->seeds_remaining--;
                if (this->data[this->evaluation_index]->seeds_remaining == 0) {
                    this->evaluation_index++;
                }
            }
        }
        //Attempt to get the next result if there is one
        double results[EVALUATION_METRICS];
        int result_index = evaluation_manager->getResult(results);
        if (result_index != -1) {
            // If there is a result, we calculate the fitness metric for this generation and seed
            double metric = 0;
            for (int i = 0; i < EVALUATION_METRICS; i++) {
                metric += this->stages[this->stage].fitness_weights[i] * results[i];
            }
            // We add the metric to the list of metrics
            this->data[result_index]->new_metrics.push_back(metric);
            // We update our progress meter
            this->evaluation_progress++;
        }
    } else {
        // If we have completed the evaluation, we do post-processing
        this->performGenerationPostProcessing();
        this->addDisplayedData();
        this->saveGeneration();
        // Check if we are done with training (done with evaluation generation) or progress to the next generation (and stage, if applicable)
        this->done = this->progressGeneration();
        if (this->stage < this->stages.size() - 1) {
            // Create a new generation if we are still in a training generation
            this->createNewGeneration();
        } else if (this->stage == this->stages.size() - 1) {
            // Just carry-over this generation if we are still in the evaluation generation
            this->prepareEvaluation();
        }
    }
}

// Render the training UI
void Trainer::render(Renderer *renderer, EventManager *event_manager) const {
    if (!done && this->displayed_data.size() < this->viewing_generation) {
        // If we are looking at the evaluation-in-progress generation, we just show the progress
        renderer->requestText(SMALL, "Progress: " + to_string(this->evaluation_progress) + "/" + to_string(this->stages[this->stage].trial_count * this->generation_size), Game::getWidth() / 3, Game::getHeight() - 140, MIDDLE, 250, 250, 100, 255);
    } else {
        // Else, we show the histogram of the generation data and the general statistics
        TrainerGenerationStatistics statistics = this->displayed_data[this->viewing_generation - 1].statistics;
        renderer->requestText(SMALL, "Mean: " + trimDouble(statistics.mean_fitness) + ", STD: " + trimDouble(statistics.std_fitness) + ", Median: " + trimDouble(statistics.median_fitness) + ", Min: " + trimDouble(statistics.min_fitness) + ", Max: " + trimDouble(statistics.max_fitness), Game::getWidth() / 3, Game::getHeight() - 140, MIDDLE, 255, 255, 255, 255);
        this->renderHistogram(renderer, Game::getWidth() / 3 - 300, Game::getHeight() - 600, 600, 400);
    }
    // Render the buttons to switch between generations
    Vector button_corner_1(Game::getWidth() / 3 + 150, Game::getHeight() - 115);
    Vector button_corner_2(button_corner_1.x + 30, button_corner_1.y + 30);
    if (this->viewing_generation < this->current_generation) {
        renderer->requestRectangle(button_corner_1.x, button_corner_1.y, button_corner_2.x, button_corner_2.y, 255, 255, 255, 255);
        renderer->requestLine(button_corner_1.x + 23, button_corner_1.y + 15, button_corner_1.x + 10, button_corner_1.y + 8, 255, 255, 255, 255);
        renderer->requestLine(button_corner_1.x + 23, button_corner_1.y + 15, button_corner_1.x + 10, button_corner_1.y + 22, 255, 255, 255, 255);
    }
    button_corner_1.x -= 330;
    button_corner_2.x -= 330;
    if (this->viewing_generation > 1) {
        renderer->requestRectangle(button_corner_1.x, button_corner_1.y, button_corner_2.x, button_corner_2.y, 255, 255, 255, 255);
        renderer->requestLine(button_corner_1.x + 7, button_corner_1.y + 15, button_corner_1.x + 20, button_corner_1.y + 8, 255, 255, 255, 255);
        renderer->requestLine(button_corner_1.x + 7, button_corner_1.y + 15, button_corner_1.x + 20, button_corner_1.y + 22, 255, 255, 255, 255);
    }
    if (this->stage < this->stages.size() - 1 || this->current_generation != this->viewing_generation) {
        // If we are not in the evaluation generation, state the generation number
        renderer->requestText(REGULAR, "Generation " + to_string(this->viewing_generation), Game::getWidth() / 3, Game::getHeight() - 100, MIDDLE, 255, 255, 255, 255);
    } else {
        // If we are in the evaluation generation, just display "Evaluation"
        renderer->requestText(REGULAR, "Evaluation", Game::getWidth() / 3, Game::getHeight() - 100, MIDDLE, 255, 255, 255, 255);
    }
    // Render the graphs of the mean fitnesses over generations and the standard deviations over generations
    this->renderProgressionGraph(renderer, Game::getWidth() - 300, 100, 200, 200, "Generation", "Mean Fitness", MEAN);
    this->renderProgressionGraph(renderer, Game::getWidth() - 300, 400, 200, 200, "Generation", "STD Fitness", STD);
}

// Renders the histogram for the generation
void Trainer::renderHistogram(Renderer *renderer, double x, double y, double width, double height) const {
    renderer->requestLine(x, y + height, x + width, y + height, 255, 255, 255, 255);
    for (int i = 0; i <= HISTOGRAM_BARS; i++) {
        // Render each bar based on the displayed_data
        double statistics_range = this->displayed_data[this->viewing_generation - 1].statistics.max_fitness - this->displayed_data[this->viewing_generation - 1].statistics.min_fitness;
        renderer->requestLine(x + i * (width / HISTOGRAM_BARS), y + height, x + i * (width / HISTOGRAM_BARS), y + height + 5, 255, 255, 255, 255);
        renderer->requestText(TINY, to_string((int)(this->displayed_data[this->viewing_generation - 1].statistics.min_fitness + i * (statistics_range / HISTOGRAM_BARS))), x + i * (width / HISTOGRAM_BARS), y + height + 15, MIDDLE, 255, 255, 255, 255);
        if (i < HISTOGRAM_BARS) {
            renderer->requestFilledRectangle(x + i * (width / HISTOGRAM_BARS) + 1, y + height - this->displayed_data[this->viewing_generation - 1].histogram_bars[i] * (height / this->generation_size), x + (i + 1) * (width / HISTOGRAM_BARS) - 1, y + height, 255, 255, 255, 255);
            // Render the labels for what range each bar covers
            renderer->requestText(TINY, to_string(this->displayed_data[this->viewing_generation - 1].histogram_bars[i]), x + i * (width / HISTOGRAM_BARS) + (width / (2 * HISTOGRAM_BARS)), y + height - this->displayed_data[this->viewing_generation - 1].histogram_bars[i] * (height / this->generation_size) - 15, MIDDLE, 255, 255, 255, 255);
        }
    }
}

// Render a graph to show statistics changes over generations
void Trainer::renderProgressionGraph(Renderer *renderer, int x, int y, int width, int height, string x_axis, string y_axis, TRAINER_STATISTIC_DISPLAY statistic) const {
    // Get the max value of the statistic
    double max_value = 1;
    int count = min(this->current_generation - 1, (int)this->displayed_data.size());
    for (int i = 0; i < min(this->current_generation - 1, (int)this->displayed_data.size()); i++) {
        switch(statistic) {
            case MEAN:
                max_value = max(max_value, this->displayed_data[i].statistics.mean_fitness);
                break;
            case STD:
                max_value = max(max_value, this->displayed_data[i].statistics.std_fitness);
                break;
        }
    }
    // Render the line plot to cover all data points
    Vector previous_point(x, y + height);
    for (int i = 0; i < this->current_generation - 1; i++) {
        Vector point(x + (i + 1) * ((double)width / max(1, this->current_generation - 1)), y + height);
        switch(statistic) {
            case MEAN:
                point.y -= max(0.0, (this->displayed_data[i].statistics.mean_fitness / max_value) * height);
                break;
            case STD:
                point.y -= max(0.0, (this->displayed_data[i].statistics.std_fitness / max_value) * height);
                break;
        }
        renderer->requestLine(previous_point.x, previous_point.y, point.x, point.y, 255, 255, 255, 255);
        previous_point = point;
    }
    // Render axis names and axis labels
    renderer->requestLine(x, y, x, y + height, 255, 255, 255, 255);
    renderer->requestLine(x, y + height, x + width, y + height, 255, 255, 255, 255);
    renderer->requestText(SMALL, y_axis, x - 10, y + height / 2 - 6, RIGHT, 255, 255, 255, 255);
    renderer->requestText(SMALL, x_axis, x + width / 2, y + height + 17, MIDDLE, 255, 255, 255, 255);
    renderer->requestText(TINY, to_string(this->current_generation - 1), x + width + 10, y + height - 7, LEFT, 255, 255, 255, 255);
    renderer->requestText(TINY, trimDouble(max_value), x, y - 15, MIDDLE, 255, 255, 255, 255);
}

// Creates the first generation for training (Generation 1)
void Trainer::createFirstGeneration(bool random_starting_weights) {
    mt19937 gen(-this->stages[0].seed);
    for (int i = 0; i < this->generation_size; i++) {
        // Create the generation with random weights or with all 0-ed out weights
        TrainerGenerationData *new_data = new TrainerGenerationData();
        for (int j = 0; j < C_LENGTH; j++) {
            if (random_starting_weights) {
                new_data->c[j] = randomInRange(gen, this->stages[0].weight_ranges[j].first, this->stages[0].weight_ranges[j].second);
            } else {
                new_data->c[j] = this->stages[0].weight_ranges[j].first;
            }
        }
        new_data->seeds_remaining = this->stages[0].trial_count;
        this->data.push_back(new_data);
    }
}

void Trainer::createNewGeneration() {
    mt19937 gen(-this->seed);
    vector<TrainerGenerationData*> new_generation;
    vector<double> distribution;
    if (this->displayed_data.back().statistics.std_fitness > 0) {
        // If we have a non-zero variance
        double softmax_sum = 0;
        for (int i = 0; i < this->generation_size; i++) {
            double fitness = calculateTrainerGenerationDataFitness(this->data[i]);
            fitness -= this->displayed_data.back().statistics.mean_fitness;
            fitness /= this->displayed_data.back().statistics.std_fitness;
            // Create the softmax denominator with the z-scores of each fitness
            softmax_sum += exp(this->stages[this->stage].softmax_weight * fitness);
        }
        for (int i = 0; i < this->generation_size; i++) {
            double fitness = calculateTrainerGenerationDataFitness(this->data[i]);
            fitness -= this->displayed_data.back().statistics.mean_fitness;
            fitness /= this->displayed_data.back().statistics.std_fitness;
            // State the probability of picking this agent based on the z-score of the fitness
            distribution.push_back(exp(this->stages[this->stage].softmax_weight * fitness) / softmax_sum);
        }
    } else {
        // If we have no variance, just define a uniform distribution to pick agents for recombination
        for (int i = 0; i < this->generation_size; i++) {
            distribution.push_back(1.0 / this->generation_size);
        }
    }
    // Create new agents 
    for (int i = 0; i < this->generation_size - this->stages[this->stage].carry_over_count; i++) {
        TrainerGenerationData *new_data = new TrainerGenerationData();
        new_data->seeds_remaining = this->stages[this->stage].trial_count;
        for (int j = 0; j < C_LENGTH; j++) {
            new_data->c[j] = 0;
        }
        // Pick combination_count number of parents for the new agent
        for (int j = 0; j < this->stages[this->stage].combination_count; j++) {
            double generated = randomDouble(gen);
            double accumulated_sum = 0;
            int index = 0;
            for (int k = 0; k < this->generation_size - 1; k++) {
                if (accumulated_sum + distribution[k] > generated) {
                    break;
                }
                index++;
                accumulated_sum += distribution[k];
            }
            for (int k = 0; k < C_LENGTH; k++) {
                new_data->c[k] += this->data[index]->c[k];
            }
        }
        double generated;
        for (int j = 0; j < C_LENGTH; j++) {
            // Normalize combination of traits from parents
            new_data->c[j] /= this->stages[this->stage].combination_count;
            generated = randomDouble(gen);
            if (generated <= this->stages[this->stage].mutation_rate) {
                // In this case, we want to mutate the gene in some way
                generated = randomDouble(gen);
                if (generated <= this->stages[this->stage].reroll_mutation_rate) {
                    // We want to randomly pick a value for this gene
                    new_data->c[j] = randomInRange(gen, this->stages[this->stage].weight_ranges[j].first, this->stages[this->stage].weight_ranges[j].second);
                } else {
                    // We want to multiply this gene by some power of e
                    new_data->c[j] *= exp(randomInNormal(gen, 0, this->stages[this->stage].mutation_weight));
                    new_data->c[j] = min(new_data->c[j], this->stages[this->stage].weight_ranges[j].second);
                    new_data->c[j] = max(new_data->c[j], this->stages[this->stage].weight_ranges[j].first);
                }
            }
        }
        // Add this new entity to the next generation
        new_generation.push_back(new_data);
    }
    // Pick some agents from the previous generation to just let live to this generation
    for (int i = 0; i < this->generation_size; i++) {
        if (i < this->stages[this->stage].carry_over_count) {
            while (this->data[i]->metrics.size() >= this->stages[this->stage].memory) {
                this->data[i]->metrics.erase(this->data[i]->metrics.begin());
            }
            this->data[i]->seeds_remaining = this->stages[this->stage].trial_count;
            this->data[i]->new_metrics.clear();
            new_generation.push_back(this->data[i]);
        } else {
            // If the performance of this agent is sub-par we deallocate its memory
            delete this->data[i];
        }
    }
    // Override the old generation with this new one
    this->data = new_generation;
}

// If we are entering the final "generation" (this is just the evaluation phase), then we just carry-over every agent
void Trainer::prepareEvaluation() {
    for (int i = 0; i < this->generation_size; i++) {
        this->data[i]->metrics.clear();
        this->data[i]->seeds_remaining = this->stages[this->stage].trial_count;
        this->data[i]->new_metrics.clear();
    }
}

// Processes each stage from the JSON config (just loads into Trainer's member variables)
void Trainer::processStages(const json &stage_configs, const json &evaluation_config) {
    // Create the training generation config
    for (int i = 0; i < stage_configs.size(); i++) {
        const json &stage_config = stage_configs[i];
        TrainerStage stage;
        stage.seed = stage_config["seed"];
        stage.seed_count = stage_config["seed_count"];
        stage.trial_count = stage_config["trial_count"];
        stage.generations_count = stage_config["generations_count"];
        stage.carry_over_count = stage_config["carry_over_count"];
        stage.combination_count = stage_config["combination_count"];
        stage.memory = stage_config["memory"];
        stage.mutation_rate = stage_config["mutation_rate"];
        stage.reroll_mutation_rate = stage_config["reroll_mutation_rate"];
        stage.mutation_weight = stage_config["mutation_weight"];
        stage.softmax_weight = stage_config["softmax_weight"];
        for (int j = 0; j < EVALUATION_METRICS; j++) {
            stage.fitness_weights[j] = stage_config["fitness_weights"][j];
        }
        for (int j = 0; j < C_LENGTH; j++) {
            stage.weight_ranges[j] = static_cast<pair<double, double>>(make_pair(stage_config["weight_ranges"][j][0], stage_config["weight_ranges"][j][1]));
        }
        this->stages.push_back(stage);
    }
    // Create the evaluation stage configuration
    TrainerStage evaluation_stage;
    evaluation_stage.seed = evaluation_config["seed"];
    evaluation_stage.trial_count = evaluation_config["trial_count"];
    for (int i = 0; i < EVALUATION_METRICS; i++) {
        evaluation_stage.fitness_weights[i] = evaluation_config["fitness_weights"][i];
    }
    evaluation_stage.generations_count = 1;
    this->stages.push_back(evaluation_stage);
    // Start in the first stage
    this->seed = this->stages[0].seed;
}

// Progresses to the next generation (and updates the viewing_generation too) and updates the stage if necessary
bool Trainer::progressGeneration() {
    // If we are looking at the latest generation, we progress to the next generation
    if (this->current_generation == this->viewing_generation) {
        this->viewing_generation++;
    }
    this->current_generation++;
    // Check if we need to go to the next stage
    int stage_generation_sum = 0;
    int new_stage = 0;
    for (int i = 0; i < this->stages.size(); i++) {
        if (stage_generation_sum + this->stages[i].generations_count >= this->current_generation) {
            break;
        }
        stage_generation_sum += this->stages[i].generations_count;
        new_stage++;
    }
    if (new_stage >= this->stages.size()) {
        // If there are no stages left, then just revert the generation change changes and return that our training + evaluation is done
        this->current_generation--;
        this->viewing_generation = min(this->viewing_generation, this->current_generation);
        return true;
    }
    if (new_stage > this->stage) {
        // If we are in a new stage, set the seed to the first seed of that generation
        this->stage = new_stage;
        this->seed = this->stages[new_stage].seed;
    } else {
        // If we haven't changed our stage, then just progress the seed
        this->seed = this->stages[this->stage].seed + (this->seed - this->stages[this->stage].seed + 1) % this->stages[this->stage].seed_count;
    }
    // Reset evaluation progress to prepare for the next generation
    this->evaluation_progress = 0;
    this->evaluation_index = 0;
    return false;
}

// Adds the metrics for each trial in this generation, and pushes the average fitness for this generation into the list of metrics for this agent
void Trainer::performGenerationPostProcessing() {
    for (TrainerGenerationData *generation_data : this->data) {
        // We sort the new metrics to avoid issues with floating point addition giving different results based on the order of evaluation completion (so we have deterministic output based on training seeds)
        sort(generation_data->new_metrics.begin(), generation_data->new_metrics.end());
        // Add all metrics and average them out
        double metric_sum = 0;
        for (double metric : generation_data->new_metrics) {
            metric_sum += metric;
        }
        generation_data->metrics.push_back(metric_sum / this->stages[this->stage].trial_count);
    }
}

// Adds the histogram and statistics to our training history
void Trainer::addDisplayedData() {
    // Sort the data from best fitness to worst fitness
    sort(this->data.begin(), this->data.end(), compareTrainerGenerationDataPointers);
    // Create the statistics
    TrainerGenerationDisplayedData generation_displayed_data;
    generation_displayed_data.statistics.min_fitness = DBL_MAX;
    generation_displayed_data.statistics.max_fitness = DBL_MIN;
    generation_displayed_data.statistics.median_fitness = generation_displayed_data.statistics.mean_fitness = generation_displayed_data.statistics.std_fitness = 0;
    for (int i = 0; i < this->generation_size; i++) {
        double fitness = calculateTrainerGenerationDataFitness(this->data[i]);
        generation_displayed_data.statistics.min_fitness = min(generation_displayed_data.statistics.min_fitness, fitness);
        generation_displayed_data.statistics.max_fitness = max(generation_displayed_data.statistics.max_fitness, fitness);
        generation_displayed_data.statistics.mean_fitness += fitness;
        if ((this->data.size() % 2 == 1 && i == this->data.size() / 2) || (this->data.size() % 2 == 0 && (i == this->data.size() / 2 || i == this->data.size() / 2 - 1))) {
            generation_displayed_data.statistics.median_fitness += fitness;
        }
    }
    if (this->data.size() % 2 == 0) {
        generation_displayed_data.statistics.median_fitness /= 2;
    }
    generation_displayed_data.statistics.mean_fitness /= this->generation_size;
    // Create the histogram bar heights for the generation (and finish calculating standard deviation)
    double histogram_bar_length = (generation_displayed_data.statistics.max_fitness - generation_displayed_data.statistics.min_fitness) / HISTOGRAM_BARS;
    if (histogram_bar_length == 0) {
        histogram_bar_length = 100;
    }
    fill(generation_displayed_data.histogram_bars, generation_displayed_data.histogram_bars + HISTOGRAM_BARS, 0);
    for (int i = 0; i < this->generation_size; i++) {
        double fitness = calculateTrainerGenerationDataFitness(this->data[i]);
        int histogram_bar = (int)floor((fitness - generation_displayed_data.statistics.min_fitness) / histogram_bar_length);
        histogram_bar = min(histogram_bar, HISTOGRAM_BARS - 1);
        histogram_bar = max(histogram_bar, 0);
        generation_displayed_data.histogram_bars[histogram_bar]++;
        generation_displayed_data.statistics.std_fitness += (fitness - generation_displayed_data.statistics.mean_fitness) * (fitness - generation_displayed_data.statistics.mean_fitness);
    }
    generation_displayed_data.statistics.std_fitness = sqrt(generation_displayed_data.statistics.std_fitness / this->generation_size);
    this->displayed_data.push_back(generation_displayed_data);
}

// Saves the generation's data in the Data folder
void Trainer::saveGeneration() const {
    json output_data;
    // Save seed
    output_data["seed"] = this->seed;
    if (this->stage < this->stages.size() - 1) {
        // If we are saving training generation
        output_data["generation"] = this->current_generation;
    } else {
        // If we are saving evaluation generation
        output_data["generation"] = -1;
    }
    // Save the stage
    output_data["stage"] = this->stage;
    // Save the display data
    json output_display_data;
    output_display_data["histogram_bars"] = this->displayed_data[this->current_generation - 1].histogram_bars;
    output_display_data["statistics"]["min_fitness"] = this->displayed_data[this->current_generation - 1].statistics.min_fitness;
    output_display_data["statistics"]["max_fitness"] = this->displayed_data[this->current_generation - 1].statistics.max_fitness;
    output_display_data["statistics"]["mean_fitness"] = this->displayed_data[this->current_generation - 1].statistics.mean_fitness;
    output_display_data["statistics"]["std_fitness"] = this->displayed_data[this->current_generation - 1].statistics.std_fitness;
    output_display_data["statistics"]["median_fitness"] = this->displayed_data[this->current_generation - 1].statistics.median_fitness;
    output_data["display_data"] = output_display_data;
    // Save all metric data
    for (int i = 0; i < this->generation_size; i++) {
        json output_agent;
        output_agent["c"] = this->data[i]->c;
        output_agent["metrics"] = this->data[i]->metrics;
        output_data["data"][i] = output_agent;
    }
    // State the file name and save by dumping JSON into folder to read later (through this application or through file viewer)
    string file_name = (this->stage == this->stages.size() - 1) ? "evaluation" : ("generation-" + to_string(this->current_generation));
    ofstream fout("./Data/save-" + to_string(this->save) + "/" + file_name + ".json");
    fout << output_data.dump(4) << endl;
    fout.close();
}

// Deletes the saved data for the file we specified
void Trainer::deleteSavedData() const {
    // Create the directory (if it doesn't exist)
    fs::create_directories("./Data/save-" + to_string(this->save));
    string directory_name = "./Data/save-" + to_string(this->save);
    // Delete all files that are in the directory (if this directory never existed, then we do nothing)
    for (const auto &file_entry : fs::directory_iterator(directory_name)) {
        fs::remove_all(file_entry.path());
    }
}
