#include "../Shared/evaluation_manager.h"

void testRun(Renderer *renderer, EventManager *manager, const json &config, int process_num, double (&c)[C_LENGTH], int seed, bool user_input = false);

void evaluate(Renderer *renderer, EventManager *event_manager, const json &config, int process_num, double (&c)[C_LENGTH], int seed, double results[EVALUATION_METRICS]);