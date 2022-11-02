//Constants that are used in the ai's heuristic algorithm
var ai_constants = {
    danger_radius: [ 20, 35, 70 ],
    danger_distance_weight: 2.5e4,
    danger_danger_velocity_weight: 1e-2,
    danger_ship_front_velocity_weight: 2e-2,
    danger_ship_rear_velocity_weight: 1e-2,
    target_radius: [ 10, 17.5, 30 ],
    target_min_distance: 150
};

class Target {
    constructor(target) {
        this.type = (target.hasOwnProperty("fire_rate")) ? "s" : "a";
        this.position = target.position.copy();
        this.size = target.size;
        this.velocity = target.velocity.copy();
        this.pointer = target;
        if (this.type == 'a') {
            this.group = this.size;
            ai.groups[this.size]++;
        } else {
            this.group = 3;
            ai.groups[3]++;
        }
    }
}

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
    }
}

class Danger {
    constructor(target) {
        this.type = (target.hasOwnProperty("fire_rate")) ? "s" : "a";
        this.position = target.position.copy();
        if (target.hasOwnProperty("size"))
            this.size = target.size;
        this.velocity = target.velocity.copy();
        this.danger_level = ai.calculateDangerLevel(this);
        if (this.danger_level >= 0.5)
            ai.in_danger = true;
    }
}

class HitTracker {
    constructor(pointer, time) {
        this.pointer = pointer;
        this.time = time;
    }
}

class AI {

    constructor() {
        this.controls = {
            left: false,
            right: false,
            forward: false,
            teleport: false,
            fire: false
        };
        this.targets = [];
        this.dangers = [];
        this.flee_values = [];
        this.ship = null;
        this.attacked_targets = {};
        this.in_danger = false;
        this.groups = [ 0, 0, 0, 0 ];
    }
    
    //Allows us to just run a function in the wrapping system
    runInWrap(func) {
        var horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        var vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        for (var i = 0; i < 3; i++)
            for (var j = 0; j < 3; j++)
                func(new Vector(horizontal[i], vertical[j]));
    }

    //Allows us to find the min/max of a function within the border wrapping system
    optimizeInWrap(func, cmp) {
        var horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        var vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        var best = null;
        for (var i = 0; i < 3; i++)
            for (var j = 0; j < 3; j++) {
                var value = func(new Vector(horizontal[i], vertical[j]));
                if (cmp(best, value))
                    best = value;
            }
        return best;
    }

    //Calculates the danger level of a particular danger (asteroid, saucer, or saucer bullet)
    //This is primary method of classifying what targets to care about vs. which ones to not care about
    calculateDangerLevel(danger) {
        return this.optimizeInWrap((offset) => {
            var r = Vector.sub(this.ship.position, Vector.add(danger.position, offset));
            var value = r.mag();
            if (danger.hasOwnProperty("size"))
                value = Math.max(1, value - ai_constants.danger_radius[danger.size]);
            var value = (1 / (r.mag() ** 2)) * ai_constants.danger_distance_weight;
            value += ai_constants.danger_danger_velocity_weight * Vector.proj_val(r, danger.velocity);
            var ship_velocity_factor = Vector.proj_val(Vector.mul(r, -1), this.ship.velocity);
            if (ship_velocity_factor > 0)
                ship_velocity_factor *= ai_constants.danger_ship_front_velocity_weight;
            else
                ship_velocity_factor *= ai_constants.danger_ship_rear_velocity_weight;
            value += ship_velocity_factor;
            value = sigmoid(value) * 2 - 1;
            return value;
        }, (best, next) => {
            return (best == null || next > best);
        });
    }

