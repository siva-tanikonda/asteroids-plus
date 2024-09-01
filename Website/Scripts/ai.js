const C_LENGTH = 34;

//Allows us to just run a function in the wrapping system
function runInWrap(action) {
    const horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
    const vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const offset = new Vector(horizontal[i], vertical[j]);
            action(offset);
        }
    }
}

//Virtual ship for AI to use for calculations
class AIShip {

    constructor(ship, target_safety_radius) {
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
        this.size = AI.DANGER_RADIUS[1];
        this.lives = ship.lives;
        this.target_safety_radius = target_safety_radius;
        this.teleport_buffer = ship.teleport_buffer;
        this.flee_values = [ -1, -1, -1, -1 ];
        this.nudge_values = [ -1, -1, -1 ];
    }
    
}

//Danger class for AI to analyze dangers
class AIDanger {

    constructor(danger, size_index, danger_levels) {
        this.size = AI.DANGER_RADIUS[size_index];
        this.position = danger.position.copy();
        this.velocity = danger.velocity.copy();
        this.danger_levels = structuredClone(danger_levels);
        this.entered_x = danger.entered_x;
        this.entered_y = danger.entered_y;
    }

}

//Target class for AI to use for targeting
class AITarget {

    constructor(target, size_index, size) {
        this.position = target.position.copy();
        this.size_index = size_index;
        this.size = size;
        this.pessimistic_size = AI.PESSIMISTIC_RADIUS[size_index];
        this.velocity = target.velocity.copy();
        this.invincibility = target.invincibility;
        this.id = target.id;
        this.entered_x = target.entered_x;
        this.entered_y = target.entered_y;
    }

}

//Marker class for AI to track targets it has shot
class AIMarker {

    constructor(target, life) {
        this.position = target.position.copy();
        this.life = life;
        this.id = target.id;
        this.size_index = target.size_index;
    }

}

//Crosshair class for AI to track target it is aiming
class AICrosshair {

    constructor(id, angle, ship_rotation_speed, position) {
        this.position = position.copy();
        this.id = id;
        this.angle = angle;
        this.life = Math.PI / ship_rotation_speed;
    }

}

class AI {

    //AI constants (unrelated to C)
    static DANGER_RADIUS = [ 0, 18, 14, 34, 53, 60, 70 ];
    static PESSIMISTIC_RADIUS = [ 14, 34, 53, 27, 32 ];
    static ROTATION_PRECISION = 2;
    static RANDOM_WALK_SPEED_LIMIT = 1;
    static RANDOM_WALK_ROTATION_PROBABILITY = 0.1;
    static FLOATING_POINT_COMPENSATION = 2.5;

    //Constructor
    constructor(c, ship) {
        //Control choices of the AI
        this.controls = {
            left: false,
            right: false,
            forward: false,
            fire: false
        };
        //These are constants (that are meant to be optimized through a training algorithm)
        this.c = c;
        //Variables for the AI
        this.max_danger = 0;
        this.dangers = [];
        this.targets = [];
        this.markers = [];
        this.crosshair = null;
        this.flee_values = [ 0, 0, 0, 0 ];
        this.nudge_values = [ 0, 0, 0 ];
        this.size_groups = [ 0, 0 ];
        this.ship = new AIShip(ship, c[26]);
    }

