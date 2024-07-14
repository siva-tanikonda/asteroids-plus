#include "../Evaluator/ai.h"

constexpr const int MAX_EVALUATION_QUEUE_LENGTH = 100;
constexpr const int EVALUATION_METRICS = 4;
constexpr const char *EVALUATION_FLOW_SHARED_MEMORY_NAME = "/evaluation_flow_shared_memory";

struct EvaluationQueue {
    pthread_mutex_t lock;
    pthread_cond_t cond;
    int request_queue_len, results_queue_len;
    double request_queue[MAX_EVALUATION_QUEUE_LENGTH][C_LENGTH + 2], results_queue[MAX_EVALUATION_QUEUE_LENGTH][EVALUATION_METRICS + 1];
};

class EvaluationManager {
    public:
        EvaluationManager();
        ~EvaluationManager();
        void waitForUpdate();
        void sendRequest(double (&c)[C_LENGTH], int seed, int id);
        array<double, C_LENGTH + 2> getRequest();
        void setManager();
    private:
        bool manager;
        EvaluationQueue *queue;
};
