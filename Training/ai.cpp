#include "ai.h"

const double AI::DANGER_RADIUS[] = { 0, 18, 14, 34, 53, 60, 70 };
const double AI::PESSIMISTIC_RADIUS[] = { 14, 34, 53, 27, 32 };
const int AI::ROTATION_PRECISION = 2;
const double AI::FLOATING_POINT_COMPENSATION = 2.5;
const double AI::RANDOM_WALK_SPEED_LIMIT = 1;
const double AI::RANDOM_WALK_ROTATION_PROBABILITY = 0.1;

template <class T> void renderWrap(Renderer *renderer, AI *ai, const Vector &position, double radius, const T *object, void (T::*func)(Renderer*, AI*, Vector) const, bool offset_x, bool offset_y) {
    vector<int> horizontal = { 0 };
    vector<int> vertical = { 0 };
    if (position.x + radius >= Game::getWidth() && offset_x) {
        horizontal.push_back(-Game::getWidth());
    }
    if (position.x - radius <= 0 && offset_x) {
        horizontal.push_back(Game::getWidth());
    }
    if (position.y + radius >= Game::getHeight() && offset_y) {
        vertical.push_back(-Game::getHeight());
    }
    if (position.y - radius <= 0 && offset_y) {
        vertical.push_back(Game::getHeight());
    }
    for (int x : horizontal) {
        for (int y : vertical) {
            Vector offset(x, y);
            (object->*func)(renderer, ai, offset);
        }
    }
}

AIShip::AIShip(const AIShipData &ship, double target_safety_radius) : position(ship.position), angle(ship.angle), width(ship.width), bullet_cooldown(ship.bullet_cooldown), bullet_speed(ship.bullet_speed), bullet_life(ship.bullet_life), drag_coefficient(ship.drag_coefficient), velocity(ship.velocity), rotation_speed(ship.rotation_speed), acceleration(ship.acceleration), size(AI::DANGER_RADIUS[1]), lives(ship.lives), target_safety_radius(target_safety_radius), flee_values({ -1, -1, -1, -1 }), nudge_values({ -1, -1, -1 }) { }

void AIShip::renderArrowMetric(Renderer *renderer, double metric, double angle, const Vector &p, AI *ai, Uint8 r, Uint8 g, Uint8 b, Uint8 a) const {
    double scaled_metric = min(75.0, metric * 75);
    Vector pd(p.x + scaled_metric, p.y);
    pd.rotate(angle + this->angle, p);
    renderArrow(renderer, p, pd, r, g, b, a);
    pd.x = p.x + scaled_metric;
    pd.y = p.y + 15;
    pd.rotate(angle + this->angle, p);
    renderer->requestText(TINY, trimDouble(metric), pd.x, pd.y, MIDDLE, r, g, b, a);
}

void AIShip::render(Renderer *renderer, AI *ai, Vector offset) const {
    Vector p = this->position + offset;
    renderer->requestCircle(p.x, p.y, this->size, 210, 140, 240, 255 * 0.75);
    renderer->requestFilledCircle(p.x, p.y, this->target_safety_radius, 245, 148, 69, 255 * 0.25);
    if (this->flee_values[0] != -1) {
        this->renderArrowMetric(renderer, this->flee_values[2], 0, p, ai, 210, 140, 240, 255 * 0.75);
        this->renderArrowMetric(renderer, this->flee_values[0], M_PI / 2, p, ai, 210, 140, 240, 255 * 0.75);
        this->renderArrowMetric(renderer, this->flee_values[1], -M_PI / 2, p, ai, 210, 140, 240, 255 * 0.75);
        this->renderArrowMetric(renderer, this->flee_values[3], M_PI, p, ai, 210, 140, 240, 255 * 0.75);
        this->renderArrowMetric(renderer, this->nudge_values[2], 0, p, ai, 116, 243, 247, 255 * 0.75);
        this->renderArrowMetric(renderer, this->nudge_values[0], M_PI / 2, p, ai, 116, 243, 247, 255 * 0.75);
        this->renderArrowMetric(renderer, this->nudge_values[1], -M_PI / 2, p, ai, 116, 243, 247, 255 * 0.75);
    }
}

