class VirtualShip {

    constructor(ship) {
        this.position = ship.position.copy();
        this.angle = ship.angle;
        this.width = ship.width;
        this.bullet_cooldown = ship.bullet_cooldown;
        this.bullet_speed = ship.bullet_speed;
        this.bullet_life = ship.bullet_life;
        this.teleport_buffer = ship.teleport_buffer;
        this.drag_coefficient = ship.drag_coefficient;
        this.velocity = ship.velocity.copy();
        this.teleport_cooldown = ship.teleport_cooldown;
        this.rotation_speed = ship.rotation_speed;
        this.acceleration = ship.acceleration;
        this.size = AI.danger_radius[1];
        this.entity = "s";
    }
    
}

class Danger {

    constructor(item) {
        if (item.entity == "b") this.size = 0;
        else if (item.entity == "p") this.size = 1;
        else if (item.entity == "a") this.size = 2 + item.size;
        else this.size = 5 + item.size;
        this.size = AI.danger_radius[this.size];
        this.position = item.position.copy();
        this.velocity = item.velocity.copy();
        this.danger_level = ai.calculateDanger(this);
        this.entity = "d";
        if (this.danger_level >= 1)
            ai.in_danger = true;
    }

}

class Target {

    constructor(item) {
        this.position = item.position.copy();
        if (item.entity == "a") this.size_index = item.size;
        else this.size_index = item.size + 3;
        this.size = AI.target_radius[this.size_index];
        this.pessimistic_size = AI.pessimistic_radius[this.size_index];
        this.velocity = item.velocity.copy();
        this.reference = item;
        this.entity = "t";
        if (this.size_index == 0 || this.size_index == 1)
            ai.size_groups[this.size_index]++;
    }

}

class Marker {

    constructor(min_time, target) {
        this.life = min_time;
        this.reference = target.reference;
        this.entity = "m";
    }

}

class Crosshair {

    constructor(item, angle) {
        this.reference = item;
        this.angle = angle;
        this.life = Math.PI / ai.ship.rotation_speed;
    }

}

//Allows us to just run a function in the wrapping system
function runInWrap(action) {
    const horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
    const vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
            action(new Vector(horizontal[i], vertical[j]));
}

//Allows us to find the min/max of a function within the border wrapping system
function optimizeInWrap(func, cmp) {
    const horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
    const vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
    let best = null;
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) {
            const value = func(new Vector(horizontal[i], vertical[j]));
            if (cmp(best, value))
                best = value;
        }
    return best;
}

class AI {

