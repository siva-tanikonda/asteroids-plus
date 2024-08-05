#include <signal.h>
#include "trainer.h"

enum Page { EVALUATION, TRAINING };
enum EvaluationStatus { IDLE, EVALUATING, COMPLETING };

Renderer *renderer;
EventManager *event_manager;
EvaluationManager *evaluation_manager;
double c[C_LENGTH];
json config;
vector<pid_t> pids;
int process_num;

// Loads config.json to get the configuration for the testing environment, hyperparameters for training, number of evaluation threads, etc.
json loadConfig() {
    ifstream config_file("config.json", ifstream::binary);
    json config = json::parse(config_file);
    config_file.close();
    // For testing a particular C, we have to copy the array
    for (int i = 0; i < C_LENGTH; i++) {
        c[i] = config["test_config"]["c"][i];
    }
    return config;
}

// Processes the buttons to switch between what process owns the renderer
void updateEvaluationPage(Page *page) {
    // Processes the switching between evaluation threads/processes
    int bar_length = static_cast<int>(config["training_config"]["evaluator_count"]) * 40 - 10;
    Vector v(static_cast<int>(config["window_width"]) / 2 - bar_length / 2, 10);
    Vector mp = event_manager->getMousePosition();
    for (int i = 0; i < config["training_config"]["evaluator_count"]; i++) {
        if (mp.x >= v.x && mp.x <= v.x + 30 && mp.y >= v.y && mp.y <= v.y + 30 && event_manager->getClick()) {
            renderer->setOwner(i + 2);
        }
        v.x += 40;
    }
    // Processes the switching between evaluation view and trainer view
    if (mp.x >= 0 && mp.x <= 25 && mp.y >= static_cast<int>(config["window_height"]) / 2 - 100 && mp.y <= static_cast<int>(config["window_height"]) / 2 + 100 && event_manager->getClick()) {
        *page = TRAINING;
        renderer->setOwner(1);
    }
}

