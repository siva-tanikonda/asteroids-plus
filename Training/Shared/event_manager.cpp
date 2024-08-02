#include "event_manager.h"

EventManager::EventManager() : manager(false) {
    int events_fd = shm_open(EVENT_MANAGER_SHARED_MEMORY_NAME, O_CREAT | O_RDWR, 0666);
    ftruncate(events_fd, sizeof(EventManagerEvents));
    this->events = static_cast<EventManagerEvents*>(mmap(0, sizeof(EventManagerEvents), PROT_READ | PROT_WRITE, MAP_SHARED, events_fd, 0));
    close(events_fd);
}

EventManager::~EventManager() {
    munmap(this->events, sizeof(EventManagerEvents));
    if (this->manager) {
        shm_unlink(EVENT_MANAGER_SHARED_MEMORY_NAME);
    }
}

void EventManager::update() {
    if (!(this->manager)) {
        return;
    }
    SDL_Event evt;
    this->events->quit = false;
    this->events->click = false;
    while (SDL_PollEvent(&evt)) {
        switch (evt.type) {
            case SDL_QUIT:
                this->events->quit = true;
                break;
            case SDL_KEYDOWN:
                switch (evt.key.keysym.sym) {
                    case SDLK_a:
                        this->events->left = true;
                        break;
                    case SDLK_d:
                        this->events->right = true;
                        break;
                    case SDLK_w:
                        this->events->forward = true;
                        break;
                    case SDLK_SPACE:
                        this->events->fire = true;
                        break;
                }
                break;
            case SDL_KEYUP:
                switch (evt.key.keysym.sym) {
                    case SDLK_a:
                        this->events->left = false;
                        break;
                    case SDLK_d:
                        this->events->right = false;
                        break;
                    case SDLK_w:
                        this->events->forward = false;
                        break;
                    case SDLK_SPACE:
                        this->events->fire = false;
                        break;
                }
                break;
            case SDL_MOUSEBUTTONDOWN:
            switch (evt.button.button) {
                case SDL_BUTTON_LEFT:
                    this->events->click = true;
                    break;
            }
            break;
        }
    }
    SDL_GetMouseState(&(this->events->mouse_x), &(this->events->mouse_y));
}

void EventManager::applyEvents() {
    this->left = this->events->left;
    this->right = this->events->right;
    this->forward = this->events->forward;
    this->fire = this->events->fire;
}

Vector EventManager::getMousePosition() const {
    Vector v(this->events->mouse_x, this->events->mouse_y);
    return v;
}

bool EventManager::getClick() const {
    return this->events->click;
}

void EventManager::setManager() {
    this->manager = true;
}