    //Calculates the danger value of a danger
    calculateDangerLevels(danger) {
        const horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        const vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        let results = [];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                let result = 0.0;
                const offset = new Vector(horizontal[i], vertical[j]);
                const p = Vector.sub(Vector.add(danger.position, offset), this.ship.position);
                //Add danger velocity term
                let danger_velocity_term = Math.max(0, -p.comp(danger.velocity));
                result += this.c[2] * (danger_velocity_term ** Math.round(this.c[3]));
                danger_velocity_term = Math.max(0, p.comp(danger.velocity));
                result -= this.c[4] * (danger_velocity_term ** Math.round(this.c[5]));
                //Add ship velocity term
                let ship_velocity_term = Math.max(0, p.comp(this.ship.velocity));
                result += this.c[6] * (ship_velocity_term ** Math.round(this.c[7]));
                ship_velocity_term = Math.max(0, -p.comp(this.ship.velocity));
                result -= this.c[8] * (ship_velocity_term ** Math.round(this.c[9]));
                //Add ship direction term
                let ship_direction_term = new Vector(Math.cos(this.ship.angle), -Math.sin(this.ship.angle));
                ship_direction_term = Math.max(0, p.comp(ship_direction_term)); 
                result += this.c[10] * (ship_direction_term ** Math.round(this.c[11]));
                ship_direction_term = new Vector(Math.cos(this.ship.angle), -Math.sin(this.ship.angle));
                ship_direction_term = Math.max(0, -p.comp(ship_direction_term)); 
                result -= this.c[12] * (ship_direction_term ** Math.round(this.c[13]));
                //Add distance term
                let distance_term = 1 / Math.max(1, p.mag() - this.ship.size - danger.size);
                result += this.c[1];
                result *= distance_term ** Math.round(this.c[0]);
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
            this.ship = new AIShip(game.getAIShipData(), this.c[26]);
        }
        this.dangers = [];
        this.targets = [];
        this.max_danger = 0;
        this.flee_values = [ 0, 0, 0, 0 ];
        this.nudge_values = [ 0, 0, 0 ];
        this.size_groups = [ 0, 0 ];
        let asteroids_data = game.getAIAsteroidsData();
        for (let i = 0; i < asteroids_data.length; i++) {
            if (asteroids_data[i].size == 0 || asteroids_data[i].size == 1) {
                this.size_groups[asteroids_data[i].size]++;
            }
            const danger_levels = this.calculateDangerLevels(asteroids_data[i]);
            this.dangers.push(new AIDanger(asteroids_data[i], 2 + asteroids_data[i].size, danger_levels));
            this.targets.push(new AITarget(asteroids_data[i], asteroids_data[i].size, this.c[29 + asteroids_data[i].size]));
        }
        let saucers_data = game.getAISaucersData();
        for (let i = 0; i < saucers_data.length; i++) {
            const danger_levels = this.calculateDangerLevels(saucers_data[i]);
            this.dangers.push(new AIDanger(saucers_data[i], 5 + saucers_data[i].size, danger_levels));
            this.targets.push(new AITarget(saucers_data[i], 3 + saucers_data[i].size, this.c[32 + saucers_data[i].size]));
        }
        let saucer_bullets_data = game.getAISaucerBulletsData();
        for (let i = 0; i < saucer_bullets_data.length; i++) {
            const danger_levels = this.calculateDangerLevels(saucer_bullets_data[i]);
            this.dangers.push(new AIDanger(saucer_bullets_data[i], 0, danger_levels));
        }
        for (let i = 0; i < this.markers.length; i++) {
            if (this.markers[i].size_index == 2) {
                this.size_groups[1] += 2;
            } else if (this.markers[i].size_index == 1) {
                this.size_groups[0] += 2;
                this.size_groups[1]--;
            }
        }
    }

    //Creates flee values
    calculateFleeAndNudgeValues() {
        const horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        const vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        for (let k = 0; k < this.dangers.length; k++) {
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    if (this.dangers[k].danger_levels[i * 3 + j] < 1) {
                        continue;
                    }
                    const offset = new Vector(horizontal[i], vertical[j]);
                    const p = Vector.sub(this.ship.position, Vector.add(this.dangers[k].position, offset));
                    p.normalize();
                    p.mul(this.dangers[k].danger_levels[i * 3 + j]);
                    p.rotate(-this.ship.angle, new Vector());
                    if (p.y < 0) {
                        this.flee_values[0] = Math.max(this.flee_values[0], this.c[14] * ((-p.y) ** Math.round(this.c[15])));
                    } else {
                        this.flee_values[1] = Math.max(this.flee_values[1], this.c[14] * (p.y ** Math.round(this.c[15])));
                    }
                    this.nudge_values[2] = Math.max(this.nudge_values[2], this.c[24] * (Math.abs(p.y) * Math.round(this.c[25])));
                    if (p.x > 0) {
                        this.flee_values[2] = Math.max(this.flee_values[2], this.c[16] * (p.x ** Math.round(this.c[17])));
                        this.nudge_values[0] = Math.max(this.nudge_values[0], this.c[22] * (p.x ** Math.round(this.c[23])));
                        this.nudge_values[1] = Math.max(this.nudge_values[1], this.c[22] * (p.x ** Math.round(this.c[23])));
                    } else {
                        p.x *= -1;
                        this.flee_values[3] = Math.max(this.flee_values[3], this.c[18] * (p.x ** Math.round(this.c[19])));
                        this.nudge_values[0] = Math.max(this.nudge_values[0], this.c[20] * (p.x ** Math.round(this.c[21])));
                        this.nudge_values[1] = Math.max(this.nudge_values[1], this.c[20] * (p.x ** Math.round(this.c[21])));
                    }
                }
            }
        }
        this.ship.flee_values = structuredClone(this.flee_values);
        this.ship.nudge_values = structuredClone(this.nudge_values);
    }

    //Fleeing strategy
    manageFleeing() {
        this.crosshair = null;
        this.calculateFleeAndNudgeValues();
        if (this.flee_values[0] + this.nudge_values[0] >= 1 && this.flee_values[1] < 1) {
            this.controls.left = true;
        }
        if (this.flee_values[1] + this.nudge_values[1] >= 1 && this.flee_values[0] < 1) {
            this.controls.right = true;
        }
        if (this.controls.left && this.controls.right) {
            if (this.flee_values[0] >= this.flee_values[1]) {
                this.controls.right = false;
            } else {
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
    calculateCirclePointCollisionTime(p1, v1, r1, p2, v2) {
        const horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        const vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        let vd = Vector.sub(v2, v1);
        let min_time = Infinity;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const offset = new Vector(horizontal[i], vertical[j]);
                const pd = Vector.sub(p2, Vector.add(p1, offset));
                if (pd.mag() <= r1) {
                    return 0;
                }
                const a = vd.x * vd.x + vd.y * vd.y;
                const b = 2 * (pd.x * vd.x + pd.y * vd.y);
                const c = pd.x * pd.x + pd.y * pd.y - r1 * r1;
                const results = solveQuadratic(a, b, c);
                if (results.length > 0 && results[0] > 0) {
                    min_time = Math.min(min_time, results[0]);
                } else if (results.length > 1 && results[1] > 0) {
                    min_time = Math.min(min_time, results[1]);
                }
            }
        }
        return min_time;
    }

    //Checks if a bullet will hit a target in current ship state and state where it will hit the target
    calculateBulletCollisionTime(target, pessimistic_size = false, aiming = false) {
        //Check if there is a bullet collision
        const p1 = target.position.copy();
        const v1 = target.velocity.copy();
        const p2 = this.ship.position.copy();
        const ship_direction = new Vector(Math.cos(this.ship.angle), -Math.sin(this.ship.angle));
        ship_direction.mul(this.ship.width / 2 + 5);
        p2.add(ship_direction);
        ship_direction.normalize();
        wrap(p2);
        const v2 = Vector.mul(ship_direction, this.ship.bullet_speed);
        v2.add(this.ship.velocity);
        let r1;
        if (!pessimistic_size) {
            r1 = target.size;
        } else {
            r1 = target.pessimistic_size;
        }
        if (aiming) {
            r1 = Math.max(0, r1);
        }
        const result = this.calculateCirclePointCollisionTime(p1, v1, r1, p2, v2);
        if (result >= this.ship.bullet_life) {
            return [ Infinity, new Vector() ];
        }
        if (target.size_index > 0 && target.size_index < 3) {
            let explosion_location = Vector.add(p1, Vector.mul(v1, result));
            wrap(explosion_location);
            const horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
            const vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    const offset = new Vector(horizontal[i], vertical[j]);
                    if (Vector.sub(Vector.add(explosion_location, offset), this.ship.position).mag() < this.c[26]) {
                        return [ Infinity, new Vector() ];
                    }
                }
            }
        }
        const collision_location = Vector.add(p2, Vector.mul(v2, result));
        return [ result, collision_location ];
    }

    //Checks if shooting an object will cause collateral damage
    predictCollateralDamage(target, collision_time) {
        for (let i = 0; i < this.targets.length; i++) {
            if (target.id == this.targets[i].id) {
                continue;
            }
            const result = this.calculateBulletCollisionTime(this.targets[i], true);
            if (result[0] < collision_time) {
                return true;
            }
        }
        return false;
    }

    //Checks if a target has already been marked
    isTargetMarked(id) {
        for (let i = 0; i < this.markers.length; i++) {
            if (this.markers[i].id == id) {
                return true;
            }
        }
        for (let i = 0; i < this.targets.length; i++) {
            if (this.targets[i].id == id) {
                return false;
            }
        }
        return true;
    }

    //Checks if destroying the target will violate the clutter optimization rules
    predictClutterViolation(target) {
        if (target.size_index >= 3 || target.size_index == 0) {
            return false;
        }
        if (target.size_index == 1) {
            if (this.size_groups[0] == 0) {
                return false;
            }
            if (this.size_groups[0] + 2 > this.c[27] || this.size_groups[0] + this.size_groups[1] + 1 > this.c[28]) {
                return true;
            }
        } else if (target.size_index == 2) {
            if (this.size_groups[0] + this.size_groups[1] == 0) {
                return false;
            }
            if (this.size_groups[0] + this.size_groups[1] + 2 > this.c[28]) {
                return true;
            }
        }
        return false;
    }

    //Checks if you should shoot with current object position
    generateFiringOpportunity(aiming = false) {
        let destroyed = null;
        let collision_location = null;
        let min_time = Infinity;
        for (let i = 0; i < this.targets.length; i++) {
            if (this.targets[i].invincibility > 0) {
                continue;
            }
            const result = this.calculateBulletCollisionTime(this.targets[i], false, aiming);
            if (result[0] < min_time) {
                destroyed = this.targets[i];
                min_time = result[0];
                collision_location = result[1];
            }
        }
        if (min_time != Infinity && (this.isTargetMarked(destroyed.id) || this.predictCollateralDamage(destroyed, min_time) || this.predictClutterViolation(destroyed))) {
            return [ null, Infinity, collision_location ];
        }
        return [ destroyed, min_time, collision_location ];
    }

    //Shooting strategy
    manageFiring(delay) {
        if (this.ship.bullet_cooldown < 1) {
            return;
        }
        const opportunity = this.generateFiringOpportunity();
        if (opportunity[0] != null) {
            this.controls.fire = true;
            const new_marker = new AIMarker(opportunity[0], opportunity[1] + AI.FLOATING_POINT_COMPENSATION);
            if (new_marker.size_index == 2) {
                this.size_groups[1] += 2;
            } else if (new_marker.size_index == 1) {
                this.size_groups[0] += 2;
                this.size_groups[1]--;
            }
            this.markers.push(new_marker);
            this.crosshair = null;
        }
    }

    //Updates target markers
    updateMarkers(delay) {
        if (this.ship.lives <= 0) {
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

    //Predict the future states of objects
    predictEntityStates(delay) {
        //Predict ship state
        if (this.controls.left) {
            this.ship.angle += delay * this.ship.rotation_speed;
        }
        if (this.controls.right) {
            this.ship.angle -= delay * this.ship.rotation_speed;
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
            this.ship.velocity.add(Vector.mul(ship_direction, delay));
        }
        const ship_initial_velocity = this.ship.velocity.copy();
        this.ship.velocity.mul(1 / (Math.exp(this.ship.drag_coefficient * delay)));
        this.ship.position = Vector.div(Vector.add(Vector.mul(this.ship.position, this.ship.drag_coefficient), Vector.sub(ship_initial_velocity, this.ship.velocity)), this.ship.drag_coefficient);
        wrap(this.ship.position);
        //Progress target positions
        for (let i = 0; i < this.targets.length; i++) {
            this.targets[i].position.add(Vector.mul(this.targets[i].velocity, delay));
            wrap(this.targets[i].position);
        }
    }

    generateAimTarget(delay) {
        let angle_offset = 0;
        let target = null;
        let collision_time = null;
        let aim_angle = null;
        let collision_location = null;
        let found_target = false;
        let first_iteration = true;
        this.predictEntityStates(delay / config.game_precision);
        while (angle_offset <= Math.PI) {
            this.ship.angle += angle_offset;
            while (this.ship.angle >= Math.PI * 2) {
                this.ship.angle -= Math.PI * 2;
            }
            let opportunity = this.generateFiringOpportunity(true);
            target = opportunity[0];
            collision_time = opportunity[1];
            collision_location = opportunity[2];
            if (collision_time != Infinity) {
                found_target = true;
                aim_angle = this.ship.angle;
                this.ship.angle -= angle_offset;
                while (this.ship.angle < 0) {
                    this.ship.angle += Math.PI * 2;
                }
                break;
            }
            this.ship.angle -= 2 * angle_offset;
            while (this.ship.angle < 0) {
                this.ship.angle += Math.PI * 2;
            }
            opportunity = this.generateFiringOpportunity(true);
            target = opportunity[0];
            collision_time = opportunity[1];
            collision_location = opportunity[2];
            if (collision_time != Infinity) {
                found_target = true;
                aim_angle = this.ship.angle;
                this.ship.angle += angle_offset;
                while (this.ship.angle >= Math.PI * 2) {
                    this.ship.angle -= Math.PI * 2;
                }
                break;
            }
            this.ship.angle += angle_offset;
            angle_offset += this.ship.rotation_speed / AI.ROTATION_PRECISION;
            if (first_iteration) {
                this.predictEntityStates(Math.max(0, 1 / AI.ROTATION_PRECISION - delay / config.game_precision));
                first_iteration = false;
            } else {
                this.predictEntityStates(1 / AI.ROTATION_PRECISION);
            }
        }
        this.generateVirtualEntities();
        if (found_target) {
            return new AICrosshair(target.id, aim_angle, this.ship.rotation_speed, collision_location);
        }
        return null;
    }

    //Aiming strategy
    manageAim(delay) {
        //Iterate through different angles off from our current angle
        if (this.crosshair != null && (this.isTargetMarked(this.crosshair.id) || this.crosshair.life <= 0)) {
            this.crosshair = null;
        }
        
        //Pick a new target if no current target
        if (this.crosshair == null) {
            this.crosshair = this.generateAimTarget(delay);
        }
        //Actually rotate towards the target
        if (this.crosshair == null) {
            let rotation_choice = Math.random();
            if (rotation_choice <= AI.RANDOM_WALK_ROTATION_PROBABILITY) {
                this.controls.left = true;
            }
            if (this.ship.velocity.mag() < AI.RANDOM_WALK_SPEED_LIMIT) {
                this.controls.forward = true;
            }
            return;
        }
        let time_left = this.crosshair.angle - this.ship.angle;
        while (time_left < 0) {
            time_left += Math.PI * 2;
        }
        let time_right = this.ship.angle - this.crosshair.angle;
        while (time_right < 0) {
            time_right += Math.PI * 2;
        }
        if (time_left < time_right) {
            this.controls.left = true;
        } else {
            this.controls.right = true;
        }
        this.crosshair.life -= delay;
        //Update the crosshair
        if (this.crosshair.life <= 0) {
            this.crosshair = null;
        }
    }

    resetControls() {
        this.controls = {
            left: false,
            right: false,
            forward: false,
            fire: false
        };
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
        if (this.ship.lives > 0) {
            if (this.max_danger >= 1) {
                this.manageFleeing();
            } else {
                this.manageAim(delay);
            }
            this.predictEntityStates(delay / config.game_precision);
            this.manageFiring(delay);
            this.updateMarkers(delay);
        }
    }

    //AI draws debug info if it wants to
    drawDebug() {
        if (game.getTitleScreen() || game.isShipDead()) {
            return;
        }
        this.generateVirtualEntities();
        if (this.max_danger >= 1) {
            this.calculateFleeAndNudgeValues();
        }
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

    //Applies the AI controls to the actual player
    applyControls() {
        controls.left = this.controls.left;
        controls.right = this.controls.right;
        controls.forward = this.controls.forward;
        controls.fire = this.controls.fire;
    }

}