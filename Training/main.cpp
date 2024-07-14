#include <fstream>
#include <signal.h>
#include "Evaluator/evaluator.h"

Renderer *renderer;
EventManager *event_manager;
EvaluationManager *evaluation_manager;
double c[C_LENGTH];
json config;
vector<pid_t> pids;
int process_num;

json loadConfig() {
    ifstream config_file("config.json", ifstream::binary);
    json config = json::parse(config_file);
    config_file.close();
    for (int i = 0; i < C_LENGTH; i++) {
        c[i] = config["c"][i];
    }
    return config;
}

void runManager(bool test = false) {
    renderer->setManager();
    event_manager->setManager();
    evaluation_manager->setManager();
    if (test) {
        evaluation_manager->sendRequest(c, config["seed"], 0);
    }
    while (true) {
        event_manager->update();
        if (event_manager->events->quit) {
            break;
        }
        renderer->process();
    }
    for (pid_t pid : pids) {
        kill(pid, SIGKILL);
    }
    delete renderer;
    delete event_manager;
    delete evaluation_manager;
}

void runEvaluator(bool testing = false, bool user_input = false) {
    double c[C_LENGTH];
    Game::analyzeGameConfiguration(config);
    while (true) {
        double c[C_LENGTH];
        pair<int, int> extra_info = evaluation_manager->getRequest(c);
        int seed = extra_info.first;
        int id = extra_info.second;
        if (testing) {
            testRun(renderer, event_manager, config, process_num, c, seed, user_input);
        } else {
            double results[EVALUATION_METRICS];
            evaluate(renderer, event_manager, config, process_num, c, seed, results);
            evaluation_manager->sendResult(id, results);
        }
    }
    delete renderer;
    delete event_manager;
    delete evaluation_manager;
}

void runTrainer() {

    while (true) {
        //TODO
    }
    delete renderer;
    delete event_manager;
    delete evaluation_manager;
}

int main(int argv, char **args) {
    pid_t pid;
    config = loadConfig();
    renderer = new Renderer(config);
    event_manager = new EventManager();
    evaluation_manager = new EvaluationManager();
    if (strcmp(args[1], "--train") == 0) {
        pid = fork();
        if (pid > 0) {
            bool evaluating = false;
            pids.push_back(pid);
            for (int i = 0; i < config["evaluator_count"]; i++) {
                pid = fork();
                if (pid > 0) {
                    pids.push_back(pid);
                } else {
                    evaluating = true;
                    runEvaluator();
                    break;
                }
            }
            if (!evaluating) {
                runManager();
            }
        } else {
            runTrainer();
        }
    } else if (strcmp(args[1], "--play") == 0) {
        pid = fork();
        if (pid > 0) {
            pids.push_back(pid);
            runManager(true);
        } else {
            process_num = 1;
            runEvaluator(true, true);
        }
    } else if (strcmp(args[1], "--ai") == 0) {
        pid = fork();
        if (pid > 0) {
            pids.push_back(pid);
            runManager(true);
        } else {
            process_num = 1;
            runEvaluator(true);
        }
    }
    return 0;
}
