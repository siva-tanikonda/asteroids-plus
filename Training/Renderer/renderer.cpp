#include "renderer.h"

Renderer::Renderer(const Json::Value &config) {
    SDL_Init(SDL_INIT_VIDEO);
    this->window = SDL_CreateWindow("Asteroids+ Trainer", SDL_WINDOWPOS_UNDEFINED, SDL_WINDOWPOS_UNDEFINED, config["window_width"].asInt(), config["window_height"].asInt(), SDL_WINDOW_SHOWN);
    this->renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_PRESENTVSYNC);
    TTF_Init();
    this->font = TTF_OpenFont("font.ttf", 20);
    this->small_font = TTF_OpenFont("font.ttf", 15);
    this->tiny_font = TTF_OpenFont("font.ttf", 11);
    render_queue_fd = shm_open("/render_queue_memory", O_CREAT | O_RDWR, 0666);
}

Renderer::~Renderer() {
    TTF_CloseFont(this->font);
    TTF_CloseFont(this->small_font);
    TTF_CloseFont(this->tiny_font);
    TTF_Quit();
    SDL_DestroyRenderer(this->renderer);
    SDL_DestroyWindow(this->window);
    SDL_Quit();
}