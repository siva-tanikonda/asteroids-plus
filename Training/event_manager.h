#include <fcntl.h>
#include <unistd.h>
#include <sys/mman.h>
#include <SDL2/SDL.h>

constexpr const char *EVENT_MANAGER_SHARED_MEMORY_NAME = "/event_manager_shared_memory";

struct EventManagerEvents {
    bool left, right, forward, fire, quit;
};

class EventManager {
    public:
        bool manager, left, right, forward, fire;
        EventManagerEvents *events;
        EventManager(bool manager);
        ~EventManager();
        void update();
        void applyEvents();
};
