#include "event_manager.h"

EventManager::EventManager() : manager(false) {
    // Create the shared memory mapping/region (no lock because only manager writes to this memory region)
    int events_fd = shm_open(EVENT_MANAGER_SHARED_MEMORY_NAME, O_CREAT | O_RDWR, 0666);
    ftruncate(events_fd, sizeof(EventManagerEvents));
    this->events = static_cast<EventManagerEvents*>(mmap(0, sizeof(EventManagerEvents), PROT_READ | PROT_WRITE, MAP_SHARED, events_fd, 0));
    close(events_fd);
}

EventManager::~EventManager() {
    //Unmap the memory for the current process
    munmap(this->events, sizeof(EventManagerEvents));
    if (this->manager) {
        shm_unlink(EVENT_MANAGER_SHARED_MEMORY_NAME);
    }
}

// Manages any updates from user input
void EventManager::update() {
    //Only the manager can interact with SDL2 inputs
    if (!(this->manager)) {
        return;
    }
    // Just standard SDL2 polling of events (ex. exiting the window, pressing a key)
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

// Applies the user input to be the value of the inputs for current process (we only do this if a real person is playing)
void EventManager::applyEvents() {
    this->left = this->events->left;
    this->right = this->events->right;
    this->forward = this->events->forward;
    this->fire = this->events->fire;
}

// Gets the position of the mouse
Vector EventManager::getMousePosition() const {
    Vector v(this->events->mouse_x, this->events->mouse_y);
    return v;
}

// Returns if the left mouse button is being clicked
bool EventManager::getClick() const {
    return this->events->click;
}

// States that the current process is the manager process
void EventManager::setManager() {
    this->manager = true;
}
