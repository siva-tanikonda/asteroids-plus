#include "ai.h"

constexpr const int MAX_EVALUATION_QUEUE_LENGTH = 100;
constexpr const int EVALUATION_METRICS = 4;
constexpr const char *EVALUATION_FLOW_SHARED_MEMORY_NAME = "/evaluation_flow_shared_memory";

struct EvaluationFlow {
    pthread_mutex_t lock;
    pthread_cond_t cond;
    int queue_len;
    double queue[MAX_EVALUATION_QUEUE_LENGTH][C_LENGTH + 2];
};

class EvaluationFlowManager {
    public:
        EvaluationFlowManager(bool manager);
        ~EvaluationFlowManager();
        void waitForUpdate();
        void requestEvaluation(double (&c)[C_LENGTH], int seed, int id);
        array<double, C_LENGTH + 2> fulfillEvaluation();
    private:
        bool manager;
        EvaluationFlow *flow;
};
