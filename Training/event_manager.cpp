#include "event_manager.h"

bool EventManager::quit = false;
bool EventManager::left = false;
bool EventManager::right = false;
bool EventManager::forward = false;
bool EventManager::fire = false;

void EventManager::update() {
    SDL_Event evt;
    EventManager::quit = false;
    while (SDL_PollEvent(&evt)) {
        switch (evt.type) {
            case SDL_QUIT:
            EventManager::quit = true;
            break;
            case SDL_KEYDOWN:
            switch (evt.key.keysym.sym) {
                case SDLK_a:
                    EventManager::left = true;
                    break;
                case SDLK_d:
                    EventManager::right = true;
                    break;
                case SDLK_w:
                    EventManager::forward = true;
                    break;
                case SDLK_SPACE:
                    EventManager::fire = true;
                    break;
            }
            break;
            case SDL_KEYUP:
            switch (evt.key.keysym.sym) {
                case SDLK_a:
                    EventManager::left = false;
                    break;
                case SDLK_d:
                    EventManager::right = false;
                    break;
                case SDLK_w:
                    EventManager::forward = false;
                    break;
                case SDLK_SPACE:
                    EventManager::fire = false;
                    break;
            }
            break;
        }
    }
}

bool EventManager::getQuit() {
    return EventManager::quit;
}

bool EventManager::getLeft() {
    return EventManager::left;
}

bool EventManager::getRight() {
    return EventManager::right;
}

bool EventManager::getForward() {
    return EventManager::forward;
}

bool EventManager::getFire() {
    return EventManager::fire;
}