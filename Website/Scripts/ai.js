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
        this.danger_level = ai.calculateDanger(this);
        ai.max_danger = Math.max(ai.max_danger, this.danger_level);
        if (size_index >= 5) {
            ai.saucer_exists = true;
        }
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
        this.size_index = target.size_index;
    }

}

//Crosshair class for AI to track target it is aiming
class Crosshair {

    constructor(item, angle) {
        this.id = item.id;
        this.angle = angle;
        this.life = Math.PI / ai.ship.rotation_speed;
        this.position = item.position.copy();
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
    static rotation_precision = 1;
    static reposition_sample_count = 20;
    static target_chasing_speed_limit = 6;

    //Constructor
    constructor(C) {
        //Control choices of the AI
        this.controls = {
            left: false,
            right: false,
            forward: false,
            fire: false
        };
        //These are constants (that are meant to be optimized through machine learning)
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
        this.saucer_exists = false;
        this.goal_position = null;
    }

    //Calculates the danger value of a danger
    calculateDanger(danger) {
        /*const p = optimizeInWrap((offset) => {
            return Vector.sub(Vector.add(danger.position, offset), this.ship.position);
        }, (best, next) => {
            return (best == null || next.mag() < best.mag());
        });
        let result = 0;
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
        let ship_direction_term = new Vector(Math.cos(this.ship.angle), Math.sin(-this.ship.angle));
        ship_direction_term = Math.max(0, p.comp(ship_direction_term)); 
        result += this.C[10] * (Math.E ** (ship_direction_term * this.C[11]));
        ship_direction_term = new Vector(Math.cos(this.ship.angle), Math.sin(-this.ship.angle));
        ship_direction_term = Math.max(0, -p.comp(ship_direction_term)); 
        result -= this.C[12] * (Math.E ** (ship_direction_term * this.C[13]));
        //Add distance term
        result += this.C[1];
        result *= Math.E ** (-this.C[0] * Math.max(0, p.mag() - this.ship.size - danger.size));
        result = Math.max(0, result);
        return result;*/
        const p = optimizeInWrap((offset) => {
            return Vector.sub(Vector.add(danger.position, offset), this.ship.position);
        }, (best, next) => {
            return (best == null || next.mag() < best.mag());
        });
        let result = 0;
        //Add danger velocity term
        let danger_velocity_term = Math.max(0, -p.comp(danger.velocity));
        result += this.C[2] * (danger_velocity_term ** this.C[3]);
        danger_velocity_term = Math.max(0, p.comp(danger.velocity));
        result -= this.C[4] * (danger_velocity_term ** this.C[5]);
        //Add ship velocity term
        let ship_velocity_term = Math.max(0, p.comp(this.ship.velocity));
        result += this.C[6] * (ship_velocity_term ** this.C[7]);
        ship_velocity_term = Math.max(0, -p.comp(this.ship.velocity));
        result -= this.C[8] * (ship_velocity_term ** this.C[9]);
        //Add ship direction term
        let ship_direction_term = new Vector(Math.cos(this.ship.angle), Math.sin(-this.ship.angle));
        ship_direction_term = Math.max(0, p.comp(ship_direction_term)); 
        result += this.C[10] * (ship_direction_term ** this.C[11]);
        ship_direction_term = new Vector(Math.cos(this.ship.angle), Math.sin(-this.ship.angle));
        ship_direction_term = Math.max(0, -p.comp(ship_direction_term)); 
        result -= this.C[12] * (ship_direction_term ** this.C[13]);
        //Add distance term
        let distance_term = 1 / Math.max(1, p.mag() - this.ship.size - danger.size);
        result += this.C[1];
        result *= distance_term ** this.C[0];
        result = Math.max(0, result);
        return result;
    }

    //Predicts if position is dangerous
    predictDanger(position) {
        for (let i = 0; i < this.dangers.length; i++) {
            const p = optimizeInWrap((offset) => {
                return Vector.sub(Vector.add(this.dangers[i].position, offset), position);
            }, (best, next) => {
                return (best == null || next.mag() < best.mag());
            });
            let result = 0;
            //Add danger velocity term
            let danger_velocity_term = Math.max(0, -p.comp(this.dangers[i].velocity));
            result += this.C[2] * (danger_velocity_term ** this.C[3]);
            danger_velocity_term = Math.max(0, p.comp(this.dangers[i].velocity));
            result -= this.C[4] * (danger_velocity_term ** this.C[5]);
            //Add distance term
            let distance_term = 1 / Math.max(1, p.mag() - this.ship.size - this.dangers[i].size);
            result += this.C[1];
            result *= distance_term ** this.C[0];
            result = Math.max(0, result);
            if (result >= 1) {
                return true;
            }
        }
        return false;
    }

    //Generates all virtual entities to use for the game
    generateVirtualEntities() {
        if (!game.getTitleScreen()) {
            this.ship = new VirtualShip(game.getShip());
        }
        this.dangers = [];
        this.targets = [];
        this.max_danger = 0;
        this.saucer_exists = false;
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
        for (let i = 0; i < this.dangers.length; i++) {
            if (this.dangers[i].danger_level < 1) {
                continue;
            }
            const p = optimizeInWrap((offset) => {
                return Vector.sub(Vector.add(this.ship.position, offset), this.dangers[i].position);
            }, (best, next) => {
                return (best == null || next.mag() < best.mag());
            });
            p.normalize();
            p.mul(this.dangers[i].danger_level);
            p.rotate(-this.ship.angle, new Vector());
            if (p.y < 0) {
                this.flee_values[0] = Math.max(this.flee_values[0], this.C[14] * ((-p.y) ** this.C[15]));
            } else {
                this.flee_values[1] = Math.max(this.flee_values[1], this.C[14] * (p.y ** this.C[15]));
            }
            this.nudge_values[2] = Math.max(this.nudge_values[2], this.C[22] * (Math.abs(p.y) ** this.C[23]));
            if (p.x > 0) {
                this.flee_values[2] = Math.max(this.flee_values[2], this.C[16] * (p.x ** this.C[17]));
                this.nudge_values[0] = Math.max(this.nudge_values[0], this.C[24] * (p.x ** this.C[25]));
                this.nudge_values[1] = Math.max(this.nudge_values[1], this.C[24] * (p.x ** this.C[25]));
            }
            else {
                this.flee_values[3] = Math.max(this.flee_values[3], this.C[18] * ((-p.x) ** this.C[19]));
                this.nudge_values[0] = Math.max(this.nudge_values[0], this.C[20] * ((-p.x) ** this.C[21]));
                this.nudge_values[1] = Math.max(this.nudge_values[1], this.C[20] * ((-p.x) ** this.C[21]));
            }
        }
    }

    //Calculates an ideal location for our ship to be (we will try to go here)
    calculateGoalPosition() {
        for (let i = 0; i < AI.reposition_sample_count; i++) {
            //Calculate the potential goal position
            let distance = this.C[35] + sampleExponentialDistribution(this.C[35]);
            let angle = sampleNormalDistribution(0, this.C[36]);
            let position = Vector.add(this.ship.position, Vector.mul(new Vector(Math.cos(this.ship.angle + angle), Math.sin(-this.ship.angle - angle)), distance));
            wrap(position);
            //Do rough check if this position is dangerous
            if (!this.predictDanger(position)) {
                return position;
            }
        }
    }

    //Get relocation strategy
    getRelocationStrategy(target_relocation = false) {
        if (!target_relocation && this.max_danger < this.C[34]) {
            return [ false, false, false ];
        }
        if (!target_relocation) {
            if (this.goal_position == null || this.getShortestDistance(this.ship.position, this.goal_position)[0] <= this.C[37] || this.predictDanger(this.goal_position)) {
                this.goal_position = this.calculateGoalPosition();
            }
        } else {
            let min_distance = Infinity;
            let new_goal_position = null;
            for (let i = 0; i < this.targets.length; i++) {
                let distance = this.getShortestDistance(this.targets[i].position, this.ship.position)[0];
                if (distance < min_distance) {
                    min_distance = distance;
                    new_goal_position = this.targets[i].position.copy();
                }
            }
            this.goal_position = new_goal_position;
        }
        if (this.goal_position == null) {
            return [ false, false, false ];
        }
        let wrapped_ship_position = this.getShortestDistance(this.ship.position, this.goal_position)[1];
        let goal_angle = -Vector.sub(this.goal_position, wrapped_ship_position).angle();
        while (goal_angle < 0) {
            goal_angle += Math.PI * 2;
        }
        let goal_movements = [ false, false, false ];
        if (goal_angle > this.ship.angle) {
            if (goal_angle - this.ship.angle < this.ship.angle + Math.PI * 2 - goal_angle) {
                goal_movements[0] = true;
            } else {
                goal_movements[1] = true;
            }
        } else if (goal_angle < this.ship.angle) {
            if (Math.PI * 2 - this.ship.angle + goal_angle < this.ship.angle - goal_angle) {
                goal_movements[0] = true;
            } else {
                goal_movements[1] = true;
            }
        }
        if ((target_relocation && this.ship.velocity.mag() < AI.target_chasing_speed_limit) || this.ship.velocity.mag() < this.C[38]) {
            goal_movements[2] = true;
        }
        return goal_movements;
    }

    //Fleeing strategy
    manageFleeing() {
        this.crosshair = null;
        let goal_movement = this.getRelocationStrategy();
        if ((goal_movement[0] || this.flee_values[0] + this.nudge_values[0] >= 1) && this.flee_values[1] < 1) {
            this.controls.left = true;
        }
        if ((goal_movement[1] || this.flee_values[1] + this.nudge_values[1] >= 1) && this.flee_values[0] < 1) {
            this.controls.right = true;
        }
        if (this.controls.left && this.controls.right) {
            if (goal_movement[0] || this.flee_values[0] >= this.flee_values[1]) {
                this.controls.right = false;
            }
            else {
                this.controls.left = false;
            }
        }
        if ((goal_movement[2] || this.flee_values[2] + this.nudge_values[2] >= 1) && this.flee_values[3] < 1) {
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
        return optimizeInWrap((offset) => {
            p1.add(offset);
            if (Vector.sub(p1, p2).mag() <= r1) {
                return 0;
            }
            const a = (v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2;
            const b = 2 * ((p1.x - p2.x) * (v1.x - v2.x) + (p1.y - p2.y) * (v1.y - v2.y));
            const c = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 - r1 ** 2;
            p1.sub(offset);
            const results = solveQuadratic(a, b, c);
            if (results.length > 0 && results[0] > 0) {
                return results[0];
            } else if (results.length > 1 && results[1] > 0) {
                return results[1];
            }
        }, (best, next) => {
            return (best == null || (next != null && best > next));
        });
    }

    //Predict the future states of objects
    predictStates(step) {
        //Predict ship state
        if (this.controls.left) {
            this.angle += step * this.ship.rotation_speed;
        }
        if (this.controls.right) {
            this.angle -= step * this.ship.rotation_speed;
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
        let not_exists = true;
        for (let i = 0; i < this.targets.length; i++) {
            if (this.targets[i].id == target.id) {
                not_exists = false;
            }
        }
        return not_exists;
    }

    //Finds shortest distance (while considering wrapping) between two vectors
    getShortestDistance(v1, v2) {
        return optimizeInWrap((offset) => {
            let new_v1 = Vector.add(v1, offset);
            return [ Vector.sub(new_v1, v2).mag(), new_v1 ];
        }, (best, next) => {
            return (best == null || next[0] < best[0]);
        });
    }

    //Checks if a bullet will hit a target in current ship state
    checkBulletCollisionTime(target, pessimistic_size = false) {
        return optimizeInWrap((offset) => {
            //Check if there is a bullet collision
            const p1 = Vector.add(target.position, offset);
            const p2 = this.ship.position.copy();
            const direction = new Vector(Math.cos(this.ship.angle), -Math.sin(this.ship.angle));
            direction.mul(this.ship.width / 2 + 5);
            p2.add(direction);
            direction.normalize();
            const v2 = Vector.mul(direction, this.ship.bullet_speed);
            v2.add(this.ship.velocity);
            const v1 = target.velocity;
            let r1;
            if (!pessimistic_size) {
                r1 = target.size;
            } else {
                r1 = target.pessimistic_size;
            }
            const result = this.findCirclePointCollision(p1, v1, r1, p2, v2);
            if (result >= this.ship.bullet_life - 1 || (target.size > 0 && target.size < 3 && Vector.add(p1, Vector.mul(v1, result)) - target.size < this.C[26])) {
                return null;
            }
            return result;
        }, (best, next) => {
            return (best == null || (next != null && best > next));
        });
    }

    //Checks if shooting an object will cause collateral damage
    checkCollateralDamage(target) {
        for (let i = 0; i < this.targets.length; i++) {
            const result = this.checkBulletCollisionTime(this.targets[i], true);
            if (result != null && !Object.is(target, this.targets[i])) {
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
        let extra_size_groups = [ 0, 0 ];
        for (let i = 0; i < this.markers.length; i++) {
            if (this.markers[i].size == 2) {
                extra_size_groups[1] += 2;
            } else if (this.markers[i].size == 1) {
                extra_size_groups[0] += 2;
            }
        }
        if (target.size_index == 1) {
            if (this.size_groups[0] + extra_size_groups[0] == 0) {
                return false;
            }
            if (this.size_groups[0] + extra_size_groups[0] + 2 > this.C[27]) {
                return true;
            }
            if (this.size_groups[0] + extra_size_groups[0] + this.size_groups[1] + extra_size_groups[1] + 1 > this.C[28]) {
                return true;
            }
        } else if (target.size_index == 2) {
            if (this.size_groups[0] + extra_size_groups[0] + this.size_groups[1] + extra_size_groups[1] + 2 > this.C[28]) {
                return true;
            }
        }
        return false;
    }

    //Checks if you should shoot with current object position
    checkShootingOpportunity() {
        let destroyed = null;
        let min_time = Infinity;
        for (let i = 0; i < this.targets.length; i++) {
            if (this.targets[i].size_index < 3 && this.targets[i].invincibility > 0) {
                continue;
            }
            const result = this.checkBulletCollisionTime(this.targets[i]);
            if (result != null && result < min_time) {
                destroyed = this.targets[i];
                min_time = result;
            }
        }
        if (destroyed != null && (this.targetMarked(destroyed) || this.checkCollateralDamage(destroyed) || this.checkClutterViolation(destroyed))) {
            return [ null, Infinity ];
        }
        return [ destroyed, min_time ];
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

    //Updates the crosshair
    updateCrosshair() {
        if (this.crosshair != null) {
            for (let i = 0; i < this.targets.length; i++) {
                if (this.targets[i].id == this.crosshair.id) {
                    this.crosshair.position = this.targets[i].position.copy();
                    break;
                }
            }
        }
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
            let target = null;
            let aim_angle = null;
            let iterations = 0;
            this.predictStates(delay);
            while (angle_offset <= Math.PI) {
                //Check if we rotate left
                this.ship.angle += angle_offset;
                while (this.ship.angle >= Math.PI * 2) {
                    this.ship.angle -= Math.PI * 2;
                }
                let result = this.checkShootingOpportunity();
                if (result[0] != null) {
                    target = result[0];
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
                if (result[0] != null) {
                    target = result[0];
                    this.ship.angle += angle_offset;
                    aim_angle = this.ship.angle - angle_offset;
                    break;
                }
                this.ship.angle += angle_offset;
                angle_offset += this.ship.rotation_speed * AI.rotation_precision;
                this.predictStates(AI.rotation_precision);
                iterations++;
            }
            this.predictStates(-(AI.rotation_precision + delay) * iterations);
            if (target != null) {
                this.crosshair = new Crosshair(target, aim_angle);
            } else {
                this.goal_movements = this.getRelocationStrategy(true);
                if (this.goal_movements[0]) {
                    this.controls.left = true;
                } else if (this.goal_movements[1]) {
                    this.controls.right = true;
                }
                if (this.goal_movements[2]) {
                    this.controls.forward = true;
                }
                this.goal_position = null;
            }
        }
        //Actually rotate towards the target
        if (this.crosshair == null) {
            return;
        }
        this.updateCrosshair();
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
        if (Math.min(time_left, time_right) > 0) {
            if (time_left <= time_right) {
                this.controls.left = true;
            } else {
                this.controls.right = true;
            }
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
            this.goal_position = null;
            this.manageAim(delay);
        }
        this.generateVirtualEntities();
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
        this.updateCrosshair();
        runInWrap((offset) => {
            ctx.translate(offset.x, offset.y);
            AIDebug.drawDangerRadius(this.ship);
            AIDebug.drawTargetMinDistance(this.ship);
            AIDebug.drawRepositionDistribution(this.ship);
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
            if (this.goal_position != null) {
                AIDebug.drawGoalPosition(this.goal_position);
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