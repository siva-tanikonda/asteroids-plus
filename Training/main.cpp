#include <fstream>
#include <signal.h>
#include "game.h"

using json = nlohmann::json;
using namespace std;

json config;
pid_t pid;

json loadConfig() {
    ifstream config_file("config.json", ifstream::binary);
    json config = json::parse(config_file);
    config_file.close();
    return config;
}

void runManager() {
    Renderer *renderer = new Renderer(config, true);
    EventManager *event_manager = new EventManager(true);
    while (true) {
        event_manager->update();
        if (event_manager->events->quit) {
            break;
        }
        renderer->process();
    }
    kill(pid, SIGTERM);
    delete renderer;
    delete event_manager;
}

void runPlay() {
    Game::analyzeGameConfiguration(config);
    Renderer *renderer = new Renderer(config, false);
    EventManager *event_manager = new EventManager(false);
    Game *game = new Game(config, rand());
    int game_precision = config["game_precision"];
    double performance_frequency = SDL_GetPerformanceFrequency();
    double fps_reset_rate = 2e-2;
    Uint64 timestamp = SDL_GetPerformanceCounter();
    Uint64 old_timestamp = 0;
    double fps_cooldown = 0;
    double fps = 0;
    while (true) {
        if (renderer->beginRequest()) {
            old_timestamp = timestamp;
            timestamp = SDL_GetPerformanceCounter();
            double seconds_passed = (timestamp - old_timestamp) / performance_frequency;
            if (fps_cooldown <= 0) {
                fps = 1 / seconds_passed;
                fps_cooldown = 1;
            }
            fps_cooldown = max(0.0, fps_cooldown - fps_reset_rate);
            double delay = seconds_passed * 60;
            for (int i = 0; i < game_precision; i++) {
                game->update(delay / game_precision, config, event_manager);
            }
            game->renderGame(renderer);
            game->renderOverlay(renderer, fps);
            renderer->completeRequest();
        }
    }
    delete renderer;
    delete event_manager;
    delete game;
}

int main(int argv, char **args) {
    config = loadConfig();
    pid = fork();
    if (pid > 0) {
        runManager();
    } else if (strcmp(args[1], "--play") == 0) {
        runPlay();
    }
    return 0;
}