AIDanger::AIDanger(const AIDangerData &danger, int size_index, vector<double> danger_levels) : size(AI::DANGER_RADIUS[size_index]), position(danger.position), velocity(danger.velocity), danger_levels(danger_levels), entered_x(danger.entered_x), entered_y(danger.entered_y) { }

void AIDanger::render(Renderer *renderer, AI *ai, Vector offset) const {
    Vector p = this->position + offset;
    renderer->requestCircle(p.x, p.y, this->size, 210, 140, 240, 255 * 0.75);
    double max_danger = 0;
    for (double level : this->danger_levels) {
        max_danger = max(max_danger, level);
    }
    renderer->requestText(TINY, trimDouble(max_danger), this->position.x, this->position.y - 15, MIDDLE, 210, 140, 240, 255);
}

AITarget::AITarget(const AIDangerData &target, int size_index, double size) : position(target.position), size_index(size_index), size(size), pessimistic_size(AI::PESSIMISTIC_RADIUS[size_index]), velocity(target.velocity), invincibility(target.invincibility), id(target.id), entered_x(target.entered_x), entered_y(target.entered_y) { }

void AITarget::render(Renderer *renderer, AI *ai, Vector offset) const {
    Vector p = this->position + offset;
    renderer->requestCircle(p.x, p.y, this->size, 245, 148, 69, 255 * 0.75);
}

AIMarker::AIMarker(AITarget &target, double life) : position(target.position), life(life), id(target.id), size_index(target.size_index) { }

void AIMarker::render(Renderer *renderer, AI *ai, Vector offset) const {
    Vector p = this->position + offset;
    renderer->requestLine(p.x - 8, p.y - 8, p.x + 8, p.y + 8, 245, 148, 69, 255);
    renderer->requestLine(p.x + 8, p.y - 8, p.x - 8, p.y + 8, 245, 148, 69, 255);
}

AICrosshair::AICrosshair(int id, double angle, double ship_rotation_speed, const Vector &position) : position(position), id(id), angle(angle), life(M_PI / ship_rotation_speed) { }

void AICrosshair::render(Renderer *renderer, AI *ai, Vector offset) const {
    Vector p1 = this->position + offset;
    renderer->requestLine(p1.x - 8, p1.y, p1.x - 3, p1.y, 245, 148, 69, 255);
    renderer->requestLine(p1.x + 8, p1.y, p1.x + 3, p1.y, 245, 148, 69, 255);
    renderer->requestLine(p1.x, p1.y - 8, p1.x, p1.y - 3, 245, 148, 69, 255);
    renderer->requestLine(p1.x, p1.y + 8, p1.x, p1.y + 3, 245, 148, 69, 255);
    Vector p2(cos(this->angle), -sin(this->angle));
    p2 *= 40;
    p2 += p1;
    renderArrow(renderer, p1, p2, 245, 148, 69, 255 * 0.5);
}

AI::AI(double (&c)[C_LENGTH], AIShipData ship) : c(c), controls_left(false), controls_right(false), controls_forward(false), controls_fire(false), max_danger(0), flee_values{ 0, 0, 0, 0 }, nudge_values{ 0, 0, 0 }, size_groups{ 0, 0 }, ship(ship, c[26]), crosshair(nullptr), gen(rand()), misses(0) { }

AI::~AI() {
    for (AIMarker *marker : this->markers) {
        delete marker;
    }
    if (this->crosshair != nullptr) {
        delete this->crosshair;
    }
}

