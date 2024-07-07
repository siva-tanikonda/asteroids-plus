#include <algorithm>
#include <iostream>
#include <json/json.h>
#include <SDL2/SDL_ttf.h>
#include <SDL2/SDL2_gfxPrimitives.h>
#include "math.h"
#include "event_manager.h"

class Bullet;
class Asteroid;
class Saucer;
class Ship;
class Game;

enum TextRenderType { TEXT_CENTERED, TEXT_LEFT, TEXT_RIGHT };

template <class T> void renderWrap(SDL_Renderer *renderer, const Vector &position, double radius, const T *object, void (T::*func)(SDL_Renderer*, Vector) const, bool offset_x = true, bool offset_y = true);

void renderFilledPolygon(SDL_Renderer *renderer, Polygon shape, const Vector &offset, Uint8 r, Uint8 g, Uint8 b, Uint8 a);

void renderArrow(SDL_Renderer *renderer, const Vector &u, const Vector &v, Uint8 r, Uint8 g, Uint8 b, Uint8 a);

void renderText(SDL_Renderer *renderer, TTF_Font *font, const string &text, int x, int y, TextRenderType type, Uint8 r, Uint8 g, Uint8 b, Uint8 a);

string trimDouble(double num);

struct AIShipData {
    Vector position, velocity;
    double width, acceleration, bullet_cooldown, bullet_speed, bullet_life, drag_coefficient, angle, rotation_speed;
    int lives;
};

struct AIDangerData {
    Vector position, velocity;
    int size, id;
    double invincibility;
};

class Bullet {
    public:
        Vector position, velocity;
        double life, radius;
        bool dead;
        Bullet(const Json::Value &config, Vector position, Vector velocity, double life);
        void update(double delay);
        void render(SDL_Renderer *renderer) const;
        bool checkAsteroidCollision(const Json::Value &config, vector<Asteroid*> *split_asteroids, int wave, Asteroid *asteroid, mt19937 &gen);
        bool checkSaucerCollision(Saucer *saucer);
    private:
        void renderBullet(SDL_Renderer *renderer, Vector offset) const;
};

class ObjectWithId {
    public:
        int id;
        ObjectWithId();
};

class ObjectId {
    public:
        static const int MAX_ID;
        int id;
        ObjectId();
        int get(ObjectWithId *obj);
};

class Asteroid : public ObjectWithId {
    public:
        Vector position, velocity;
        double invincibility, angle, rotation_speed;
        int size;
        bool dead;
        Polygon bounds;
        static void analyzeAsteroidConfigurations(Json::Value &config);
        Asteroid(const Json::Value &config, Vector position, int size, int wave, mt19937 &gen);
        void update(double delay);
        void render(SDL_Renderer *renderer) const;
        void destroy(const Json::Value &config, vector<Asteroid*> *split_asteroids, int wave, mt19937 &gen);
    private:
        static double generateAsteroidSpeed(int wave);
        void rotate(double delay);
        void move(double delay);
        void renderAsteroid(SDL_Renderer *renderer, Vector offset) const;
};

class Saucer : public ObjectWithId {
    public:
        Vector position, velocity;
        Polygon bounds;
        int size, vertical_movement;
        double direction_change_rate, direction_change_cooldown, bullet_life, fire_rate, bullet_cooldown, bullet_speed;
        bool entered_x, entered_y, dead;
        static void analyzeSaucerConfigurations(Json::Value &config);
        Saucer(const Json::Value &config, int size, int wave, mt19937 &gen);
        void update(double delay, const Json::Value &config, const Ship &ship, vector<Bullet*> *saucer_bullets, mt19937 &gen);
        void render(SDL_Renderer *renderer) const;
    private:
        static double generateSaucerSpeed(int wave);
        static double generateDirectionChangeRate(int wave);
        static double generateFireRate(int wave);
        static double generateBulletSpeed(int wave);
        Vector bestFireDirection(const Ship &ship) const;
        void fire(double delay, const Json::Value &config, const Ship &ship, vector<Bullet*> *saucer_bullets);
        void move(double delay, mt19937 &gen);
        void renderSaucer(SDL_Renderer *renderer, Vector offset) const;
};

class Ship {
    public:
        Vector position, velocity;
        Polygon bounds;
        double width, height, rear_offset, angle, rotation_speed, acceleration, drag_coefficient, bullet_cooldown, fire_rate, bullet_speed, bullet_life, invincibility, invincibility_time, invincibility_flash, invincibility_flash_rate, thruster_status, thruster_flash_rate, trail_length;
        int lives;
        bool dead, accelerating;
        Ship(const Json::Value &config);
        void update(double delay, const Json::Value &config, vector<Bullet*> *ship_bullets);
        void renderShip(SDL_Renderer *renderer, Vector offset) const;
        void render(SDL_Renderer *renderer) const;
        void renderLives(SDL_Renderer *renderer) const;
        bool checkBulletCollision(Bullet *bullet);
        bool checkAsteroidCollision(const Json::Value &config, vector<Asteroid*> *split_asteroids, int wave, Asteroid *asteroid, mt19937 &gen);
        bool checkSaucerCollision(Saucer *saucer);
    private:
        void reviveShip();
        void rotate(double delay);
        void move(double delay);
        void fire(double delay, const Json::Value &config, vector<Bullet*> *ship_bullets);
        void updateInvincibility(double delay);
        void renderLife(SDL_Renderer *renderer, Vector position) const;
};

class Game {
    public:
        static void analyzeGameConfiguration(Json::Value &config);
        Game(const Json::Value &config, int seed);
        ~Game();
        void update(double delay, const Json::Value &config);
        void renderOverlay(SDL_Renderer *renderer, double fps) const;
        void renderGame(SDL_Renderer *renderer) const;
        AIShipData getAIShipData() const;
        vector<AIDangerData> getAIAsteroidsData();
        vector<AIDangerData> getAISaucersData();
        vector<AIDangerData> getAISaucerBulletsData();
        static int getWidth();
        static int getHeight();
    private:
        Ship ship;
        vector<Asteroid*> asteroids;
        vector<Saucer*> saucers;
        vector<Bullet*> ship_bullets, saucer_bullets;
        int wave, score, extra_lives, extra_life_point_value, asteroid_point_value, saucer_point_value;
        double saucer_cooldown, time;
        mt19937 gen;
        TTF_Font *font, *debug_font;
        ObjectId object_id;
        void makeAsteroids(const Json::Value &config);
        void makeSaucer(double delay, const Json::Value &config);
        static int width, height;
        static int generateAsteroidSpawnCount(int wave);
        static double generateSaucerSpawnRate(int wave);
};
