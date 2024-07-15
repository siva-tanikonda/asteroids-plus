#include <fstream>
#include <signal.h>
#include "Shared/evaluation_manager.h"

enum Page { EVALUATION, TRAINING };
enum EvaluationStatus { IDLE, EVALUATING, COMPLETING };

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
        c[i] = config["test_config"]["c"][i];
    }
    return config;
}

void updateThreadPage(Page *page) {
    int bar_length = static_cast<int>(config["training_config"]["evaluator_count"]) * 40 - 10;
    Vector v(static_cast<int>(config["window_width"]) / 2 - bar_length / 2, 10);
    Vector mp = event_manager->getMousePosition();
    for (int i = 0; i < config["training_config"]["evaluator_count"]; i++) {
        if (mp.x >= v.x && mp.x <= v.x + 30 && mp.y >= v.y && mp.y <= v.y + 30 && event_manager->getClick()) {
            renderer->setOwner(i + 2);
        }
        v.x += 40;
    }
    if (mp.x >= 0 && mp.x <= 25 && mp.y >= static_cast<int>(config["window_height"]) / 2 - 100 && mp.y <= static_cast<int>(config["window_height"]) / 2 + 100 && event_manager->getClick()) {
        *page = TRAINING;
        renderer->setOwner(1);
    }
}

void renderThreadPage() {
    int bar_length = static_cast<int>(config["training_config"]["evaluator_count"]) * 40 - 10;
    Vector v(static_cast<int>(config["window_width"]) / 2 - bar_length / 2, 10);
    Vector mp = event_manager->getMousePosition();
    for (int i = 0; i < config["training_config"]["evaluator_count"]; i++) {
        double alpha = 0.3;
        if (mp.x >= v.x && mp.x <= v.x + 30 && mp.y >= v.y && mp.y <= v.y + 30) {
            alpha = 0.5;
        }
        if (renderer->getOwner() == i + 2) {
            renderer->requestText(TINY, "T-" + to_string(i + 1), v.x + 15, v.y + 13, MIDDLE, 125, 250, 125, 255 * alpha);
            renderer->requestRectangle(v.x, v.y, v.x + 30, v.y + 30, 125, 250, 125, 255 * alpha);
        } else {
            renderer->requestText(TINY, "T-" + to_string(i + 1), v.x + 15, v.y + 13, MIDDLE, 255, 255, 255, 255 * alpha);
            renderer->requestRectangle(v.x, v.y, v.x + 30, v.y + 30, 255, 255, 255, 255 * alpha);
        }
        v.x += 40;
    }
    Rect rect(0, static_cast<int>(config["window_height"]) / 2 - 100, 25, static_cast<int>(config["window_height"]) / 2 + 100);
    double alpha = 0.3;
    if (mp.x >= rect.left && mp.x <= rect.right && mp.y >= rect.top && mp.y <= rect.bottom) {
        alpha = 0.5;
    }
    renderer->requestLine(rect.left, rect.top, rect.right, rect.top, 255, 255, 255, 255 * alpha);
    renderer->requestLine(rect.right, rect.top, rect.right, rect.bottom, 255, 255, 255, 255 * alpha);
    renderer->requestLine(rect.right, rect.bottom, rect.left, rect.bottom, 255, 255, 255, 255 * alpha);
    renderer->requestLine(rect.left + 5, static_cast<int>(config["window_height"]) / 2 - 1, rect.left + 10, static_cast<int>(config["window_height"]) / 2 - 31, 255, 255, 255, 255 * alpha);
    renderer->requestLine(rect.left + 5, static_cast<int>(config["window_height"]) / 2, rect.left + 10, static_cast<int>(config["window_height"]) / 2 + 30, 255, 255, 255, 255 * alpha);
    renderer->requestLine(rect.left + 10, static_cast<int>(config["window_height"]) / 2 - 1, rect.left + 15, static_cast<int>(config["window_height"]) / 2 - 31, 255, 255, 255, 255 * alpha);
    renderer->requestLine(rect.left + 10, static_cast<int>(config["window_height"]) / 2, rect.left + 15, static_cast<int>(config["window_height"]) / 2 + 30, 255, 255, 255, 255 * alpha);
}

void updateTrainerPage(Page *page) {
    Vector mp = event_manager->getMousePosition();
    Rect rect(static_cast<int>(config["window_width"]) - 25, static_cast<int>(config["window_height"]) / 2 - 100, static_cast<int>(config["window_width"]), static_cast<int>(config["window_height"]) / 2 + 100);
    if (mp.x >= rect.left && mp.x <= rect.right && mp.y >= rect.top && mp.y <= rect.bottom && event_manager->getClick()) {
        *page = EVALUATION;
        renderer->setOwner(2);
    }
}

