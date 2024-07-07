//Virtual ship for AI to use for calculations
class VirtualShip {

    constructor(ship) {
        this.position = ship.position.copy();
        this.angle = ship.angle;
        this.width = ship.width;
        this.bullet_cooldown = ship.bullet_cooldown;
        this.bullet_speed = ship.bullet_speed;
        this.bullet_life = ship.bullet_life;
        this.drag_coefficient = ship.drag_coefficient;
        this.velocity = ship.velocity.copy();
        this.rotation_speed = ship.rotation_speed;
        this.acceleration = ship.acceleration;
        this.size = AI.danger_radius[1];
    }
    
}

//Danger class for AI to analyze dangers
class Danger {

    constructor(item, size_index) {
        this.size = AI.danger_radius[size_index];
        this.position = item.position.copy();
        this.velocity = item.velocity.copy();
        this.danger_levels = ai.calculateDanger(this);
    }

}

//Target class for AI to use for targeting
class Target {

    constructor(item, size_index) {
        this.position = item.position.copy();
        this.size_index = size_index;
        this.size = ai.C[29 + this.size_index];
        this.pessimistic_size = AI.pessimistic_radius[this.size_index];
        this.velocity = item.velocity.copy();
        this.invincibility = item.invincibility;
        if (this.size_index == 0 || this.size_index == 1) {
            ai.size_groups[this.size_index]++;
        }
        this.id = item.id;
    }

}

//Marker class for AI to track targets it has shot
class Marker {

    constructor(min_time, target) {
        this.life = min_time;
        this.id = target.id;
        this.position = target.position.copy();
    }

}

//Crosshair class for AI to track target it is aiming
class Crosshair {

    constructor(id, position, angle) {
        this.id = id;
        this.angle = angle;
        this.life = Math.PI / ai.ship.rotation_speed;
        this.position = position.copy();
    }

}

//Allows us to just run a function in the wrapping system
function runInWrap(action) {
    const horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
    const vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            action(new Vector(horizontal[i], vertical[j]));
        }
    }
}

//Allows us to find the min/max of a function within the border wrapping system
function optimizeInWrap(func, cmp) {
    const horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
    const vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
    let best = null;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const value = func(new Vector(horizontal[i], vertical[j]));
            if (cmp(best, value)) {
                best = value;
            }
        }
    }
    return best;
}

class AI {

    //AI constants (unrelated to C)
    static danger_radius = [ 0, 18, 14, 34, 53, 60, 70 ];
    static pessimistic_radius = [ 14, 34, 53, 27, 32 ];
    static rotation_precision = 2;
    static random_walk_speed_limit = 1;
    static random_walk_rotation_probability = 0.1;
    static floating_point_aim_compensation = 2.5;

    //Constructor
    constructor(C) {
        //Control choices of the AI
        this.controls = {
            left: false,
            right: false,
            forward: false,
            fire: false
        };
        //These are constants (that are meant to be optimized through a training algorithm)
        this.C = C;
        //Variables for the AI
        this.max_danger = 0;
        this.dangers = [];
        this.targets = [];
        this.markers = [];
        this.crosshair = null;
        this.ship = null;
        this.flee_values = [ 0, 0, 0, 0 ];
        this.nudge_values = [ 0, 0, 0, 0 ];
        this.size_groups = [ 0, 0 ];
    }

