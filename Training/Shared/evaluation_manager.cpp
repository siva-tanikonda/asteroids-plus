#include "evaluation_manager.h"

EvaluationManager::EvaluationManager() : manager(false) {
    int flow_fd = shm_open(EVALUATION_FLOW_SHARED_MEMORY_NAME, O_CREAT | O_RDWR, 0666);
    ftruncate(flow_fd, sizeof(EvaluationQueue));
    this->queue = static_cast<EvaluationQueue*>(mmap(0, sizeof(EvaluationQueue), PROT_READ | PROT_WRITE, MAP_SHARED, flow_fd, 0));
    close(flow_fd);
    pthread_mutexattr_t mutex_attr;
    pthread_mutexattr_init(&mutex_attr);
    pthread_mutexattr_setpshared(&mutex_attr, PTHREAD_PROCESS_SHARED);
    pthread_mutex_init(&(this->queue->lock), &mutex_attr);
    pthread_mutexattr_destroy(&mutex_attr);
    pthread_condattr_t cond_attr;
    pthread_condattr_init(&cond_attr);
    pthread_condattr_setpshared(&cond_attr, PTHREAD_PROCESS_SHARED);
    pthread_cond_init(&(this->queue->cond), &cond_attr);
    pthread_condattr_destroy(&cond_attr);
}

EvaluationManager::~EvaluationManager() {
    if (this->manager) {
        pthread_mutex_destroy(&(this->queue->lock));
        pthread_cond_destroy(&(this->queue->cond));
    }
    munmap(this->queue, sizeof(EvaluationQueue));
    if (this->manager) {
        shm_unlink(EVALUATION_FLOW_SHARED_MEMORY_NAME);
    }
}

void EvaluationManager::waitForUpdate() {
    pthread_mutex_lock(&(this->queue->lock));
    if (this->queue->request_queue_len == MAX_EVALUATION_QUEUE_LENGTH && this->queue->results_queue_len == 0) {
        pthread_cond_wait(&(this->queue->cond), &(this->queue->lock));
    }
    pthread_mutex_unlock(&(this->queue->lock));
}

void EvaluationManager::sendRequest(double (&c)[C_LENGTH], int seed, int id) {
    pthread_mutex_lock(&(this->queue->lock));
    int i = this->queue->request_queue_len;
    copy(c, c + C_LENGTH, this->queue->request_queue[i]);
    this->queue->request_queue[i][C_LENGTH] = seed;
    this->queue->request_queue[i][C_LENGTH + 1] = id;
    this->queue->request_queue_len++;
    pthread_mutex_unlock(&(this->queue->lock));
}

array<double, C_LENGTH + 2> EvaluationManager::getRequest() {
    while (true) {
        pthread_mutex_lock(&(this->queue->lock));
        if (this->queue->request_queue_len == 0) {
            pthread_mutex_unlock(&(this->queue->lock));
            continue;
        }
        int i = this->queue->request_queue_len - 1;
        array<double, C_LENGTH + 2> request;
        copy(this->queue->request_queue[i], this->queue->request_queue[i] + C_LENGTH, request.begin());
        request[C_LENGTH] = this->queue->request_queue[i][C_LENGTH];
        request[C_LENGTH + 1] = this->queue->request_queue[i][C_LENGTH + 1];
        this->queue->request_queue_len--;
        if (this->queue->request_queue_len == MAX_EVALUATION_QUEUE_LENGTH - 1) {
            pthread_cond_signal(&(this->queue->cond));
        }
        pthread_mutex_unlock(&(this->queue->lock));
        return request;
    }
}

void EvaluationManager::setManager() {
    this->manager = true;
}
