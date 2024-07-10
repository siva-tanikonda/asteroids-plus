#include "renderer.h"

Renderer::Renderer(const json &config, bool manager) : manager(manager) {
    if (manager) {
        SDL_Init(SDL_INIT_VIDEO);
        this->window = SDL_CreateWindow("Asteroids+ Trainer", SDL_WINDOWPOS_UNDEFINED, SDL_WINDOWPOS_UNDEFINED, config["window_width"], config["window_height"], SDL_WINDOW_SHOWN);
        this->renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_PRESENTVSYNC);
        SDL_SetRenderDrawBlendMode(renderer, SDL_BLENDMODE_BLEND);
        TTF_Init();
        this->font = TTF_OpenFont("font.ttf", 20);
        this->small_font = TTF_OpenFont("font.ttf", 15);
        this->tiny_font = TTF_OpenFont("font.ttf", 11);
        int queue_fd = shm_open(RENDERER_SHARED_MEMORY_NAME, O_CREAT | O_RDWR, 0666);
        ftruncate(queue_fd, sizeof(RenderQueue));
        this->queue = static_cast<RenderQueue*>(mmap(0, sizeof(RenderQueue), PROT_READ | PROT_WRITE, MAP_SHARED, queue_fd, 0));
        close(queue_fd);
        pthread_mutexattr_t mutex_attr;
        pthread_mutexattr_init(&mutex_attr);
        pthread_mutexattr_setpshared(&mutex_attr, PTHREAD_PROCESS_SHARED);
        pthread_mutex_init(&(this->queue->lock), &mutex_attr);
        pthread_mutexattr_destroy(&mutex_attr);
    } else {
        int queue_fd = shm_open(RENDERER_SHARED_MEMORY_NAME, O_CREAT | O_RDWR, 0666);
        ftruncate(queue_fd, sizeof(RenderQueue));
        this->queue = static_cast<RenderQueue*>(mmap(0, sizeof(RenderQueue), PROT_READ | PROT_WRITE, MAP_SHARED, queue_fd, 0));
        close(queue_fd);
    }
}

Renderer::~Renderer() {
    if (this->manager) {
        TTF_CloseFont(this->font);
        TTF_CloseFont(this->small_font);
        TTF_CloseFont(this->tiny_font);
        TTF_Quit();
        SDL_DestroyRenderer(this->renderer);
        SDL_DestroyWindow(this->window);
        SDL_Quit();
        pthread_mutex_destroy(&(this->queue->lock));
    }
    munmap(this->queue, sizeof(RenderQueue));
    if (this->manager) {
        shm_unlink(RENDERER_SHARED_MEMORY_NAME);
    }
}

void Renderer::process() {
    if (this->manager && !(this->queue->done_processing)) {
        pthread_mutex_lock(&(this->queue->lock));
        SDL_SetRenderDrawColor(this->renderer, 20, 20, 20, 255);
        SDL_RenderClear(renderer);
        for (int i = 0; i < this->queue->len; i++) {
            this->processRequest(&(this->queue->queue[i]));
        }
        SDL_RenderPresent(renderer);
        this->queue->len = 0;
        this->queue->done_processing = true;
        pthread_mutex_unlock(&(this->queue->lock));
    }
}

void Renderer::renderText(const RenderRequest *request) {
    TTF_Font *font;
    switch (request->font) {
        case REGULAR:
            font = this->font;
            break;
        case SMALL:
            font = this->small_font;
            break;
        case TINY:
            font = this->tiny_font;
            break;
    }
    SDL_Surface *surface = TTF_RenderText_Solid(font, request->text, { request->r, request->g, request->b, request->a });
    SDL_Texture *texture = SDL_CreateTextureFromSurface(this->renderer, surface);
    int text_width, text_height;
    SDL_QueryTexture(texture, NULL, NULL, &text_width, &text_height);
    SDL_FreeSurface(surface);
    SDL_Rect rect;
    switch(request->alignment) {
        case MIDDLE:
            rect = { request->x1 - text_width / 2, request->y1 - text_height / 2, text_width, text_height };
            break;
        case LEFT:
            rect = { request->x1, request->y1, text_width, text_height };
            break;
        case RIGHT:
            rect = { request->x1 - text_width, request->y1, text_width, text_height };
            break;
    }
    SDL_RenderCopy(renderer, texture, NULL, &rect);
    SDL_DestroyTexture(texture);
}

void Renderer::renderLine(const RenderRequest *request) {
    SDL_SetRenderDrawColor(this->renderer, request->r, request->g, request->b, request->a);
    SDL_RenderDrawLine(this->renderer, request->x1, request->y1, request->x2, request->y2);
}

