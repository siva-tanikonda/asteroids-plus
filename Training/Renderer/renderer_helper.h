#include <cstdint>
#include <mutex>

const int QUEUE_LENGTH = 1000;
const int MAX_TEXT_LENGTH = 500;

enum RenderType { TEXT, FILLED_POLYGON, ARROW, FILLED_CIRCLE, CIRCLE, LINE };
enum FontType { REGULAR, SMALL, TINY };

struct RenderRequest {
    RenderType type;
    FontType font;
    char text[MAX_TEXT_LENGTH + 1];
    uint16_t ux, uy, vx, vy, radius;
    uint8_t r, g, b, a;
};

struct RenderQueue {
    std::mutex lock;
    bool done;
    int count;
    RenderRequest queue[QUEUE_LENGTH];
};
