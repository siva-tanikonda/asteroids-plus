#include <SDL2/SDL.h>

class EventManager {
    public:
        static void update();
        static bool getQuit();
        static bool getLeft();
        static bool getRight();
        static bool getForward();
        static bool getFire();
    private:
        static bool quit, left, right, forward, fire;
};