vector<double> AI::calculateDangerLevels(const AIDangerData &danger) {
    int horizontal[] = { 0, Game::getWidth(), -Game::getWidth() };
    int vertical[] = { 0, Game::getHeight(), -Game::getHeight() };
    vector<double> results;
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
            double result = 0;
            Vector offset(horizontal[i], vertical[j]);
            Vector p = (danger.position + offset) - this->ship.position;
            double danger_velocity_term = max(0.0, -p.comp(danger.velocity));
            result += this->c[2] * exp(this->c[3] * danger_velocity_term);
            danger_velocity_term = max(0.0, p.comp(danger.velocity));
            result -= this->c[4] * exp(this->c[5] * danger_velocity_term);
            double ship_velocity_term = max(0.0, p.comp(this->ship.velocity));
            result += this->c[6] * exp(this->c[7] * ship_velocity_term);
            ship_velocity_term = max(0.0, -p.comp(this->ship.velocity));
            result += this->c[8] * exp(this->c[9] * ship_velocity_term);
            Vector ship_direction(cos(this->ship.angle), -sin(this->ship.angle));
            double ship_direction_term = max(0.0, p.comp(ship_direction));
            result += this->c[10] * exp(this->c[11] * ship_direction_term);
            ship_direction_term = max(0.0, -p.comp(ship_direction_term));
            result -= this->c[12] * exp(this->c[13] * ship_direction_term);
            double distance_term = max(0.0, p.mag() - this->ship.size - danger.size);
            result += this->c[1];
            result *= exp(-this->c[0] * distance_term);
            result = max(0.0, result);
            this->max_danger = max(this->max_danger, result);
            results.push_back(result);
        }
    }
    return results;
}

void AI::generateVirtualEntities(Game *game) {
    AIShipData ship_data = game->getAIShipData();
    this->ship = AIShip(ship_data, this->c[26]);
    this->dangers.clear();
    this->targets.clear();
    this->max_danger = 0;
    for (int i = 0; i < 4; i++) {
        this->flee_values[i] = 0;
    }
    for (int i = 0; i < 3; i++) {
        this->nudge_values[i] = 0;
    }
    this->size_groups[0] = 0;
    this->size_groups[1] = 0;
    vector<AIDangerData> asteroids_data = game->getAIAsteroidsData();
    for (const AIDangerData &asteroid : asteroids_data) {
        if (asteroid.size == 0 || asteroid.size == 1) {
            this->size_groups[asteroid.size]++;
        }
        vector<double> danger_levels = this->calculateDangerLevels(asteroid);
        this->dangers.emplace_back(asteroid, 2 + asteroid.size, danger_levels);
        this->targets.emplace_back(asteroid, asteroid.size, this->c[29 + asteroid.size]);
    }
    vector<AIDangerData> saucers_data = game->getAISaucersData();
    for (const AIDangerData &saucer : saucers_data) {
        vector<double> danger_levels = this->calculateDangerLevels(saucer);
        this->dangers.emplace_back(saucer, 5 + saucer.size, danger_levels);
        this->targets.emplace_back(saucer, 3 + saucer.size, this->c[32 + saucer.size]);
    }
    vector<AIDangerData> saucer_bullets_data = game->getAISaucerBulletsData();
    for (const AIDangerData &bullet : saucer_bullets_data) {
        vector<double> danger_levels = this->calculateDangerLevels(bullet);
        this->dangers.emplace_back(bullet, 0, danger_levels);
    }
    for (const AIMarker *marker : this->markers) {
        if (marker->size_index == 2) {
            this->size_groups[1] += 2;
        } else if (marker->size_index == 1) {
            this->size_groups[0] += 2;
            this->size_groups[1]--;
        }
    }
}