    static danger_radius = [ 0, 18, 14, 34, 53, 60, 70 ];
    static pessimistic_radius = [ 14, 34, 53, 27, 32 ];
    static target_radius = [ 5, 17.5, 25, 10, 12 ];
    static rotation_precision = 1;

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
        this.in_danger = false;
        this.dangers = [];
        this.targets = [];
        this.markers = [];
        this.crosshair = null;
        this.ship = null;
        this.flee_values = [ 0, 0, 0, 0 ];
        this.nudge_values = [ 0, 0, 0, 0 ];
        this.size_groups = [ 0, 0 ];
        this.random_aiming_movement_cooldown = this.C[23];
    }

    calculateDanger(danger) {
        return optimizeInWrap((offset) => {
            const p = Vector.sub(Vector.add(danger.position, offset), this.ship.position);
            let result = 0;
            //Add danger velocity term
            const danger_velocity_term = Math.max(0, -p.comp(danger.velocity));
            result += this.C[2] * (danger_velocity_term ** this.C[3]);
            //Add ship velocity term
            const ship_velocity_term = Math.max(0, p.comp(this.ship.velocity));
            result += this.C[4] * (ship_velocity_term ** this.C[5]);
            //Add ship direction term
            let ship_direction_term = new Vector(Math.cos(this.ship.angle), Math.sin(-this.ship.angle));
            ship_direction_term = Math.max(0, p.comp(ship_direction_term));
            result += this.C[6] * (ship_direction_term ** this.C[7]);
            //Add distance term
            let distance_term = 1 / Math.max(1, p.mag() - this.ship.size - danger.size);
            result += this.C[1];
            result *= (distance_term ** this.C[0]);
            return result;
        }, (best, next) => {
            return (best == null || next > best);
        });
    }

    //Generates all virtual entities to use for the game
    generateVirtualEntities() {
        if (!game.title_screen && !game.ship.dead)
            this.ship = new VirtualShip(game.ship);
        this.dangers = [];
        this.targets = [];
        this.in_danger = false;
        this.flee_values = [ 0, 0, 0, 0 ];
        this.size_groups = [ 0, 0 ];
        for (let i = 0; i < game.asteroids.length; i++) {
            this.dangers.push(new Danger(game.asteroids[i]));
            this.targets.push(new Target(game.asteroids[i]));
        }
        for (let i = 0; i < game.saucers.length; i++) {
            this.dangers.push(new Danger(game.saucers[i]));
            this.targets.push(new Target(game.saucers[i]));
        }
        for (let i = 0; i < game.saucer_bullets.length; i++)
            this.dangers.push(new Danger(game.saucer_bullets[i]));
        this.getFleeAndNudgeValues();
    }

    //Creates flee values
    getFleeAndNudgeValues() {
        this.flee_values = [ 0, 0, 0, 0 ];
        this.nudge_values = [ 0, 0, 0, 0 ];
        for (let i = 0; i < this.dangers.length; i++) {
            if (this.dangers[i].danger_level < 1) continue;
            const p = optimizeInWrap((offset) => {
                return Vector.sub(Vector.add(this.ship.position, offset), this.dangers[i].position);
            }, (best, next) => {
                return (best == null || next.mag() < best.mag());
            });
            p.normalize();
            p.mul(this.dangers[i].danger_level);
            p.rotate(-this.ship.angle, new Vector());
            if (p.y < 0)
                this.flee_values[0] += this.C[8] * ((-p.y) ** this.C[9]);
            else
                this.flee_values[1] += this.C[8] * (p.y ** this.C[9]);
            this.nudge_values[2] += this.C[16] * (Math.abs(p.y) ** this.C[17]);
            if (p.x > 0) {
                this.flee_values[2] += this.C[10] * (p.x ** this.C[11]);
                this.nudge_values[0] += this.C[18] * (p.x ** this.C[19]);
                this.nudge_values[1] += this.C[18] * (p.x ** this.C[19]);
            }
            else {
                this.flee_values[3] += this.C[12] * ((-p.x) ** this.C[13]);
                this.nudge_values[0] += this.C[14] * ((-p.x) ** this.C[15]);
                this.nudge_values[1] += this.C[14] * ((-p.x) ** this.C[15]);
            }
        }
        for (let i = 0; i < 4; i++) {
            this.flee_values[i] = Math.min(this.flee_values[i], 1);
            this.nudge_values[i] = Math.min(this.nudge_values[i], 1);
        }
    }

    //Fleeing strategy
    manageFleeing() {
        this.crosshair = null;
        this.random_aiming_movement_cooldown = this.C[23];
        if (this.flee_values[0] + this.nudge_values[0] >= 1 && this.flee_values[1] < 1)
            this.controls.left = true;
        if (this.flee_values[1] + this.nudge_values[1] >= 1 && this.flee_values[0] < 1)
            this.controls.right = true;
        if (this.controls.left && this.controls.right) {
            this.controls.left = this.controls.right = false;
            if (this.flee_values[0] >= this.flee_values[1])
                this.controls.left = true;
            else this.controls.right = true;
        }
        if (this.flee_values[2] + this.nudge_values[2] >= 1 && this.flee_values[3] < 1)
            this.controls.forward = true;
    }

    //Formula for calculating the time it takes for a circle and point to collide (each with a unique constant velocity)
    findCirclePointCollision(p1, v1, r1, p2, v2) {
        return optimizeInWrap((offset) => {
            p1.add(offset);
            if (Vector.sub(p1, p2).mag() <= r1)
                return 0;
            const a = (v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2;
            const b = 2 * ((p1.x - p2.x) * (v1.x - v2.x) + (p1.y - p2.y) * (v1.y - v2.y));
            const c = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 - r1 ** 2;
            p1.sub(offset);
            const results = solveQuadratic(a, b, c);
            if (results.length > 0 && results[0] > 0)
                return results[0];
            else if (results.length > 1 && results[1] > 0)
                return results[1];
        }, (best, next) => {
            return (best == null || (next != null && best > next));
        });
    }

    //Predict the future states of objects
    predictStates(step) {
        //Predict ship state
        if (this.controls.left) this.angle += step * this.ship.rotation_speed;
        if (this.controls.right) this.angle -= step * this.ship.rotation_speed;
        while (this.ship.angle >= Math.PI * 2) this.ship.angle -= Math.PI * 2;
        while (this.ship.angle < 0) this.ship.angle += Math.PI * 2;
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
        for (let i = 0; i < this.markers.length; i++)
            if (Object.is(this.markers[i].reference, target.reference))
                return true;
        let not_exists = true;
        for (let i = 0; i < this.targets.length; i++)
            if (Object.is(this.targets[i].reference, target.reference))
                not_exists = false;
        return not_exists;
    }

    //Finds shortest distance (while considering wrapping) between two vectors
    getShortestDistance(v1, v2) {
        return optimizeInWrap((offset) => {
            return Vector.sub(Vector.add(v1, offset), v2).mag();
        }, (best, next) => {
            return (best == null || next < best);
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
            if (!pessimistic_size) r1 = target.size;
            else r1 = target.pessimistic_size;
            const result = this.findCirclePointCollision(p1, v1, r1, p2, v2);
            if (result >= this.ship.bullet_life - 1 || (target.size > 0 && target.size < 3 && Vector.add(p1, Vector.mul(v1, result)) - target.size < this.C[20])) return null;
            return result;
        }, (best, next) => {
            return (best == null || (next != null && best > next));
        });
    }

    //Checks if shooting an object will cause collateral damage
    checkCollateralDamage(target) {
        for (let i = 0; i < this.targets.length; i++) {
            const result = this.checkBulletCollisionTime(this.targets[i], true);
            if (result != null && Object.is(target, this.targets[i])) return false;
        }
        return true;
    }

    //Checks if destroying the target will violate the clutter optimization rules
    checkClutterViolation(target) {
        if (target.size_index >= 3 || target.size_index == 0) return false;
        let extra_size_groups = [ 0, 0 ];
        for (let i = 0; i < this.markers.length; i++) {
            if (this.markers[i].reference.entity == 'a' && this.markers[i].reference.size == 2) extra_size_groups[1] += 2;
            else if (this.markers[i].reference.entity == 'a' && this.markers[i].reference.size == 1) extra_size_groups[0] += 2;
        }
        if (target.size_index == 1) {
            if (this.size_groups[0] + extra_size_groups[0] == 0) return false;
            if (this.size_groups[0] + extra_size_groups[0] + 2 > this.C[21]) return true;
            if (this.size_groups[0] + extra_size_groups[0] + this.size_groups[1] + extra_size_groups[1] + 1 > this.C[22]) return true;
        } else if (target.size_index == 2) {
            if (this.size_groups[0] + extra_size_groups[0] + this.size_groups[1] + extra_size_groups[1] + 2 > this.C[22]) return true;
        }
        return false;
    }

    //Checks if you should shoot with current object position
    checkShootingOpportunity() {
        let destroyed = null;
        let min_time = Infinity;
        for (let i = 0; i < this.targets.length; i++) {
            const result = this.checkBulletCollisionTime(this.targets[i]);
            if (result != null && result < min_time) {
                destroyed = this.targets[i];
                min_time = result;
            }
        }
        if (destroyed != null && this.targetMarked(destroyed)) return [ null, Infinity ];
        if (destroyed != null && this.checkCollateralDamage(destroyed)) return [ null, Infinity ];
        if (destroyed != null && this.checkClutterViolation(destroyed)) return [ null, Infinity ];
        return [ destroyed, min_time ];
    }

    //Shooting strategy
    manageShooting(delay) {
        if (this.ship.bullet_cooldown < 1) return;
        this.predictStates(delay / settings.game_precision);
        const opportunity = this.checkShootingOpportunity();
        if (opportunity[0] != null) {
            this.controls.fire = true;
            this.markers.push(new Marker(opportunity[1] + 1, opportunity[0]));
        }
    }

    //Updates target markers
    updateMarkers(delay) {
        if (game.ship.dead && game.ship.lives <= 0) {
            this.markers = [];
            return;
        }
        const new_markers = [];
        for (let i = 0; i < this.markers.length; i++) {
            if (!game.paused)
                this.markers[i].life -= delay;
            if (this.markers[i].life > 0)
                new_markers.push(this.markers[i]);
        }
        this.markers = new_markers;
    }

    //Aiming strategy
    manageAim(delay) {
        //Iterate through different angles off from our current angle
        if (this.crosshair != null && (this.targetMarked(this.crosshair) || this.crosshair.life <= 0))
            this.crosshair = null;

        if (this.ship.velocity.mag() < this.C[24])
            this.controls.forward = true;
        
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
                while (this.ship.angle >= Math.PI * 2) this.ship.angle -= Math.PI * 2;
                let result = this.checkShootingOpportunity();
                if (result[0] != null) {
                    target = result[0];
                    this.ship.angle -= angle_offset;
                    aim_angle = this.ship.angle + angle_offset;
                    break;
                }
                //Check if we rotate right
                this.ship.angle -= 2 * angle_offset;
                while (this.ship.angle < 0) this.ship.angle += Math.PI * 2;
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
                this.crosshair = new Crosshair(target.reference, aim_angle);
                this.random_aiming_movement_cooldown = this.C[23];
            }
            else this.random_aiming_movement_cooldown -= delay;
            if (this.random_aiming_movement_cooldown <= 0)
                this.controls.forward = true;
        }
        //Actually rotate towards the target
        if (this.crosshair == null) return;
        const goal_angle = this.crosshair.angle;
        let time_left;
        if (goal_angle >= this.ship.angle) time_left = goal_angle - this.ship.angle;
        else time_left = Math.PI * 2 - this.ship.angle + goal_angle;
        let time_right;
        if (goal_angle <= this.ship.angle) time_right = this.ship.angle - goal_angle;
        else time_right = this.ship.angle + Math.PI * 2 - goal_angle;
        if (time_left <= time_right) this.controls.left = true;
        else this.controls.right = true;
        //Update the crosshair
        if (this.crosshair != null && !game.paused) {
            this.crosshair.life -= delay;
            if (this.crosshair.life <= 0) this.crosshair = null;
        }
    }

    //AI makes decision and applies controls
    update(delay) {
        this.resetControls();
        if (game.title_screen)
            return;
        this.generateVirtualEntities();
        if (this.in_danger) this.manageFleeing();
        else this.manageAim(delay);
        this.generateVirtualEntities();
        this.manageShooting(delay);
        this.updateMarkers(delay);
    }

    //Draws debug info for a specific item
    drawDebugForItem(item) {
        AIDebug.drawDangerRadius(item);
        AIDebug.drawDangerLevel(item);
        if (ai.in_danger) {
            AIDebug.drawFleeValues(item);
            AIDebug.drawNudgeValues(item);
        }
        AIDebug.drawTargetRadius(item);
        AIDebug.drawTargetMinDistance(item);
        AIDebug.drawMarkers(item);
    }

    //AI draws debug info if it wants to
    drawDebug() {
        if (game.title_screen || game.ship.dead)
            return;
        this.generateVirtualEntities();
        runInWrap((offset) => {
            ctx.translate(offset.x, offset.y);
            this.drawDebugForItem(this.ship);
            for (let i = 0; i < this.dangers.length; i++)
                this.drawDebugForItem(this.dangers[i]);
            for (let i = 0; i < this.targets.length; i++)
                this.drawDebugForItem(this.targets[i]);
            for (let i = 0; i < this.markers.length; i++)
                this.drawDebugForItem(this.markers[i]);
            AIDebug.drawCrosshair();
            ctx.translate(-offset.x, -offset.y);
        });
    }

    //AI draws overlay info for debugging
    drawDebugOverlay() {
        if (game.title_screen || game.ship.dead)
            return;
        AIDebug.drawAIData();
    }

    //Resets AI controls
    resetControls() {
        for (let i in this.controls)
            this.controls[i] = false;
    }

    //Applies the AI controls to the actual player
    applyControls() {
        controls.left = this.controls.left;
        controls.right = this.controls.right;
        controls.forward = this.controls.forward;
        controls.fire = this.controls.fire;
    }

}