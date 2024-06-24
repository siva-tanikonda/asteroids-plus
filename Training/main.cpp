#include <iostream>
#include <fstream>
#include <json/json.h>
#include "game.h"
using namespace std;

SDL_Window* window;
SDL_Renderer* renderer;
Json::Value config;

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

int main(int argv, char** args) {
    loadConfig();
    window = SDL_CreateWindow("Asteroids+ Trainer", SDL_WINDOWPOS_UNDEFINED, SDL_WINDOWPOS_UNDEFINED, config["window_width"].asInt(), config["window_height"].asInt(), SDL_WINDOW_SHOWN);
    renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC);
    TTF_Init();
    Game::analyzeGameConfiguration(config);
    Game game(config, 0);
    double game_precision = config["game_precision"].asInt();
    Uint64 timestamp = SDL_GetPerformanceCounter();
    Uint64 old_timestamp = 0;
    double seconds_passed = 0;
    double performance_frequency = SDL_GetPerformanceFrequency();
    const double fps_reset_rate = 2e-2;
    double fps_cooldown = 0;
    double fps = 0;
    while (true) {
        old_timestamp = timestamp;
        timestamp = SDL_GetPerformanceCounter();
        seconds_passed = (timestamp - old_timestamp) / performance_frequency;
        if (fps_cooldown <= 0) {
            fps = 1 / seconds_passed;
            fps_cooldown = 1;
        }
        fps_cooldown = max(0.0, fps_cooldown - fps_reset_rate);
        EventManager::update();
        if (EventManager::getQuit()) {
            break;
        }
        for (int i = 0; i < game_precision; i++) {
            game.update(seconds_passed * 60 / game_precision, config);
        }
        SDL_SetRenderDrawColor(renderer, 20, 20, 20, 255);
        SDL_RenderClear(renderer);
        game.render(renderer, fps);
        SDL_RenderPresent(renderer);
    }
    closeProgram();
    return 0;
}