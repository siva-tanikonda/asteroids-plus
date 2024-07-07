#include <json/json.h>
#include <SDL2/SDL.h>
#include <SDL2/SDL_ttf.h>
#include <SDL2/SDL2_gfxPrimitives.h>
#include <sys/mman.h>
#include "renderer_helper.h"

class Renderer {
    public:
        Renderer(const Json::Value &config);
        ~Renderer();
    private:
        SDL_Window *window;
        SDL_Renderer *renderer;
        TTF_Font *font, *small_font, *tiny_font;
        int render_queue_fd;
};
