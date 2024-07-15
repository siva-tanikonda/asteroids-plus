#include <fcntl.h>
#include <unistd.h>
#include <sys/mman.h>
#include <SDL2/SDL.h>
#include "../math_helper.h"

constexpr const char *EVENT_MANAGER_SHARED_MEMORY_NAME = "/event_manager_shared_memory";

struct EventManagerEvents {
    bool left, right, forward, fire, quit, click;
    int mouse_x, mouse_y;
};

class EventManager {
    public:
        bool manager, left, right, forward, fire;
        EventManagerEvents *events;
        EventManager();
        ~EventManager();
        void update();
        void applyEvents();
        Vector getMousePosition() const;
        bool getClick() const;
        void setManager();
};
