#include "game.h"

class AI;

const int C_LENGTH = 34;

template <class T> void renderWrap(SDL_Renderer *renderer, AI *ai, const Vector &position, double radius, const T *object, void (T::*func)(SDL_Renderer*, AI*, Vector) const, bool offset_x = true, bool offset_y = true);

void renderFilledCircle(SDL_Renderer *renderer, const Vector &position, double radius, Uint8 r, Uint8 g, Uint8 b, Uint8 a);

class AIShip {
    public:
        Vector position, velocity;
        double angle, width, bullet_cooldown, bullet_speed, bullet_life, drag_coefficient, rotation_speed, acceleration, size, target_safety_radius, flee_values[4], nudge_values[3];
        int lives;
        AIShip(const AIShipData &ship, double target_safety_radius);
        void render(SDL_Renderer* renderer, AI *ai, Vector offset) const;
    private:
        void renderArrowMetric(SDL_Renderer *renderer, double metric, double angle, const Vector &p, AI *ai, Uint8 r, Uint8 g, Uint8 b, Uint8 a) const;
};

class AIDanger {
    public:
        Vector position, velocity;
        double size;
        vector<double> danger_levels;
        bool entered_x, entered_y;
        AIDanger(const AIDangerData &danger, int size_index, vector<double> danger_levels);
        void render(SDL_Renderer* renderer, AI *ai, Vector offset) const;
};

class AITarget {
    public:
        Vector position, velocity;
        int size_index, id;
        double size, pessimistic_size, invincibility;
        bool entered_x, entered_y;
        AITarget(const AIDangerData &target, int size_index, double size);
        void render(SDL_Renderer* renderer, AI *ai, Vector offset) const;
};

class AIMarker {
    public:
        Vector position;
        int id, size_index;
        double life;
        AIMarker(AITarget &target, double life);
        void render(SDL_Renderer* renderer, AI *ai, Vector offset) const;
};

class AICrosshair {
    public:
        Vector position;
        int id;
        double angle, life;
        AICrosshair(int id, double angle, double ship_rotation_speed, const Vector &position);
        void render(SDL_Renderer* renderer, AI *ai, Vector offset) const;
};

class AI {
    public:
        AI(double (&c)[C_LENGTH], AIShipData ship);
        ~AI();
        void update(double delay, const Json::Value &config, Game *game);
        void renderGame(SDL_Renderer *renderer, Game *game);
        void renderOverlay(SDL_Renderer *renderer) const;
        void applyControls() const;
        TTF_Font* getSmallFont();
        static const double DANGER_RADIUS[];
        static const double PESSIMISTIC_RADIUS[], FLOATING_POINT_COMPENSATION, RANDOM_WALK_ROTATION_PROBABILITY, RANDOM_WALK_SPEED_LIMIT;
        static const int ROTATION_PRECISION;
    private:
        TTF_Font *font, *small_font;
        int size_groups[2], misses;
        bool controls_left, controls_right, controls_forward, controls_fire;
        double (&c)[C_LENGTH], max_danger, flee_values[4], nudge_values[3];
        vector<AIDanger> dangers;
        vector<AITarget> targets;
        vector<AIMarker*> markers;
        AICrosshair *crosshair;
        AIShip ship;
        mt19937 gen;
        vector<double> calculateDangerLevels(const AIDangerData &danger);
        void generateVirtualEntities(Game *game);
        void calculateFleeAndNudgeValues();
        void manageFleeing();
        double calculateCirclePointCollisionTime(const Vector &p1, const Vector &v1, double r1, const Vector &p2, const Vector &v2) const;
        pair<double, Vector> calculateBulletCollisionTime(const AITarget &target, bool pessimistic_size = false, bool aiming = false) const;
        bool predictCollateralDamage(const AITarget &target, double collision_time) const;
        bool isTargetMarked(int id) const;
        bool predictClutterViolation(const AITarget &target) const;
        tuple<AITarget*, double, Vector> generateFiringOpportunity(bool aiming = false);
        void manageFiring(double delay, const Json::Value &config);
        void updateMarkers(double delay);
        void predictEntityStates(double delay);
        AICrosshair* generateAimTarget(double delay, const Json::Value &config, Game *game);
        void manageAim(double delay, const Json::Value &config, Game *game);
        void resetControls();
};
