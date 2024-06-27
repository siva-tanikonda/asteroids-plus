#include <iostream>
#include <fstream>
#include <json/json.h>
#include "game.h"
using namespace std;

SDL_Window* window;
SDL_Renderer* renderer;
Json::Value config;
Game *game;
int game_precision;
double fps;

void closeProgram() {
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    TTF_Quit();
    SDL_Quit();
}

void loadConfig() {
    std::ifstream config_file("config.json", std::ifstream::binary);
    config_file >> config;
    config_file.close();
}

void update(double delay) {
    for (int i = 0; i < game_precision; i++) {
        game->update(delay / game_precision, config);
    }
}

void draw() {
    SDL_SetRenderDrawColor(renderer, 20, 20, 20, 255);
    SDL_RenderClear(renderer);
    game->render(renderer, fps);
    SDL_RenderPresent(renderer);
}

int main(int argv, char** args) {
    loadConfig();
    window = SDL_CreateWindow("Asteroids+ Trainer", SDL_WINDOWPOS_UNDEFINED, SDL_WINDOWPOS_UNDEFINED, config["window_width"].asInt(), config["window_height"].asInt(), SDL_WINDOW_SHOWN);
    renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC);
    TTF_Init();
    Game::analyzeGameConfiguration(config);
    game = new Game(config, 0);
    game_precision = config["game_precision"].asInt();
    Uint64 timestamp = SDL_GetPerformanceCounter();
    Uint64 old_timestamp = 0;
    const double performance_frequency = SDL_GetPerformanceFrequency();
    const double fps_reset_rate = 2e-2;
    double fps_cooldown = 0;
    fps = 0;
    while (true) {
        old_timestamp = timestamp;
        timestamp = SDL_GetPerformanceCounter();
        const double seconds_passed = (timestamp - old_timestamp) / performance_frequency;
        if (fps_cooldown <= 0) {
            fps = 1 / seconds_passed;
            fps_cooldown = 1;
        }
        fps_cooldown = max(0.0, fps_cooldown - fps_reset_rate);
        EventManager::update();
        if (EventManager::getQuit()) {
            break;
        }
        update(seconds_passed * 60);
        draw();
    }
    delete game;
    closeProgram();
    return 0;
}