    //Calculates the danger value of a danger
    calculateDanger(danger) {
        const horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        const vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        let results = [];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                let result = 0;
                const p = Vector.sub(Vector.add(danger.position, new Vector(horizontal[i], vertical[j])), this.ship.position);
                //Add danger velocity term
                let danger_velocity_term = Math.max(0, -p.comp(danger.velocity));
                result += this.C[2] * (Math.E ** (danger_velocity_term * this.C[3]));
                danger_velocity_term = Math.max(0, p.comp(danger.velocity));
                result -= this.C[4] * (Math.E ** (danger_velocity_term * this.C[5]));
                //Add ship velocity term
                let ship_velocity_term = Math.max(0, p.comp(this.ship.velocity));
                result += this.C[6] * (Math.E ** (ship_velocity_term * this.C[7]));
                ship_velocity_term = Math.max(0, -p.comp(this.ship.velocity));
                result -= this.C[8] * (Math.E ** (ship_velocity_term * this.C[9]));
                //Add ship direction term
                let ship_direction_term = new Vector(Math.cos(this.ship.angle), -Math.sin(this.ship.angle));
                ship_direction_term = Math.max(0, p.comp(ship_direction_term)); 
                result += this.C[10] * (Math.E ** (ship_direction_term * this.C[11]));
                ship_direction_term = new Vector(Math.cos(this.ship.angle), -Math.sin(this.ship.angle));
                ship_direction_term = Math.max(0, -p.comp(ship_direction_term)); 
                result -= this.C[12] * (Math.E ** (ship_direction_term * this.C[13]));
                //Add distance term
                let distance_term = Math.max(0, p.mag() - this.ship.size - danger.size);
                result += this.C[1];
                result *= Math.E ** (-distance_term * this.C[0]);
                result = Math.max(0, result);
                this.max_danger = Math.max(this.max_danger, result);
                results.push(result);
            }
        }
        return results;
    }

    //Generates all virtual entities to use for the game
    generateVirtualEntities() {
        if (!game.getTitleScreen()) {
            this.ship = new VirtualShip(game.getShip());
        }
        this.dangers = [];
        this.targets = [];
        this.max_danger = 0;
        this.flee_values = [ 0, 0, 0, 0 ];
        this.nudge_values = [ 0, 0, 0, 0 ];
        this.size_groups = [ 0, 0 ];
        let asteroids = game.getAsteroids();
        for (let i = 0; i < asteroids.length; i++) {
            this.dangers.push(new Danger(asteroids[i], 2 + asteroids[i].size));
            this.targets.push(new Target(asteroids[i], asteroids[i].size));
        }
        let saucers = game.getSaucers();
        for (let i = 0; i < saucers.length; i++) {
            this.dangers.push(new Danger(saucers[i], 5 + saucers[i].size));
            this.targets.push(new Target(saucers[i], 3 + saucers[i].size));
        }
        let saucer_bullets = game.getSaucerBullets();
        for (let i = 0; i < saucer_bullets.length; i++) {
            this.dangers.push(new Danger(saucer_bullets[i], 0));
        }
        this.getFleeAndNudgeValues();
    }

    //Creates flee values
    getFleeAndNudgeValues() {
        this.flee_values = [ 0, 0, 0, 0 ];
        this.nudge_values = [ 0, 0, 0, 0 ];
        const horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        const vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        for (let k = 0; k < this.dangers.length; k++) {
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    if (this.dangers[k].danger_levels[i * 3 + j] < 1) {
                        continue;
                    }
                    const p = Vector.sub(this.ship.position, Vector.add(this.dangers[k].position, new Vector(horizontal[i], vertical[j])));
                    p.normalize();
                    p.mul(this.dangers[k].danger_levels[i * 3 + j]);
                    p.rotate(-this.ship.angle, new Vector());
                    if (p.y < 0) {
                        this.flee_values[0] = Math.max(this.flee_values[0], this.C[14] * (Math.E ** (-p.y * this.C[15])));
                    } else {
                        this.flee_values[1] = Math.max(this.flee_values[1], this.C[14] * (Math.E ** (p.y * this.C[15])));
                    }
                    this.nudge_values[2] = Math.max(this.nudge_values[2], this.C[22] * (Math.E ** (Math.abs(p.y) * this.C[23])));
                    if (p.x > 0) {
                        this.flee_values[2] = Math.max(this.flee_values[2], this.C[16] * (Math.E ** (p.x * this.C[17])));
                        this.nudge_values[0] = Math.max(this.nudge_values[0], this.C[24] * (Math.E ** (p.x * this.C[25])));
                        this.nudge_values[1] = Math.max(this.nudge_values[1], this.C[24] * (Math.E ** (p.x * this.C[25])));
                    } else {
                        p.x *= -1;
                        this.flee_values[3] = Math.max(this.flee_values[3], this.C[18] * (Math.E ** (p.x * this.C[19])));
                        this.nudge_values[0] = Math.max(this.nudge_values[0], this.C[20] * (Math.E ** (p.x * this.C[21])));
                        this.nudge_values[1] = Math.max(this.nudge_values[1], this.C[20] * (Math.E ** (p.x * this.C[21])));
                    }
                }
            }
        }
    }

    //Fleeing strategy
    manageFleeing() {
        this.crosshair = null;
        if (this.flee_values[0] + this.nudge_values[0] >= 1 && this.flee_values[1] < 1) {
            this.controls.left = true;
        }
        if (this.flee_values[1] + this.nudge_values[1] >= 1 && this.flee_values[0] < 1) {
            this.controls.right = true;
        }
        if (this.controls.left && this.controls.right) {
            if (this.flee_values[0] >= this.flee_values[1]) {
                this.controls.right = false;
            }
            else {
                this.controls.left = false;
            }
        }
        if (this.flee_values[2] + this.nudge_values[2] >= 1 && this.flee_values[3] < 1) {
            this.controls.forward = true;
        }
        if (this.flee_values[0] >= 1 && this.flee_values[1] >= 1 && this.flee_values[3] >= 1) {
            if (this.flee_values[0] >= this.flee_values[1]) {
                this.controls.left = true;
            } else {
                this.controls.right = true;
            }
        }
    }

    //Formula for calculating the time it takes for a circle and point to collide (each with a unique constant velocity)
    findCirclePointCollision(p1, v1, r1, p2, v2) {
        let vd = Vector.sub(v2, v1);
        return optimizeInWrap((offset) => {
            let pd = Vector.sub(p2, Vector.add(p1, offset));
            if (pd.mag() <= r1) {
                return 0;
            }
            const a = vd.x ** 2 + vd.y ** 2;
            const b = 2 * (pd.x * vd.x + pd.y * vd.y);
            const c = pd.x ** 2 + pd.y ** 2 - r1 ** 2;
            const results = solveQuadratic(a, b, c);
            if (results.length > 0 && results[0] > 0) {
                return results[0];
            }
            if (results.length > 1 && results[1] > 0) {
                return results[1];
            }
            return null;
        }, (best, next) => {
            return (best == null || (next != null && best > next));
        });
    }

    //Predict the future states of objects
    predictStates(step) {
        //Predict ship state
        if (this.controls.left) {
            this.ship.angle += step * this.ship.rotation_speed;
        }
        if (this.controls.right) {
            this.ship.angle -= step * this.ship.rotation_speed;
        }
        while (this.ship.angle >= Math.PI * 2) {
            this.ship.angle -= Math.PI * 2;
        }
        while (this.ship.angle < 0) {
            this.ship.angle += Math.PI * 2;
        }
        const ship_direction = new Vector(Math.cos(this.ship.angle), -Math.sin(this.ship.angle));
        if (this.controls.forward) {
            ship_direction.mul(this.ship.acceleration);
            this.ship.velocity.add(Vector.mul(ship_direction, step));
        }
        const ship_initial_velocity = this.ship.velocity.copy();
        this.ship.velocity.mul(1 / (Math.E ** (this.ship.drag_coefficient * step)));
        this.ship.position = Vector.div(Vector.add(Vector.mul(this.ship.position, this.ship.drag_coefficient), Vector.sub(ship_initial_velocity, this.ship.velocity)), this.ship.drag_coefficient);
        wrap(this.ship.position);
        //Progress target positions
        for (let i = 0; i < this.targets.length; i++) {
            this.targets[i].position.add(Vector.mul(this.targets[i].velocity, step));
            wrap(this.targets[i].position);
        }
    }

    //Checks if a target has already been marked
    targetMarked(target) {
        for (let i = 0; i < this.markers.length; i++) {
            if (this.markers[i].id == target.id) {
                return true;
            }
        }
        for (let i = 0; i < this.targets.length; i++) {
            if (this.targets[i].id == target.id) {
                return false;
            }
        }
        return true;
    }

    //Checks if a bullet will hit a target in current ship state and state where it will hit the target
    checkBulletCollisionTime(target, pessimistic_size = false, aiming = false) {
        //Check if there is a bullet collision
        const p1 = target.position.copy();
        const p2 = this.ship.position.copy();
        const direction = new Vector(Math.cos(this.ship.angle), -Math.sin(this.ship.angle));
        direction.mul(this.ship.width / 2 + 5);
        p2.add(direction);
        direction.normalize();
        wrap(p2);
        const v2 = Vector.mul(direction, this.ship.bullet_speed);
        v2.add(this.ship.velocity);
        const v1 = target.velocity;
        let r1;
        if (!pessimistic_size) {
            r1 = target.size;
        } else {
            r1 = target.pessimistic_size;
        }
        if (aiming) {
            r1 = Math.max(0, r1 - AI.floating_point_aim_compensation);
        }
        const result = this.findCirclePointCollision(p1, v1, r1, p2, v2);
        if (result == null || result >= this.ship.bullet_life) {
            return null;
        }
        let collision_location = Vector.add(p2, Vector.mul(v2, result));
        if (target.size_index > 0 && target.size_index < 3) {
            let explosion_location = Vector.add(p1, Vector.mul(v1, result));
            wrap(explosion_location);
            const explosion_distance = optimizeInWrap((offset) => {
                return Vector.sub(Vector.add(explosion_location, offset), this.ship.position).mag();
            }, (best, next) => {
                return (best == null || (next != null && best > next));
            });
            if (explosion_distance < this.C[26]) {
                return null;
            }
        }
        return [ result, collision_location ];
    }

    //Checks if shooting an object will cause collateral damage
    checkCollateralDamage(target, collision_time) {
        for (let i = 0; i < this.targets.length; i++) {
            if (target.id == this.targets[i].id) {
                continue;
            }
            const result = this.checkBulletCollisionTime(this.targets[i], true);
            if (result != null && result[0] < collision_time) {
                return true;
            }
        }
        return false;
    }

    //Checks if destroying the target will violate the clutter optimization rules
    checkClutterViolation(target) {
        if (target.size_index >= 3 || target.size_index == 0) {
            return false;
        }
        if (target.size_index == 1) {
            if (this.size_groups[0] == 0) {
                return false;
            }
            if (this.size_groups[0] + 2 > this.C[27]) {
                return true;
            }
            if (this.size_groups[0] + this.size_groups[1] + 1 > this.C[28]) {
                return true;
            }
        } else if (target.size_index == 2) {
            if (this.size_groups[0] + this.size_groups[1] + 2 > this.C[28]) {
                return true;
            }
        }
        return false;
    }

    //Checks if you should shoot with current object position
    checkShootingOpportunity(aiming = false) {
        let destroyed = null;
        let destruction_location = null;
        let min_time = Infinity;
        for (let i = 0; i < this.targets.length; i++) {
            if (this.targets[i].size_index < 3 && this.targets[i].invincibility > 0) {
                continue;
            }
            const result = this.checkBulletCollisionTime(this.targets[i], false, aiming);
            if (result != null && result[0] < min_time) {
                destroyed = this.targets[i];
                destruction_location = result[1];
                min_time = result[0];
            }
        }
        if (destroyed != null && (this.targetMarked(destroyed) || this.checkCollateralDamage(destroyed, min_time) || this.checkClutterViolation(destroyed))) {
            return [ null, Infinity, null ];
        }
        return [ destroyed, min_time, destruction_location ];
    }

    //Shooting strategy
    manageShooting(delay) {
        if (this.ship.bullet_cooldown < 1) {
            return;
        }
        this.predictStates(delay / config.game_precision);
        const opportunity = this.checkShootingOpportunity();
        if (opportunity[0] != null) {
            this.controls.fire = true;
            this.markers.push(new Marker(opportunity[1] + 5, opportunity[0]));
            this.crosshair = null;
        }
    }

    //Updates target markers
    updateMarkers(delay) {
        if (game.getShipDead() && game.getShipLives() <= 0) {
            this.markers = [];
            return;
        }
        const new_markers = [];
        for (let i = 0; i < this.markers.length; i++) {
            if (!game.getPaused()) {
                this.markers[i].life -= delay;
            }
            let found_target = false;
            for (let j = 0; j < this.targets.length; j++) {
                if (this.targets[j].id == this.markers[i].id) {
                    this.markers[i].position = this.targets[j].position.copy();
                    found_target = true;
                    break;
                }
            }
            if (this.markers[i].life > 0 && found_target) {
                new_markers.push(this.markers[i]);
            }
        }
        this.markers = new_markers;
    }

    //Aiming strategy
    manageAim(delay) {
        //Iterate through different angles off from our current angle
        if (this.crosshair != null && (this.targetMarked(this.crosshair) || this.crosshair.life <= 0)) {
            this.crosshair = null;
        }
        
        //Pick a new target if no current target
        if (this.crosshair == null) {
            let angle_offset = 0;
            let position = null;
            let id = null;
            let aim_angle = null;
            this.predictStates(delay);
            let first_iteration = true;
            while (angle_offset <= Math.PI) {
                //Check if we rotate left
                this.ship.angle += angle_offset;
                while (this.ship.angle >= Math.PI * 2) {
                    this.ship.angle -= Math.PI * 2;
                }
                let result = this.checkShootingOpportunity();
                if (result[1] < Infinity) {
                    position = result[2];
                    id = result[0].id;
                    this.ship.angle -= angle_offset;
                    aim_angle = this.ship.angle + angle_offset;
                    break;
                }
                //Check if we rotate right
                this.ship.angle -= 2 * angle_offset;
                while (this.ship.angle < 0) {
                    this.ship.angle += Math.PI * 2;
                }
                result = this.checkShootingOpportunity();
                if (result[1] < Infinity) {
                    position = result[2];
                    id = result[0].id;
                    this.ship.angle += angle_offset;
                    aim_angle = this.ship.angle - angle_offset;
                    break;
                }
                this.ship.angle += angle_offset;
                if (!first_iteration) {
                    angle_offset += this.ship.rotation_speed / AI.rotation_precision;
                    this.predictStates(1 / AI.rotation_precision);
                } else {
                    let random_shift = Math.random() / AI.rotation_precision;
                    angle_offset += this.ship.rotation_speed * random_shift;
                    this.predictStates(random_shift);
                    first_iteration = false;
                }
            }
            this.generateVirtualEntities();
            if (position != null) {
                this.crosshair = new Crosshair(id, position, aim_angle);
            }
        }
        //Actually rotate towards the target
        if (this.crosshair == null) {
            let rotation_choice = Math.random();
            if (rotation_choice <= AI.random_walk_rotation_probability / 2) {
                this.controls.left = true;
            } else if (rotation_choice <= AI.random_walk_rotation_probability) {
                this.controls.right = true;
            }
            if (this.ship.velocity.mag() < AI.random_walk_speed_limit) {
                this.controls.forward = true;
            }
            return;
        }
        const goal_angle = this.crosshair.angle;
        let time_left;
        if (goal_angle >= this.ship.angle) {
            time_left = goal_angle - this.ship.angle;
        } else {
            time_left = Math.PI * 2 - this.ship.angle + goal_angle;
        }
        let time_right;
        if (goal_angle <= this.ship.angle) {
            time_right = this.ship.angle - goal_angle;
        } else {
            time_right = this.ship.angle + Math.PI * 2 - goal_angle;
        }
        if (time_left < time_right) {
            this.controls.left = true;
        } else if (time_left > time_right) {
            this.controls.right = true;
        }
        //Update the crosshair
        if (this.crosshair != null && !game.getPaused()) {
            this.crosshair.life -= delay;
            if (this.crosshair.life <= 0) {
                this.crosshair = null;
            }
        }
    }

    //AI makes decision and applies controls
    update(delay) {
        this.resetControls();
        if (game.getTitleScreen()) {
            return;
        }
        this.generateVirtualEntities();
        if (this.ship.teleport_buffer > 0) {
            return;
        }
        if (this.max_danger >= 1) {
            this.manageFleeing();
        } else {
            this.manageAim(delay);
        }
        this.predictStates(delay / config.game_precision);
        this.manageShooting(delay);
        this.updateMarkers(delay);
    }

    //AI draws debug info if it wants to
    drawDebug() {
        if (game.getTitleScreen() || game.getShipDead()) {
            return;
        }
        this.generateVirtualEntities();
        this.updateMarkers(0);
        runInWrap((offset) => {
            ctx.translate(offset.x, offset.y);
            AIDebug.drawDangerRadius(this.ship);
            AIDebug.drawTargetMinDistance(this.ship);
            if (this.max_danger >= 1) {
                AIDebug.drawNudgeValues(this.ship);
                AIDebug.drawFleeValues(this.ship);
            }
            for (let i = 0; i < this.dangers.length; i++) {
                AIDebug.drawDangerRadius(this.dangers[i]);
                AIDebug.drawDangerLevel(this.dangers[i]);
            }
            for (let i = 0; i < this.targets.length; i++) {
                AIDebug.drawTargetRadius(this.targets[i]);
            }
            for (let i = 0; i < this.markers.length; i++) {
                AIDebug.drawMarker(this.markers[i]);
            }
            if (this.crosshair != null) {
                AIDebug.drawCrosshair(this.crosshair);
            }
            ctx.translate(-offset.x, -offset.y);
        });
    }

    //AI draws overlay info for debugging
    drawDebugOverlay() {
        if (game.getTitleScreen() || game.getShipDead()) {
            return;
        }
        AIDebug.drawAIData();
    }

    //Resets AI controls
    resetControls() {
        for (let i in this.controls) {
            this.controls[i] = false;
        }
    }

    //Applies the AI controls to the actual player
    applyControls() {
        controls.left = this.controls.left;
        controls.right = this.controls.right;
        controls.forward = this.controls.forward;
        controls.fire = this.controls.fire;
    }

}