    //Calculates how long it will take for two circles to collide (or if they will never collide)
    findCircleCollisionTime(p1, v1, r1, p2, v2, r2) {
        return this.optimizeInWrap((offset) => {
            p1.add(offset);
            if (Vector.sub(p1, p2).mag() <= r1 + r2)
                return 0;
            var a = (v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2;
            var b = 2 * ((p1.x - p2.x) * (v1.x - v2.x) + (p1.y - p2.y) * (v1.y - v2.y));
            var c = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 - (r1 + r2) ** 2;
            p1.sub(offset);
            var results = solveQuadratic(a, b, c);
            if (results.length > 0 && results[0] > 0)
                return results[0];
            else if (results.length > 1 && results[1] > 0)
                return results[1];
        }, (best, next) => {
            return (best == null || (next != null && best > next));
        });
    }

    //Find future position of a ship assuming no more thrust applied
    findFutureShipPosition(time) {
        var initial_velocity = this.ship.velocity.copy();
        var velocity = Vector.mul(this.ship.velocity, 1 / (Math.E ** (this.ship.drag_coefficient * time)));
        var position = Vector.div(Vector.add(Vector.mul(this.ship.position, this.ship.drag_coefficient), Vector.sub(initial_velocity, velocity)), this.ship.drag_coefficient);
        return position
    }

    //Calculate distance between two objects while applying the bounds and wrapping system
    getShortestDistance(a, b) {
        return this.optimizeInWrap((offset) => {
            a.add(offset);
            var distance = Vector.dist(a, b);
            a.sub(offset);
            return distance;
        }, (best, next) => {
            return (best == null || (next != null && next < best));
        });
    }

    //Checks if there are already targets of smaller sizes available to shoot
    checkForbiddenGroup(target) {
        if (target.group == 3) return false;
        var earlier_empty = false;
        for (var i = 0; i < target.group; i++)
            if (this.groups[i] > 0) earlier_empty = true;
        return earlier_empty;
    }

    //Calculate the bullet collision time assuming you are trying to hit a certain target
    findBulletCollisionTime(target, pessimistic_bounds = false) {
        return this.optimizeInWrap((offset) => {
            this.ship.position.add(offset);
            var direction = new Vector(Math.cos(this.ship.angle), -Math.sin(this.ship.angle));
            direction.mul(this.ship.width / 2 + 5);
            var bullet_position = Vector.add(direction, this.ship.position);
            direction.norm();
            var bullet_velocity = Vector.mul(direction, this.ship.bullet_speed);
            bullet_velocity.add(this.ship.velocity);
            this.ship.position.sub(offset);
            var size = ai_constants.target_radius[target.size];
            if (pessimistic_bounds)
                size = ai_constants.danger_radius[target.size];
            return this.findCircleCollisionTime(bullet_position, bullet_velocity, 0, target.position, target.velocity, size);
        }, (best, next) => {
            return (best == null || (next != null && next < best));
        });
    }

    //Update the statuses of the kill confirms
    updateAttackedTargets(delay) {
        var keys = Object.keys(this.attacked_targets);
        for (var i = 0; i < keys.length; i++) {
            var tracked = this.attacked_targets[keys[i]];
            var in_targets = false;
            for (var j = 0; j < this.targets.length; j++)
                if (Object.is(this.targets[j].pointer, tracked.pointer))
                    in_targets = true;
            if (!in_targets) {
                delete this.attacked_targets[keys[i]];
                continue;
            }
            tracked.time -= delay;
            if (tracked.pointer.hasOwnProperty("fire_rate"))
                this.groups[3]--;
            else if (tracked.pointer.size > 0) {
                this.groups[tracked.pointer.size]--;
                this.groups[tracked.pointer.size - 1] += 2;
            }
            if (tracked.time <= 0)
                delete this.attacked_targets[keys[i]];
        }
    }

    //Checks if there's a chance of collateral damage with certain target being fired at
    checkCollateralDamage(target) {
        var collision_time = this.findBulletCollisionTime(target);
        for (var i = 0; i < this.targets.length; i++) {
            if (Object.is(this.targets[i], target)) continue;
            if (this.findBulletCollisionTime(this.targets[i], true) < collision_time && this.checkForbiddenGroup(this.targets[i]))
                return true;
        }
        return false;
    }

    //Calculate if we should or should not shoot at current angle and position
    manageFire(delay) {

        if (this.ship.bullet_cooldown < 1 || this.ship.teleport_buffer > 0 || this.controls.teleport)
            return;

        this.simulateMove(delay);

        var casualty = null;
        var min_time = Infinity;
        for (var i = 0; i < this.targets.length; i++) {
            var execution_time = this.findBulletCollisionTime(this.targets[i]);
            if (execution_time == null || execution_time > this.ship.bullet_life) continue;
            var future_ship_position = this.findFutureShipPosition(execution_time);
            var future_target_position = Vector.add(this.targets[i].position, Vector.mul(this.targets[i].velocity, execution_time));
            var shortest_distance = this.getShortestDistance(future_ship_position, future_target_position);
            if (shortest_distance - ai_constants.danger_radius[this.targets[i].size] < ai_constants.target_min_distance && this.targets[i].size > 0 && this.targets[i].type == 'a') continue;
            if (min_time > execution_time) {
                casualty = this.targets[i];
                min_time = execution_time;
            }
        }
        if (casualty != null && !(casualty.pointer in this.attacked_targets) && !this.checkForbiddenGroup(casualty) && !this.checkCollateralDamage(casualty)) {
            this.controls.fire = true;
            this.attacked_targets[casualty.pointer] = new HitTracker(casualty.pointer, min_time);
        }

    }

    //Calculates the need to go in each of the four directions [forward, left, reverse, right]
    getFleeValues() {
        var values = [ 0, 0, 0, 0 ];
        for (var i = 0; i < this.dangers.length; i++) {
            if (this.dangers[i].danger_level < 0.5) continue;
            var direction = this.optimizeInWrap((offset) => {
                return Vector.sub(Vector.add(this.ship.position, offset), this.dangers[i].position);
            }, (best, next) => {
                return (best == null || next.mag() < best.mag());
            });
            direction.norm();
            direction.mul(this.dangers[i].danger_level);
            direction.rotate(-this.ship.angle, new Vector());
            if (direction.x > 0)
                values[0] += direction.x;
            else 
                values[2] -= direction.x;
            if (direction.y < 0)
                values[1] -= direction.y;
            else
                values[3] += direction.y;
        }
        return values
    }

    //Simulates the ship's future position and angle given what controls the ai has pressed
    simulateMove(delay) {
        if (this.controls.left) {
            this.ship.angle += this.ship.rotation_speed * delay;
            while (this.ship.angle >= Math.PI * 2)
                this.ship.angle -= Math.PI * 2;
        } else if (this.controls.right) {
            this.ship.angle -= this.ship.rotation_speed * delay;
            while (this.ship.angle < 0)
                this.ship.angle += Math.PI * 2;
        }
        var direction = new Vector(Math.cos(this.ship.angle), -Math.sin(this.ship.angle));
        if (this.ship.teleport_buffer == 0 && this.controls.forward) {
            direction.mul(this.ship.acceleration);
            this.ship.velocity.add(Vector.mul(direction, delay));
        }
        this.ship.position = this.findFutureShipPosition(delay);
        wrap(this.ship.position);
    }

    //Decides on the movement of the ship (when in flee mode)
    manageFlee() {
        if (!this.in_danger) return;
        var forward, rear, left, right;
        [forward, left, rear, right] = this.flee_values;
        var dforward = forward >= 0.5;
        var dleft = left >= 0.5;
        var drear = rear >= 0.5;
        var dright = right >= 0.5;

        if (dleft && dright) {
            if (dforward && drear) {
                if (forward >= rear)
                    this.controls.forward = true;
                if (left >= right)
                    this.controls.left = true;
                else
                    this.controls.right = true;
            } else if (dforward) {
                this.controls.forward = true;
            } else if (drear) {
                if (left >= right)
                    this.controls.left = true;
                else
                    this.controls.right = true;
            } else {
                this.controls.forward = true;
            }
        } else if (dleft) {
            if (dforward && drear)
                this.controls.left = true;
            else if (dforward)
                this.controls.forward = this.controls.left = true;
            else if (drear) {
                this.controls.left = true;
            }
            else {
                if (forward >= rear)
                    this.controls.forward = true;
                this.controls.left = true;
            }
        } else if (dright) {
            if (dforward && drear)
                this.controls.right = true;
            else if (dforward)
                this.controls.forward = this.controls.right = true;
            else if (rear)
                this.controls.right = true;
            else {
                if (forward >= rear)
                    this.controls.forward = true;
                this.controls.right = true;
            }
        } else {
            if (dforward && drear) {
                if (forward >= rear)
                    this.controls.forward = true;
                if (left >= right)
                    this.controls.left = true;
                else
                    this.controls.right = true;
            } else if (dforward) {
                this.controls.forward = true;
                if (left >= right)
                    this.controls.left = true;
                else
                    this.controls.right = true;
            } else if (drear) {
                if (left >= right)
                    this.controls.left = true;
                else
                    this.controls.right = true;
            } else {
                if (forward >= rear)
                    this.controls.forward = true;
                if (left >= right)
                    this.controls.left = true;
                else
                    this.controls.right = true;
            }
        }
    }

    //Decides on the best target to aim at
    findBestTarget() {
        var target = null;
        var highest_danger_level = 0;
        for (var i = 0; i < this.targets.length; i++) {
            if (this.targets[i].pointer in this.attacked_targets || this.checkForbiddenGroup(this.targets[i]) || this.getShortestDistance(this.ship.position, this.targets[i].position) < ai_constants.target_min_distance)
                continue;
            var danger_level = this.calculateDangerLevel(this.targets[i]);
            if (highest_danger_level < danger_level) {
                target = this.targets[i];
                highest_danger_level = danger_level;
            }
        }
        return target;
    }

    //Decides on aiming of the ship (when in aim mode)
    manageAim(delay) {
        var most_dangerous = this.findBestTarget();
        if (most_dangerous == null) return;
        var old_angle = this.ship.angle;
        var old_position = this.ship.position.copy();
        var time = 1;
        var best_rotation = 0;
        var best_time = Infinity;
        var collision_time = this.findBulletCollisionTime(most_dangerous);
        if (collision_time != null && collision_time * this.ship.bullet_speed >= this.ship.target_min_distance) {
            if (collision_time < best_time) {
                best_rotation = 0;
                best_time = collision_time;
            }
        }
        while (time * this.ship.rotation_speed <= Math.PI) {
            this.ship.position = this.findFutureShipPosition(time);
            this.ship.angle = old_angle + time * this.ship.rotation_speed;
            while (this.ship.angle >= Math.PI * 2)
                this.ship.angle -= Math.PI * 2;
            collision_time = this.findBulletCollisionTime(most_dangerous);
            if (collision_time != null) {
                if (time + collision_time < best_time) {
                    best_rotation = 1;
                    best_time = time + collision_time;
                }
            }
            this.ship.angle = old_angle - time * this.ship.rotation_speed;
            while (this.ship.angle < 0)
                this.ship.angle += Math.PI * 2;
            collision_time = this.findBulletCollisionTime(most_dangerous);
            if (collision_time != null) {
                if (time + collision_time < best_time) {
                    best_rotation = -1;
                    best_time = time + collision_time;
                }
            }
            time++;
        }
        this.ship.angle = old_angle;
        this.ship.position = old_position;
        if (best_rotation == 1) {
            this.controls.left = true;
            this.ship.angle += this.ship.rotation_speed * delay;
            while (this.ship.angle >= Math.PI * 2)
                this.ship.angle -= Math.PI * 2;
        }
        else if (best_rotation == -1) {
            this.controls.right = true;
            this.ship.angle -= this.ship.rotation_speed * delay;
            while (this.ship.angle < 0)
                this.ship.angle += Math.PI * 2;
        }
    }

    //Just the update function for the ai
    update(delay) {
        
        //Setup virtual targets and reset controls
        this.controls.left = this.controls.right = this.controls.forward = this.controls.teleport = this.controls.fire = false;
        this.in_danger = false;
        this.targets = [];
        this.dangers = [];
        this.groups = [ 0, 0, 0, 0 ];
        this.ship = new VirtualShip(game.ship);
        for (var i = 0; i < game.asteroids.length; i++) {
            this.targets.push(new Target(game.asteroids[i]));
            this.dangers.push(new Danger(game.asteroids[i]));
        }
        for (var i = 0; i < game.saucers.length; i++) {
            this.targets.push(new Target(game.saucers[i]));
            this.dangers.push(new Danger(game.saucers[i]));
        }
        for (var i = 0; i < game.saucer_bullets.length; i++)
            this.dangers.push(new Danger(game.saucer_bullets[i]));
        this.flee_values = this.getFleeValues();
        this.updateAttackedTargets(delay);
        
        //The ai actions
        if (this.in_danger)
            this.manageFlee(delay);
        else
            this.manageAim(delay);
        this.manageFire(delay);

    }

    //Draws the debug info for a specific entity
    drawDebugForItem(item) {
        if (settings.show_ai_debug) {
            Debug.drawTargetRadius(item);
            Debug.drawDangerRadius(item);
            Debug.drawTargetMinDistance(item);
            Debug.drawDangerLevel(item);
            Debug.drawDangerFlee(item);
        }
    }

    //Draws all debug info for the ai
    drawDebug() {
        this.runInWrap((offset) => {
            ctx.translate(offset.x, offset.y);
            for (var i = 0; i < game.asteroids.length; i++)
                this.drawDebugForItem(game.asteroids[i]);
            for (var i = 0; i < game.saucers.length; i++)
                this.drawDebugForItem(game.saucers[i]);
            for (var i = 0; i < game.saucer_bullets.length; i++)
                this.drawDebugForItem(game.saucer_bullets[i]);
            this.drawDebugForItem(game.ship);
            ctx.translate(-offset.x, -offset.y);
        });
    }

}