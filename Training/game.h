#include <algorithm>
#include <nlohmann/json.hpp>
#include "event_manager.h"
#include "renderer.h"

using json = nlohmann::json;

class Bullet;
class Asteroid;
class Saucer;
class Ship;
class Game;

template <class T> void renderWrap(Renderer *renderer, const Vector &position, double radius, const T *object, void (T::*func)(Renderer*, Vector) const, bool offset_x = true, bool offset_y = true);

void renderFilledPolygon(Renderer *renderer, Polygon shape, const Vector &offset, Uint8 r, Uint8 g, Uint8 b, Uint8 a);

void renderArrow(Renderer *renderer, const Vector &u, const Vector &v, Uint8 r, Uint8 g, Uint8 b, Uint8 a);

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
    bool entered_x, entered_y;
};

class Bullet {
    public:
        Vector position, velocity;
        double life, radius;
        bool dead;
        Bullet(const json &config, Vector position, Vector velocity, double life);
        void update(double delay);
        void render(Renderer *renderer) const;
        bool checkAsteroidCollision(const json &config, vector<Asteroid*> *split_asteroids, int wave, Asteroid *asteroid);
        bool checkSaucerCollision(Saucer *saucer);
    private:
        void renderBullet(Renderer *renderer, Vector offset) const;
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
        mt19937 gen;
        static void analyzeAsteroidConfigurations(json &config);
        Asteroid(const json &config, Vector position, int size, int wave, mt19937 &gen);
        void update(double delay);
        void render(Renderer *renderer) const;
        void destroy(const json &config, vector<Asteroid*> *split_asteroids, int wave);
    private:
        static double generateAsteroidSpeed(int wave);
        void rotate(double delay);
        void move(double delay);
        void renderAsteroid(Renderer *renderer, Vector offset) const;
};

class Saucer : public ObjectWithId {
    public:
        Vector position, velocity;
        Polygon bounds;
        int size, vertical_movement;
        double direction_change_rate, direction_change_cooldown, bullet_life, fire_rate, bullet_cooldown, bullet_speed;
        bool entered_x, entered_y, dead;
        mt19937 gen;
        static void analyzeSaucerConfigurations(json &config);
        Saucer(const json &config, int size, int wave, mt19937 &gen);
        void update(double delay, const json &config, const Ship &ship, vector<Bullet*> *saucer_bullets);
        void render(Renderer *renderer) const;
    private:
        static double generateSaucerSpeed(int wave);
        static double generateDirectionChangeRate(int wave);
        static double generateFireRate(int wave);
        static double generateBulletSpeed(int wave);
        Vector bestFireDirection(const Ship &ship) const;
        void fire(double delay, const json &config, const Ship &ship, vector<Bullet*> *saucer_bullets);
        void move(double delay);
        void renderSaucer(Renderer *renderer, Vector offset) const;
};

class Ship {
    public:
        Vector position, velocity;
        Polygon bounds;
        double width, height, rear_offset, angle, rotation_speed, acceleration, drag_coefficient, bullet_cooldown, fire_rate, bullet_speed, bullet_life, invincibility, invincibility_time, invincibility_flash, invincibility_flash_rate, thruster_status, thruster_flash_rate, trail_length;
        int lives;
        bool dead, accelerating;
        Ship(const json &config);
        void update(double delay, const json &config, const EventManager *event_manager, vector<Bullet*> *ship_bullets);
        void renderShip(Renderer *renderer, Vector offset) const;
        void render(Renderer *renderer) const;
        void renderLives(Renderer *renderer) const;
        bool checkBulletCollision(Bullet *bullet);
        bool checkAsteroidCollision(const json &config, vector<Asteroid*> *split_asteroids, int wave, Asteroid *asteroid);
        bool checkSaucerCollision(Saucer *saucer);
    private:
        void reviveShip();
        void rotate(double delay, const EventManager *event_manager);
        void move(double delay, const EventManager *event_manager);
        void fire(double delay, const json &config, const EventManager *event_manager, vector<Bullet*> *ship_bullets);
        void updateInvincibility(double delay);
        void renderLife(Renderer *renderer, Vector position) const;
};

class Game {
    public:
        static void analyzeGameConfiguration(json &config);
        Game(const json &config, int seed);
        ~Game();
        void update(double delay, const json &config, const EventManager *event_manager);
        void renderOverlay(Renderer *renderer, double fps) const;
        void renderGame(Renderer *renderer) const;
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
        mt19937 gen1, gen2;
        ObjectId object_id;
        void makeAsteroids(const json &config);
        void makeSaucer(double delay, const json &config);
        static int width, height;
        static int generateAsteroidSpawnCount(int wave);
        static double generateSaucerSpawnRate(int wave);
};
