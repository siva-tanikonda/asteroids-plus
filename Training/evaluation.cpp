#include "evaluation.h"

EvaluationFlowManager::EvaluationFlowManager() : manager(false) {
    int flow_fd = shm_open(EVALUATION_FLOW_SHARED_MEMORY_NAME, O_CREAT | O_RDWR, 0666);
    ftruncate(flow_fd, sizeof(EvaluationFlow));
    this->flow = static_cast<EvaluationFlow*>(mmap(0, sizeof(EvaluationFlow), PROT_READ | PROT_WRITE, MAP_SHARED, flow_fd, 0));
    close(flow_fd);
    pthread_mutexattr_t mutex_attr;
    pthread_mutexattr_init(&mutex_attr);
    pthread_mutexattr_setpshared(&mutex_attr, PTHREAD_PROCESS_SHARED);
    pthread_mutex_init(&(this->flow->lock), &mutex_attr);
    pthread_mutexattr_destroy(&mutex_attr);
    pthread_condattr_t cond_attr;
    pthread_condattr_init(&cond_attr);
    pthread_condattr_setpshared(&cond_attr, PTHREAD_PROCESS_SHARED);
    pthread_cond_init(&(this->flow->cond), &cond_attr);
    pthread_condattr_destroy(&cond_attr);
}

EvaluationFlowManager::~EvaluationFlowManager() {
    if (this->manager) {
        pthread_mutex_destroy(&(this->flow->lock));
        pthread_cond_destroy(&(this->flow->cond));
    }
    munmap(this->flow, sizeof(EvaluationFlow));
    if (this->manager) {
        shm_unlink(EVALUATION_FLOW_SHARED_MEMORY_NAME);
    }
}

void EvaluationFlowManager::waitForUpdate() {
    pthread_mutex_lock(&(this->flow->lock));
    if (this->flow->queue_len == 0) {
        pthread_cond_wait(&(this->flow->cond), &(this->flow->lock));
    }
    pthread_mutex_unlock(&(this->flow->lock));
}

void EvaluationFlowManager::requestEvaluation(double (&c)[C_LENGTH], int seed, int id) {
    pthread_mutex_lock(&(this->flow->lock));
    int i = this->flow->queue_len;
    copy(c, c + C_LENGTH, this->flow->queue[i]);
    this->flow->queue[i][C_LENGTH] = seed;
    this->flow->queue[i][C_LENGTH + 1] = id;
    this->flow->queue_len++;
    pthread_mutex_unlock(&(this->flow->lock));
}

array<double, C_LENGTH + 2> EvaluationFlowManager::fulfillEvaluation() {
    while (true) {
        pthread_mutex_lock(&(this->flow->lock));
        if (this->flow->queue_len == 0) {
            pthread_mutex_unlock(&(this->flow->lock));
            continue;
        }
        int i = this->flow->queue_len - 1;
        array<double, C_LENGTH + 2> request;
        copy(this->flow->queue[i], this->flow->queue[i] + C_LENGTH, request.begin());
        request[C_LENGTH] = this->flow->queue[i][C_LENGTH];
        request[C_LENGTH + 1] = this->flow->queue[i][C_LENGTH + 1];
        this->flow->queue_len--;
        if (this->flow->queue_len == MAX_EVALUATION_QUEUE_LENGTH - 1) {
            pthread_cond_signal(&(this->flow->cond));
        }
        return request;
    }
}

void EvaluationFlowManager::setManager() {
    this->manager = true;
}
