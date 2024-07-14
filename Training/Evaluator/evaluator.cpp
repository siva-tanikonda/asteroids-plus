#include "evaluator.h"

void testRun(Renderer *renderer, EventManager *event_manager, const json &config, int process_num, double (&c)[C_LENGTH], int seed, bool user_input) {
    Game *game = new Game(config, seed);
    AI *ai;
    if (!user_input) {
        ai = new AI(c, game->getAIShipData(), rand());
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
        }
    }
    delete game;
    if (!user_input) {
        delete ai;
    }
}

void evaluate(Renderer *renderer, EventManager *event_manager, const json &config, int process_num, double (&c)[C_LENGTH], int seed, double results[EVALUATION_METRICS]) {
    Game *game = new Game(config, seed);
    AI *ai = new AI(c, game->getAIShipData(), rand());
    int game_precision = config["game_precision"];
    double default_delay = config["default_delay"];
    double performance_frequency = SDL_GetPerformanceFrequency();
    double fps_reset_rate = 2e-2;
    Uint64 old_timestamp = -1;
    double fps_cooldown = 0;
    double fps = 0;
    while (!(game->isShipDead())) {
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
                ai->update(delay, config, game);
                ai->applyControls(event_manager);
                for (int i = 0; i < game_precision; i++) {
                    game->update(delay / game_precision, config, event_manager);
                }
                game->renderGame(renderer);
                ai->renderGame(renderer, game);
                game->renderOverlay(renderer, fps);
                ai->renderOverlay(renderer);
                renderer->completeRequest();
            }
        } else {
            old_timestamp = -1;
            ai->update(default_delay, config, game);
            ai->applyControls(event_manager);
            for (int i = 0; i < game_precision; i++) {
                game->update(default_delay / game_precision, config, event_manager);
            }
        }
    }
    results[0] = game->getScore();
    results[1] = game->getTime();
    results[2] = ai->getFleeTime() / game->getTime();
    results[3] = (double)ai->getMisses() / ai->getFires();
    delete game;
    delete ai;
}