void renderTrainerPage() {
    Vector mp = event_manager->getMousePosition();
    Rect rect(static_cast<int>(config["window_width"]) - 25, static_cast<int>(config["window_height"]) / 2 - 100, static_cast<int>(config["window_width"]), static_cast<int>(config["window_height"]) / 2 + 100);
    double alpha = 0.3;
    if (mp.x >= rect.left && mp.x <= rect.right && mp.y >= rect.top && mp.y <= rect.bottom) {
        alpha = 0.5;
    }
    renderer->requestLine(rect.left, rect.top, rect.right, rect.top, 255, 255, 255, 255 * alpha);
    renderer->requestLine(rect.left, rect.top, rect.left, rect.bottom, 255, 255, 255, 255 * alpha);
    renderer->requestLine(rect.right, rect.bottom, rect.left, rect.bottom, 255, 255, 255, 255 * alpha);
    renderer->requestLine(rect.right - 5, static_cast<int>(config["window_height"]) / 2 - 1, rect.right - 10, static_cast<int>(config["window_height"]) / 2 - 31, 255, 255, 255, 255 * alpha);
    renderer->requestLine(rect.right - 5, static_cast<int>(config["window_height"]) / 2, rect.right - 10, static_cast<int>(config["window_height"]) / 2 + 30, 255, 255, 255, 255 * alpha);
    renderer->requestLine(rect.right - 10, static_cast<int>(config["window_height"]) / 2 - 1, rect.right - 15, static_cast<int>(config["window_height"]) / 2 - 31, 255, 255, 255, 255 * alpha);
    renderer->requestLine(rect.right - 10, static_cast<int>(config["window_height"]) / 2, rect.right - 15, static_cast<int>(config["window_height"]) / 2 + 30, 255, 255, 255, 255 * alpha);
}

void runManager(bool test = false) {
    Page page = TRAINING;
    renderer->setManager();
    event_manager->setManager();
    evaluation_manager->setManager();
    if (test) {
        evaluation_manager->sendRequest(c, config["test_config"]["seed"], 0);
    }
    while (true) {
        event_manager->update();
        if (event_manager->events->quit) {
            break;
        }
        bool rendering = renderer->beginProcessing();
        if (!test) {
            if (page == EVALUATION) {
                updateThreadPage(&page);
                if (rendering) {
                    renderThreadPage();
                }
            } else {
                updateTrainerPage(&page);
                if (rendering) {
                    renderTrainerPage();
                }
            }
        }
        if (rendering) {
            renderer->endProcessing();
        }
    }
    for (pid_t pid : pids) {
        kill(pid, SIGKILL);
    }
    delete renderer;
    delete event_manager;
    delete evaluation_manager;
}

void runEvaluator(bool testing = false, bool user_input = false) {
    double c[C_LENGTH], results[EVALUATION_METRICS];
    Game::analyzeGameConfiguration(config);
    Game *game = nullptr;
    AI *ai = nullptr;
    int game_precision = config["game_precision"];
    int id;
    double default_delay = config["default_delay"];
    double performance_frequency = SDL_GetPerformanceFrequency();
    double fps_reset_rate = 2e-2;
    unsigned long long old_timestamp = -1;
    double fps_cooldown = 0;
    double fps = 0;
    EvaluationStatus status = IDLE;
    while (true) {
        bool rendering = renderer->beginRequest(process_num);
        bool succeeded;
        pair<int, int> request;
        switch(status) {
            case IDLE:
                request = evaluation_manager->getRequest(c);
                if (rendering) {
                    renderer->requestText(REGULAR, "Waiting for Evaluation Request", Game::getWidth() / 2, Game::getHeight() / 2 - 5, MIDDLE, 255, 255, 255, 255);
                }
                if (request.first != -1) {
                    game = new Game(config, request.first);
                    if (!user_input) {
                        ai = new AI(c, game->getAIShipData(), rand());
                    }
                    id = request.second;
                    status = EVALUATING;
                }
                break;
            case EVALUATING:
                if (renderer->getOwner() == process_num) {
                    if (rendering) {
                        if (old_timestamp == -1) {
                            old_timestamp = SDL_GetPerformanceCounter();
                        }
                        unsigned long long timestamp = SDL_GetPerformanceCounter();
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
                        renderer->endRequest();
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
                if (game->isShipDead() && !testing) {
                    results[0] = game->getScore();
                    results[1] = game->getTime();
                    results[2] = ai->getFleeTime() / game->getTime();
                    results[3] = (double)ai->getMisses() / ai->getFires();
                    delete game;
                    if (ai != nullptr) {
                        delete ai;
                    }
                    game = nullptr;
                    ai = nullptr;
                    status = COMPLETING;
                }
                break;
            case COMPLETING:
                bool succeeded = evaluation_manager->sendResult(id, results);
                if (rendering) {
                    renderer->requestText(REGULAR, "Submitting Evaluation Result", Game::getWidth() / 2, Game::getHeight() / 2 - 5, MIDDLE, 255, 255, 255, 255);
                }
                if (succeeded) {
                    status = IDLE;
                }
                break;
        }
        if (rendering) {
            renderer->endRequest();
        }
    }
    if (game != nullptr) {
        delete game;
    }
    if (ai != nullptr) {
        delete ai;
    }
    delete renderer;
    delete event_manager;
    delete evaluation_manager;
}

void runTrainer() {
    while (true) {
        bool rendering = renderer->beginRequest(process_num);
        //TODO
        if (rendering) {
            renderer->endRequest();
        }
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
    renderer->setOwner(1);
    if (strcmp(args[1], "--train") == 0) {
        pid = fork();
        if (pid > 0) {
            bool evaluating = false;
            pids.push_back(pid);
            for (int i = 0; i < config["training_config"]["evaluator_count"]; i++) {
                pid = fork();
                if (pid > 0) {
                    pids.push_back(pid);
                } else {
                    evaluating = true;
                    process_num = i + 2;
                    runEvaluator();
                    break;
                }
            }
            if (!evaluating) {
                runManager();
            }
        } else {
            process_num = 1;
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
