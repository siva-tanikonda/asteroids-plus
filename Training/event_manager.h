#include <SDL2/SDL.h>

class EventManager {
    public:
        static bool quit, left, right, forward, fire;
        static void update();
};