void AI::calculateFleeAndNudgeValues() {
    int horizontal[] = { 0, Game::getWidth(), -Game::getWidth() };
    int vertical[] = { 0, Game::getHeight(), -Game::getHeight() };
    for (const AIDanger &danger : this->dangers) {
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                if (danger.danger_levels[i * 3 + j] < 1) {
                    continue;
                }
                Vector offset(horizontal[i], vertical[j]);
                Vector p = this->ship.position - (danger.position + offset);
                p.normalize();
                p *= danger.danger_levels[i * 3 + j];
                Vector zero;
                p.rotate(-this->ship.angle, zero);
                if (p.y < 0) {
                    this->flee_values[0] = max(this->flee_values[0], this->c[14] * exp(-this->c[15] * p.y));
                } else {
                    this->flee_values[1] = max(this->flee_values[1], this->c[14] * exp(this->c[15] * p.y));
                }
                this->nudge_values[2] = max(this->nudge_values[2], this->c[24] * exp(this->c[25] * abs(p.y)));
                if (p.x > 0) {
                    this->flee_values[2] = max(this->flee_values[2], this->c[16] * exp(this->c[17] * p.x));
                    this->nudge_values[0] = max(this->nudge_values[0], this->c[22] * exp(this->c[23] * p.x));
                    this->nudge_values[1] = max(this->nudge_values[1], this->c[22] * exp(this->c[23] * p.x));
                } else {
                    p.x *= -1;
                    this->flee_values[3] = max(this->flee_values[3], this->c[18] * exp(this->c[19] * p.x));
                    this->nudge_values[0] = max(this->nudge_values[0], this->c[20] * exp(this->c[21] * p.x));
                    this->nudge_values[1] = max(this->nudge_values[1], this->c[20] * exp(this->c[21] * p.x));
                }
            }
        }
    }
    for (int i = 0; i < 4; i++) {
        this->ship.flee_values[i] = this->flee_values[i];
    }
    for (int i = 0; i < 3; i++) {
        this->ship.nudge_values[i] = this->nudge_values[i];
    }
}

void AI::manageFleeing() {
    if (this->crosshair != nullptr) {
        delete this->crosshair;
        this->crosshair = nullptr;
    }
    this->calculateFleeAndNudgeValues();
    if (this->flee_values[0] + this->nudge_values[0] >= 1 && this->flee_values[1] < 1) {
        this->controls_left = true;
    }
    if (this->flee_values[1] + this->nudge_values[1] >= 1 && this->flee_values[0] < 1) {
        this->controls_right = true;
    }
    if (this->controls_left && this->controls_right) {
        if (this->flee_values[0] >= this->flee_values[1]) {
            this->controls_right = false;
        } else {
            this->controls_left = false;
        }
    }
    if (this->flee_values[2] + this->nudge_values[2] >= 1 && this->flee_values[3] < 1) {
        this->controls_forward = true;
    }
    if (this->flee_values[0] >= 1 && this->flee_values[1] >= 1 && this->flee_values[3] >= 1) {
        if (this->flee_values[0] >= this->flee_values[1]) {
            this->controls_left = true;
        } else {
            this->controls_right = true;
        }
    }
}

double AI::calculateCirclePointCollisionTime(const Vector &p1, const Vector &v1, double r1, const Vector &p2, const Vector &v2) const {
    int horizontal[] = { 0, Game::getWidth(), -Game::getWidth() };
    int vertical[] = { 0, Game::getHeight(), -Game::getHeight() };
    Vector vd = v2 - v1;
    double min_time = DBL_MAX;
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
            Vector offset(horizontal[i], vertical[j]);
            Vector pd = p2 - (p1 + offset);
            if (pd.mag() <= r1) {
                return 0;
            }
            double a = vd.x * vd.x + vd.y * vd.y;
            double b = 2 * (pd.x * vd.x + pd.y * vd.y);
            double c = pd.x * pd.x + pd.y * pd.y - r1 * r1;
            vector<double> results = solveQuadratic(a, b, c);
            if (!results.empty() && results[0] > 0) {
                min_time = min(min_time, results[0]);
            } else if (results.size() > 1 && results[1] > 0) {
                min_time = min(min_time, results[1]);
            }
        }
    }
    return min_time;
}

