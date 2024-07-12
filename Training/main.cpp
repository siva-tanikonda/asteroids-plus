#include <fstream>
#include <signal.h>
#include "evaluation.h"

Renderer *renderer;
EventManager *event_manager;
EvaluationFlowManager *evaluation_flow_manager;
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
    evaluation_flow_manager->setManager();
    if (test) {
        evaluation_flow_manager->requestEvaluation(c, config["seed"], 0);
    }
    while (true) {
        event_manager->update();
        if (event_manager->events->quit) {
            break;
        }
        renderer->process();
    }
    for (pid_t pid : pids) {
        kill(pid, SIGTERM);
    }
    delete renderer;
    delete event_manager;
    delete evaluation_flow_manager;
}

void testRun(double (&c)[C_LENGTH], int seed, Renderer *renderer, EventManager *event_manager, bool user_input = false) {
    Game *game = new Game(config, rand());
    AI *ai;
    if (!user_input) {
        ai = new AI(c, game->getAIShipData());
    }
    int game_precision = config["game_precision"];
    double default_delay = config["default_delay"];
    double performance_frequency = SDL_GetPerformanceFrequency();
    double fps_reset_rate = 2e-2;
    Uint64 old_timestamp = -1;
    double fps_cooldown = 0;
    double fps = 0;
    while (true) {
        if (renderer->isOwner(process_num)) {
            if (renderer->beginRequest()) {
                if (old_timestamp == -1) {
                    old_timestamp = SDL_GetPerformanceCounter();
                }
                Uint64 timestamp = SDL_GetPerformanceCounter();
                double seconds_passed = (timestamp - old_timestamp) / performance_frequency;
                old_timestamp = timestamp;
                if (fps_cooldown <= 0) {
                    fps = 1 / seconds_passed;
                    fps_cooldown = 1;
                }
                fps_cooldown = max(0.0, fps_cooldown - fps_reset_rate);
                double delay = seconds_passed * 60;
                if (user_input) {
                    event_manager->applyEvents();
                } else {
                    ai->update(delay, config, game);
                    ai->applyControls(event_manager);
                }
                for (int i = 0; i < game_precision; i++) {
                    game->update(delay / game_precision, config, event_manager);
                }
                game->renderGame(renderer);
                if (!user_input) {
                    ai->renderGame(renderer, game);
                }
                game->renderOverlay(renderer, fps);
                if (!user_input) {
                    ai->renderOverlay(renderer);
                }
                renderer->completeRequest();
            }
        } else {
            old_timestamp = -1;
            if (user_input) {
                event_manager->applyEvents();
            } else {
                ai->update(default_delay, config, game);
                ai->applyControls(event_manager);
            }
            for (int i = 0; i < game_precision; i++) {
                game->update(default_delay / game_precision, config, event_manager);
            }
        }
    }
    delete game;
    if (!user_input) {
        delete ai;
    }
}

void runEvaluator(bool testing = false, bool user_input = false) {
    double c[C_LENGTH];
    Game::analyzeGameConfiguration(config);
    while (true) {
        array<double, C_LENGTH + 2> request = evaluation_flow_manager->fulfillEvaluation();
        for (int i = 0; i < C_LENGTH; i++) {
            c[i] = request[i];
        }
        int seed = request[C_LENGTH];
        int id = request[C_LENGTH + 1];
        if (testing) {
            testRun(c, seed, renderer, event_manager, user_input);
        } else {
            //TODO
        }
    }
    delete renderer;
    delete event_manager;
    delete evaluation_flow_manager;
}

int main(int argv, char **args) {
    pid_t pid;
    config = loadConfig();
    renderer = new Renderer(config);
    event_manager = new EventManager();
    evaluation_flow_manager = new EvaluationFlowManager();
    if (strcmp(args[1], "--train") == 0) {
        //TODO
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
