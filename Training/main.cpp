#pragma once
#include <fstream>
#include "ai.h"
using namespace std;

double c[C_LENGTH];
SDL_Window* window;
SDL_Renderer* renderer;
Json::Value config;
Game *game;
AI *ai;
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
    ai->update(delay, config, game);
    ai->applyControls();
    for (int i = 0; i < game_precision; i++) {
        game->update(delay / game_precision, config);
    }
}

void draw() {
    SDL_SetRenderDrawColor(renderer, 20, 20, 20, 255);
    SDL_RenderClear(renderer);
    game->renderGame(renderer);
    ai->renderGame(renderer, game);
    game->renderOverlay(renderer, fps);
    ai->renderOverlay(renderer);
    SDL_RenderPresent(renderer);
}

void test() {
    loadConfig();
    for (int i = 0; i < C_LENGTH; i++) {
        c[i] = config["c"][i].asDouble();
    }
    window = SDL_CreateWindow("Asteroids+ Trainer", SDL_WINDOWPOS_UNDEFINED, SDL_WINDOWPOS_UNDEFINED, config["window_width"].asInt(), config["window_height"].asInt(), SDL_WINDOW_SHOWN);
    renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_PRESENTVSYNC);
    TTF_Init();
    Game::analyzeGameConfiguration(config);
    game = new Game(config, 0);
    ai = new AI(c, game->getAIShipData());
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
        if (EventManager::quit) {
            break;
        }
        update(seconds_passed * 60);
        draw();
    }
    delete ai;
    delete game;
    closeProgram();
}

int main(int argv, char** args) {
    if (strcmp(args[1], "--test") == 0) {
        test();
    } else if (strcmp(args[1], "--train") == 0) {
        cout << "Training not supported yet" << endl;
    }
    return 0;
}