pair<double, Vector> AI::calculateBulletCollisionTime(const AITarget &target, bool pessimistic_size, bool aiming) const {
    Vector p1 = target.position;
    Vector v1 = target.velocity;
    Vector p2 = this->ship.position;
    Vector ship_direction(cos(this->ship.angle), -sin(this->ship.angle));
    ship_direction *= this->ship.width / 2 + 5;
    p2 += ship_direction;
    ship_direction.normalize();
    wrap(p2, Game::getWidth(), Game::getHeight());
    Vector v2 = ship_direction * this->ship.bullet_speed;
    v2 += this->ship.velocity;
    double r1;
    if (!pessimistic_size) {
        r1 = target.size;
    } else {
        r1 = target.pessimistic_size;
    }
    if (aiming) {
        r1 = max(0.0, r1 - AI::FLOATING_POINT_COMPENSATION);
    }
    double result = this->calculateCirclePointCollisionTime(p1, v1, r1, p2, v2);
    if (result >= this->ship.bullet_life - AI::FLOATING_POINT_COMPENSATION) {
        return { DBL_MAX, Vector() };
    }
    if (target.size_index > 0 && target.size_index < 3) {
        Vector explosion_location = p1 + v1 * result;
        wrap(explosion_location, Game::getWidth(), Game::getHeight());
        int horizontal[] = { 0, Game::getWidth(), -Game::getWidth() };
        int vertical[] = { 0, Game::getHeight(), -Game::getHeight() };
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                Vector offset(horizontal[i], vertical[j]);
                if ((explosion_location + offset - this->ship.position).mag() < this->c[26]) {
                    return { DBL_MAX, Vector() };
                }
            }
        }
    }
    Vector collision_location = p2 + v2 * result;
    return { result, collision_location };
}

bool AI::predictCollateralDamage(const AITarget &target, double collision_time) const {
    for (const AITarget &_target : this->targets) {
        if (_target.id == target.id) {
            continue;
        }
        pair<double, Vector> result = this->calculateBulletCollisionTime(_target, true);
        if (result.first < collision_time) {
            return true;
        }
    }
    return false;
}

bool AI::isTargetMarked(int id) const {
    for (const AIMarker *marker : this->markers) {
        if (marker->id == id) {
            return true;
        }
    }
    for (const AITarget &_target : this->targets) {
        if (_target.id == id) {
            return false;
        }
    }
    return true;
}

bool AI::predictClutterViolation(const AITarget &target) const {
    if (target.size_index >= 3 || target.size_index == 0) {
        return false;
    }
    if (target.size_index == 1) {
        if (this->size_groups[0] == 0) {
            return false;
        }
        if (this->size_groups[0] + 2 > this->c[27] || this->size_groups[0] + this->size_groups[1] + 1 > this->c[28]) {
            return true;
        }
    } else if (target.size_index == 2 && this->size_groups[0] + this->size_groups[1] + 2 > this->c[28]) {
        return true;
    }
    return false;
}

tuple<AITarget*, double, Vector> AI::generateFiringOpportunity(bool aiming) {
    AITarget *destroyed = nullptr;
    double min_time = DBL_MAX;
    Vector collision_location;
    for (AITarget &target : this->targets) {
        if (target.invincibility > 0) {
            continue;
        }
        pair<double, Vector> result = this->calculateBulletCollisionTime(target, false, aiming);
        if (result.first < min_time) {
            destroyed = &target;
            min_time = result.first;
            collision_location = result.second;
        }
    }
    if (min_time < DBL_MAX && (this->isTargetMarked(destroyed->id) || this->predictCollateralDamage(*destroyed, min_time) || this->predictClutterViolation(*destroyed))) {
        return { nullptr, DBL_MAX, collision_location };
    }
    return { destroyed, min_time, collision_location };
}

void AI::manageFiring(double delay, const json &config) {
    if (this->ship.bullet_cooldown < 1) {
        return;
    }
    AITarget *target;
    double collision_time;
    Vector collision_location;
    tie(target, collision_time, collision_location) = this->generateFiringOpportunity();
    if (target != nullptr) {
        this->controls_fire = true;
        AIMarker *new_marker = new AIMarker(*target, collision_time + AI::FLOATING_POINT_COMPENSATION);
        if (new_marker->size_index == 2) {
            this->size_groups[1] += 2;
        } else if (new_marker->size_index == 1) {
            this->size_groups[0] += 2;
            this->size_groups[1]--;
        } 
        this->markers.push_back(new_marker);
        if (this->crosshair != nullptr) {
            delete this->crosshair;
            this->crosshair = nullptr;
        }
    }
}