void Renderer::renderFilledCircle(const RenderRequest *request) {
    SDL_SetRenderDrawColor(this->renderer, request->r, request->g, request->b, request->a);
    int top = ceil(request->y1 - request->radius);
    int bottom = floor(request->y1 + request->radius);
    for (int i = top; i <= bottom; i++) {
        double dy = i - request->y1;
        double diff = sqrt(request->radius * request->radius - dy * dy);
        SDL_RenderDrawLine(this->renderer, request->x1 - diff, i, request->x1 + diff, i);
    }
}

void Renderer::renderCircle(const RenderRequest *request) {
    SDL_SetRenderDrawColor(this->renderer, request->r, request->g, request->b, request->a);
    int x = request->radius - 1;
    int y = 0;
    int tx = 1;
    int ty = 1;
    int err = tx - request->radius * 2;
    while (x >= y) {
        SDL_RenderDrawPoint(renderer, request->x1 + x, request->y1 - y);
        SDL_RenderDrawPoint(renderer, request->x1 + x, request->y1 + y);
        SDL_RenderDrawPoint(renderer, request->x1 - x, request->y1 - y);
        SDL_RenderDrawPoint(renderer, request->x1 - x, request->y1 + y);
        SDL_RenderDrawPoint(renderer, request->x1 + y, request->y1 - x);
        SDL_RenderDrawPoint(renderer, request->x1 + y, request->y1 + x);
        SDL_RenderDrawPoint(renderer, request->x1 - y, request->y1 - x);
        SDL_RenderDrawPoint(renderer, request->x1 - y, request->y1 + x);
        if (err <= 0) {
            y++;
            err += ty;
            ty += 2;
        }
        if (err > 0) {
            x--;
            tx += 2;
            err += tx - request->radius * 2;
        }
    }
}

void Renderer::processRequest(const RenderRequest *request) {
    switch (request->type) {
        case TEXT:
            this->renderText(request);
            break;
        case FILLED_CIRCLE:
            this->renderFilledCircle(request);
            break;
        case CIRCLE:
            this->renderCircle(request);
            break;
        case LINE:
            this->renderLine(request);
            break;
    }
}

bool Renderer::beginRequest() {
    if (this->queue->done_processing) {
        pthread_mutex_lock(&(this->queue->lock));
    }
    return this->queue->done_processing;
}

void Renderer::completeRequest() {
    this->queue->done_processing = false;
    pthread_mutex_unlock(&(this->queue->lock));
}

void Renderer::requestText(FontType font, const string &text, int x, int y, TextAlignment alignment, Uint8 r, Uint8 g, Uint8 b, Uint8 a) {
    int i = this->queue->len++;
    this->queue->queue[i].type = TEXT;
    this->queue->queue[i].font = font;
    this->queue->queue[i].alignment = alignment;
    strcpy(this->queue->queue[i].text, text.c_str());
    this->queue->queue[i].x1 = x;
    this->queue->queue[i].y1 = y;
    this->queue->queue[i].r = r;
    this->queue->queue[i].g = g;
    this->queue->queue[i].b = b;
    this->queue->queue[i].a = a;
}

void Renderer::requestFilledCircle(int x1, int y1, int radius, Uint8 r, Uint8 g, Uint8 b, Uint8 a) {
    int i = this->queue->len++;
    this->queue->queue[i].type = FILLED_CIRCLE;
    this->queue->queue[i].x1 = x1;
    this->queue->queue[i].y1 = y1;
    this->queue->queue[i].radius = radius;
    this->queue->queue[i].r = r;
    this->queue->queue[i].g = g;
    this->queue->queue[i].b = b;
    this->queue->queue[i].a = a;
}

void Renderer::requestCircle(int x1, int y1, int radius, Uint8 r, Uint8 g, Uint8 b, Uint8 a) {
    int i = this->queue->len++;
    this->queue->queue[i].type = CIRCLE;
    this->queue->queue[i].x1 = x1;
    this->queue->queue[i].y1 = y1;
    this->queue->queue[i].radius = radius;
    this->queue->queue[i].r = r;
    this->queue->queue[i].g = g;
    this->queue->queue[i].b = b;
    this->queue->queue[i].a = a;
}

void Renderer::requestLine(int x1, int y1, int x2, int y2, Uint8 r, Uint8 g, Uint8 b, Uint8 a) {
    int i = this->queue->len++;
    this->queue->queue[i].type = LINE;
    this->queue->queue[i].x1 = x1;
    this->queue->queue[i].y1 = y1;
    this->queue->queue[i].x2 = x2;
    this->queue->queue[i].y2 = y2;
    this->queue->queue[i].r = r;
    this->queue->queue[i].g = g;
    this->queue->queue[i].b = b;
    this->queue->queue[i].a = a;
}