// Renders the evaluation page's thread switching button (switch between evaluators and to the trainer)
void renderEvaluationPage() {
    // Render the system to choose the evaluator process
    int bar_length = static_cast<int>(config["training_config"]["evaluator_count"]) * 40 - 10;
    Vector v(static_cast<int>(config["window_width"]) / 2 - bar_length / 2, 10);
    Vector mp = event_manager->getMousePosition();
    for (int i = 0; i < config["training_config"]["evaluator_count"]; i++) {
        double alpha = 0.3;
        if (mp.x >= v.x && mp.x <= v.x + 30 && mp.y >= v.y && mp.y <= v.y + 30) {
            renderer->setCursor(POINTER);
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
    // Render the button to switch between evaluation and training views
    Rect rect(0, static_cast<int>(config["window_height"]) / 2 - 100, 25, static_cast<int>(config["window_height"]) / 2 + 100);
    double alpha = 0.3;
    if (mp.x >= rect.left && mp.x <= rect.right && mp.y >= rect.top && mp.y <= rect.bottom) {
        renderer->setCursor(POINTER);
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

// Updates the trainer page (only processes the button to the right to switch to the evaluation page)
void updateTrainerPage(Page *page) {
    Vector mp = event_manager->getMousePosition();
    Rect rect(static_cast<int>(config["window_width"]) - 25, static_cast<int>(config["window_height"]) / 2 - 100, static_cast<int>(config["window_width"]), static_cast<int>(config["window_height"]) / 2 + 100);
    if (mp.x >= rect.left && mp.x <= rect.right && mp.y >= rect.top && mp.y <= rect.bottom && event_manager->getClick()) {
        *page = EVALUATION;
        renderer->setOwner(2);
    }
}

// Renders the trainer page's button to switch to the evaluation page
void renderTrainerPage() {
    Vector mp = event_manager->getMousePosition();
    Rect rect(static_cast<int>(config["window_width"]) - 25, static_cast<int>(config["window_height"]) / 2 - 100, static_cast<int>(config["window_width"]), static_cast<int>(config["window_height"]) / 2 + 100);
    double alpha = 0.3;
    if (mp.x >= rect.left && mp.x <= rect.right && mp.y >= rect.top && mp.y <= rect.bottom) {
        renderer->setCursor(POINTER);
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

//Runs the manager thread
void runManager(bool testing = false) {
    Page page = TRAINING;
    renderer->setManager();
    event_manager->setManager();
    evaluation_manager->setManager();
    // If we are running a test (or playing the game), then send an evaluation request
    if (testing) {
        evaluation_manager->sendRequest(c, config["test_config"]["seed"], 0);
    }
    while (true) {
        // Process user inputs
        event_manager->update();
        if (event_manager->events->quit) {
            // We exited the application through the window "X" button
            break;
        }
        // Update the thread-switching buttons and send rendering requests
        bool rendering = renderer->beginProcessing();
        if (!testing) {
            if (page == EVALUATION) {
                updateEvaluationPage(&page);
                if (rendering) {
                    renderEvaluationPage();
                }
            } else {
                updateTrainerPage(&page);
                if (rendering) {
                    renderTrainerPage();
                }
            }
        }
        if (rendering) {
            renderer->endProcessing(20, 20, 20, 255); // Use SDL2 to render all requests
        }
    }
    // Clean-up by killing all other threads and freeing dynamically-allocated memory
    for (pid_t pid : pids) {
        kill(pid, SIGKILL);
    }
    delete renderer;
    delete event_manager;
    delete evaluation_manager;
}

// Runs an evaluation thread/process
void runEvaluator(bool testing = false, bool user_input = false) {
    double c[C_LENGTH], results[EVALUATION_METRICS];
    Game::analyzeGameConfiguration(config); // Do pre-processing of the game configuration
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
    EvaluationStatus status = IDLE; // Tells us if we are waiting for an evaluation, running an evaluation, or waiting to send an evaluation to the trainer
    while (true) {
        bool rendering = renderer->beginRequest(process_num);
        bool succeeded;
        pair<int, int> request;
        switch(status) {
            case IDLE:
                // Try to receive a new evaluation request
                request = evaluation_manager->getRequest(c);
                if (rendering) {
                    renderer->requestText(REGULAR, "Waiting for Evaluation Request", Game::getWidth() / 2, Game::getHeight() / 2 - 5, MIDDLE, 255, 255, 255, 255);
                }
                if (request.first != -1) {
                    // If we found a request, then set-up the game and AI with the evaluation parameters
                    game = new Game(config, request.first);
                    if (!user_input) {
                        ai = new AI(c, game->getAIShipData(), 0);
                    }
                    id = request.second;
                    status = EVALUATING;
                }
                break;
            case EVALUATING:
                if (renderer->getOwner() == process_num || rendering) {
                    if (rendering) {
                        // If the user is currently looking at this thread in the UI
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
                        // If we are evaluating, we want to only use the default delay (makes the game look faster with higher HZ screens), in order to ensure that training outcomes are deterministic
                        double delay = testing ? seconds_passed * 60 : default_delay;
                        if (user_input) {
                            // If the user is playing, then apply events from SDL to local inputs (keyboard)
                            event_manager->applyEvents();
                        } else {
                            // If the AI is playing, then apply events from the AI's output 
                            ai->update(delay, config, game);
                            ai->applyControls(event_manager);
                        }
                        // Render the game at the specified precision (precision is there to ensure collisions are registered quickly in the game)
                        for (int i = 0; i < game_precision; i++) {
                            game->update(delay / game_precision, config, event_manager);
                        }
                        // Render the game and all debug visuals (including for the AI)
                        game->renderGame(renderer);
                        if (!user_input) {
                            ai->renderGame(renderer, game);
                        }
                        game->renderOverlay(renderer, fps);
                        if (!user_input) {
                            ai->renderOverlay(renderer);
                        }
                        // Tell the renderer that the request is complete
                        renderer->endRequest();
                    }
                } else {
                    // If the user is not looking at this process in the training UI, then we can just run the training at max speed without rendering
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
                    // If the ship is dead and we aren't simply testing the AI or playing the game
                    results[0] = game->getScore();
                    results[1] = game->getTime();
                    results[2] = ai->getFleeTime();
                    results[3] = ai->getMisses();
                    // Clean-up the AI and game
                    if (ai != nullptr) {
                        delete ai;
                    }
                    delete game;
                    status = COMPLETING;
                }
                break;
            case COMPLETING:
                // Attempt to send the result to the trainer (if sending fails, then we just try again repeatedly)
                bool succeeded = evaluation_manager->sendResult(id, results);
                if (rendering) {
                    renderer->requestText(REGULAR, "Submitting Evaluation Result", Game::getWidth() / 2, Game::getHeight() / 2 - 5, MIDDLE, 255, 255, 255, 255);
                }
                if (succeeded) {
                    status = IDLE;
                }
                break;
        }
        // If we are rendering, state that the rendering request is complete
        if (rendering) {
            renderer->endRequest();
        }
    }
    // Clean-up the game and AI if the thread is somehow done
    if (game != nullptr) {
        delete game;
    }
    if (ai != nullptr) {
        delete ai;
    }
    // Clean-up the thread data if the thread is somehow done
    delete renderer;
    delete event_manager;
    delete evaluation_manager;
}

// Runs the trainer process
void runTrainer() {
    // Do pre-processing of the game configuration
    Game::analyzeGameConfiguration(config);
    // Create the trainer
    Trainer *trainer = new Trainer(config);
    while (true) {
        // Standard animation + update loop
        bool rendering = renderer->beginRequest(process_num);
        trainer->update(rendering, evaluation_manager, event_manager);
        if (rendering) {
            trainer->render(renderer, event_manager);
            renderer->endRequest();
        }
    }
    // If for some reason, the trainer is done, we clear all resources of this thread
    delete trainer;
    delete renderer;
    delete event_manager;
    delete evaluation_manager;
}

int main(int argv, char **args) {
    pid_t pid;
    config = loadConfig();
    // Create the shared-memory management classes
    renderer = new Renderer(config);
    event_manager = new EventManager();
    evaluation_manager = new EvaluationManager();
    // State that either the trainer (for training) or first evaluation process (testing) are the owners of the renderer
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
                    // This is an evaluation process
                    evaluating = true;
                    process_num = i + 2;
                    runEvaluator();
                    break;
                }
            }
            if (!evaluating) {
                // This is the manager process
                process_num = 0;
                runManager();
            }
        } else {
            // This is the trainer process
            process_num = 1;
            runTrainer();
        }
    } else if (strcmp(args[1], "--play") == 0) {
        pid = fork();
        if (pid > 0) {
            // This is the manager process
            pids.push_back(pid);
            runManager(true);
        } else {
            // This is the tester process (with the user playing)
            process_num = 1;
            runEvaluator(true, true);
        }
    } else if (strcmp(args[1], "--ai") == 0) {
        pid = fork();
        if (pid > 0) {
            // This is the manager process
            pids.push_back(pid);
            runManager(true);
        } else {
            // This is the tester process (with the AI)
            process_num = 1;
            runEvaluator(true);
        }
    }
    return 0;
}