void AI::updateMarkers(double delay) {
    if (this->ship.lives <= 0) {
        for (AIMarker *marker : this->markers) {
            delete marker;
        }
        this->markers.clear();
        return;
    }
    vector<AIMarker*> new_markers;
    for (AIMarker *marker : this->markers) {
        marker->life -= delay;
        bool found_target = false;
        for (const AITarget &target : this->targets) {
            if (target.id == marker->id) {
                marker->position = target.position;
                found_target = true;
                break;
            }
        }
        if (marker->life > 0 && found_target) {
            new_markers.push_back(marker);
        } else {
            if (found_target) {
                this->misses++;
            }
            delete marker;
        }
    }
    this->markers = new_markers;
}

void AI::predictEntityStates(double delay) {
    if (this->controls_left) {
        this->ship.angle += delay * this->ship.rotation_speed;
    }
    if (this->controls_right) {
        this->ship.angle -= delay * this->ship.rotation_speed;
    }
    while (this->ship.angle >= M_PI * 2) {
        this->ship.angle -= M_PI * 2;
    }
    while (this->ship.angle < 0) {
        this->ship.angle += M_PI * 2;
    }
    Vector ship_direction(cos(this->ship.angle), -sin(this->ship.angle));
    if (this->controls_forward) {
        ship_direction *= this->ship.acceleration;
        this->ship.velocity += ship_direction * delay;
    }
    Vector ship_initial_velocity = this->ship.velocity;
    this->ship.velocity *= 1 / exp(delay * this->ship.drag_coefficient);
    this->ship.position = (this->ship.position * this->ship.drag_coefficient + ship_initial_velocity - this->ship.velocity) / this->ship.drag_coefficient;
    wrap(this->ship.position, Game::getWidth(), Game::getHeight());
    for (AITarget &target : this->targets) {
        target.position += target.velocity * delay;
        wrap(target.position, Game::getWidth(), Game::getHeight());
    }
}

AICrosshair* AI::generateAimTarget(double delay, const json &config, Game *game) {
    double angle_offset = 0;
    AITarget *target;
    double collision_time, aim_angle;
    Vector collision_location;
    bool found_target = false;
    bool first_iteration = true;
    this->predictEntityStates(delay / config["game_precision"].get<int>());
    while (angle_offset <= M_PI) {
        this->ship.angle += angle_offset;
        while (this->ship.angle >= M_PI * 2) {
            this->ship.angle -= M_PI * 2;
        }
        tie(target, collision_time, collision_location) = this->generateFiringOpportunity(true);
        if (collision_time < DBL_MAX) {
            found_target = true;
            aim_angle = this->ship.angle;
            this->ship.angle -= angle_offset;
            while (this->ship.angle < 0) {
                this->ship.angle += M_PI * 2;
            }
            break;
        }
        this->ship.angle -= 2 * angle_offset;
        while (this->ship.angle < 0) {
            this->ship.angle += M_PI * 2;
        }
        tie(target, collision_time, collision_location) = this->generateFiringOpportunity(true);
        if (collision_time < DBL_MAX) {
            found_target = true;
            aim_angle = this->ship.angle;
            this->ship.angle += angle_offset;
            while (this->ship.angle >= M_PI * 2) {
                this->ship.angle -= M_PI * 2;
            }
            break;
        }
        this->ship.angle += angle_offset;
        angle_offset += this->ship.rotation_speed / AI::ROTATION_PRECISION;
        if (first_iteration) {
            this->predictEntityStates(max(0.0, 1 / AI::ROTATION_PRECISION - delay / config["game_precision"].get<int>()));
            first_iteration = false;
        } else {
            this->predictEntityStates(1 / AI::ROTATION_PRECISION);
        }
    }
    this->generateVirtualEntities(game);
    if (found_target) {
        return new AICrosshair(target->id, aim_angle, this->ship.rotation_speed, collision_location);
    }
    return nullptr;
}

