#include "Shared/evaluation_manager.h"

constexpr const int HISTOGRAM_BARS = 10;
enum TRAINER_STATISTIC_DISPLAY { MEAN, STD };

struct TrainerGenerationData;

double calculateTrainerGenerationDataFitness(const TrainerGenerationData *data);

bool compareTrainerGenerationDataPointers(const TrainerGenerationData *data1, const TrainerGenerationData *data2);

struct TrainerGenerationStatistics {
    double min_fitness, max_fitness, mean_fitness, std_fitness, median_fitness;
};

struct TrainerStage {
    int seed, seed_count, trial_count, generations_count, carry_over_count, combination_count, memory;
    double mutation_rate, reroll_mutation_rate, mutation_weight, softmax_weight, fitness_weights[EVALUATION_METRICS];
    pair<double, double> weight_ranges[C_LENGTH];
};

struct TrainerGenerationDisplayedData {
    int histogram_bars[HISTOGRAM_BARS];
    TrainerGenerationStatistics statistics;
};

struct TrainerGenerationData {
    double c[C_LENGTH];
    vector<double> metrics, new_metrics;
    int seeds_remaining;
};

class Trainer {
    public:
        Trainer(const json &config);
        ~Trainer();
        void update(bool rendering, EvaluationManager *evaluation_manager, EventManager *event_manager);
        void render(Renderer *renderer, EventManager *event_manager) const;
    private:
        int generation_size, current_generation, viewing_generation, stage, evaluation_progress, evaluation_index, seed;
        vector<TrainerStage> stages;
        vector<TrainerGenerationDisplayedData> displayed_data;
        vector<TrainerGenerationData*> data;
        bool old_click, done;
        void renderProgressionGraph(Renderer *renderer, int x, int y, int width, int height, string x_axis, string y_axis, TRAINER_STATISTIC_DISPLAY statistic) const;
        void renderHistogram(Renderer *renderer, double x, double y, double width, double height) const;
        void createNewGeneration();
        void createFirstGeneration(bool random_starting_weights);
        void processStages(const json &stage_configs, const json &evaluation_config);
        bool progressGeneration();
        void performGenerationPostProcessing();
        void addDisplayedData();
        void prepareEvaluation();
};