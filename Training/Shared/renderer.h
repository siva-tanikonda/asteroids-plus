#include <cstdint>
#include <fcntl.h>
#include <unistd.h>
#include <sys/mman.h>
#include <nlohmann/json.hpp>
#include <SDL2/SDL.h>
#include <SDL2/SDL_ttf.h>
#include "../math_helper.h"

using json = nlohmann::json;

struct RenderQueue;

constexpr const int MAX_QUEUE_LENGTH = 100000;
constexpr const int MAX_TEXT_LENGTH = 200;
constexpr const int MAX_POLYGON_VERTICES = 20;
constexpr const char *RENDERER_SHARED_MEMORY_NAME = "/renderer_shared_memory";

enum RenderType { TEXT, FILLED_CIRCLE, CIRCLE, LINE };
enum FontType { REGULAR, SMALL, TINY };
enum TextAlignment { LEFT, RIGHT, MIDDLE };

struct RenderRequest {
    RenderType type;
    FontType font;
    TextAlignment alignment;
    char text[MAX_TEXT_LENGTH + 1];
    int x1, y1, x2, y2, radius;
    uint8_t r, g, b, a;
};

struct RenderQueue {
    pthread_mutex_t lock;
    pthread_cond_t cond;
    bool done_processing;
    int len, owner;
    RenderRequest queue[MAX_QUEUE_LENGTH];
};

class Renderer {
    public:
        Renderer(const json &config);
        ~Renderer();
        void process();
        bool beginRequest();
        void completeRequest();
        void requestText(FontType font, const string &text, int x, int y, TextAlignment alignment, Uint8 r, Uint8 g, Uint8 b, Uint8 a);
        void requestFilledCircle(int x1, int y1, int radius, Uint8 r, Uint8 g, Uint8 b, Uint8 a);
        void requestCircle(int x1, int y1, int radius, Uint8 r, Uint8 g, Uint8 b, Uint8 a);
        void requestLine(int x1, int y1, int x2, int y2, Uint8 r, Uint8 g, Uint8 b, Uint8 a);
        bool isOwner(int process_num) const;
        void setManager();
    private:
        bool manager;
        SDL_Window *window;
        SDL_Renderer *renderer;
        TTF_Font *font, *small_font, *tiny_font;
        RenderQueue *queue;
        void renderText(const RenderRequest *request);
        void renderLine(const RenderRequest *request);
        void renderFilledCircle(const RenderRequest *request);
        void renderCircle(const RenderRequest *request);
        void processRequest(const RenderRequest *request);
};