void AI::manageAim(double delay, const json &config, Game *game) {
    if (this->crosshair != nullptr && (this->isTargetMarked(this->crosshair->id) || this->crosshair->life <= 0)) {
        delete this->crosshair;
        this->crosshair = nullptr;
    }
    if (this->crosshair == nullptr) {
        this->crosshair = this->generateAimTarget(delay, config, game);
    }
    if (this->crosshair == nullptr) {
        double rotation_choice = randomDouble(this->gen);
        if (rotation_choice <= AI::RANDOM_WALK_ROTATION_PROBABILITY) {
            this->controls_left = true;
        }
        if (this->ship.velocity.mag() < AI::RANDOM_WALK_SPEED_LIMIT) {
            this->controls_forward = true;
        }
        return;
    }
    double time_left = this->crosshair->angle - this->ship.angle;
    while (time_left < 0) {
        time_left += M_PI * 2;
    }
    double time_right = this->ship.angle - this->crosshair->angle;
    while (time_right < 0) {
        time_right += M_PI * 2;
    }
    if (time_left < time_right) {
        this->controls_left = true;
    } else {
        this->controls_right = true;
    }
    this->crosshair->life -= delay;
    if (this->crosshair->life <= 0) {
        delete this->crosshair;
        this->crosshair = nullptr;
    }
}

void AI::resetControls() {
    this->controls_left = this->controls_right = this->controls_forward = this->controls_fire = false;
}

void AI::update(double delay, const json &config, Game *game) {
    this->resetControls();
    this->generateVirtualEntities(game);
    if (this->ship.lives > 0) {
        if (this->max_danger >= 1) {
            this->manageFleeing();
        } else {
            this->manageAim(delay, config, game);
        }
        this->predictEntityStates(delay / config["game_precision"].get<int>());
        this->manageFiring(delay, config);
        this->updateMarkers(delay);
    }
}

void AI::renderGame(Renderer *renderer, Game *game) {
    this->generateVirtualEntities(game);
    if (this->max_danger >= 1) {
        this->calculateFleeAndNudgeValues();
    }
    this->updateMarkers(0);
    if (this->ship.lives > 0) {
        renderWrap<AIShip>(renderer, this, ship.position, max(75.0, ship.target_safety_radius), &(this->ship), &AIShip::render);
    }
    for (const AIDanger &danger : this->dangers) {
        renderWrap<AIDanger>(renderer, this, danger.position, danger.size, &danger, &AIDanger::render, danger.entered_x, danger.entered_y);
    }
    for (const AITarget &target : this->targets) {
        renderWrap<AITarget>(renderer, this, target.position, target.size, &target, &AITarget::render, target.entered_x, target.entered_y);
    }
    for (const AIMarker *marker : this->markers) {
        renderWrap<AIMarker>(renderer, this, marker->position, 32, marker, &AIMarker::render);
    }
    if (this->crosshair != nullptr) {
        renderWrap<AICrosshair>(renderer, this, this->crosshair->position, 40, this->crosshair, &AICrosshair::render);
    }
}

void AI::renderOverlay(Renderer *renderer) const {
    if (this->max_danger >= 1) {
        renderer->requestText(SMALL, "AI Mode: Fleeing", Game::getWidth() - 10, 150, RIGHT, 210, 140, 240, 255);
    } else {
        renderer->requestText(SMALL, "AI Mode: Aiming", Game::getWidth() - 10, 150, RIGHT, 245, 148, 69, 255);
    }
    renderer->requestText(SMALL, "AI Misses: " + to_string(this->misses), Game::getWidth() - 10, 170, RIGHT, 245, 148, 69, 255);
    int row_count = ceil(C_LENGTH / 10.0);
    for (int i = 0; i < row_count * 10; i += 10) {
        string c_str;
        if (i == 0) {
            c_str = "C: [ ";
        } else {
            c_str = "     ";
        }
        for (int j = i; j < min(i + 10, C_LENGTH); j++) {
            if (j < C_LENGTH - 1) {
                c_str += trimDouble(this->c[j]) + ", ";
            } else {
                c_str += trimDouble(this->c[j]) + " ]";
            }
        }
        renderer->requestText(TINY, c_str, 5, Game::getHeight() - 20 * (row_count - i / 10), LEFT, 255, 255, 255, 255);
    }
}

void AI::applyControls(EventManager *event_manager) const {
    event_manager->left = this->controls_left;
    event_manager->right = this->controls_right;
    event_manager->forward = this->controls_forward;
    event_manager->fire = this->controls_fire;
}
