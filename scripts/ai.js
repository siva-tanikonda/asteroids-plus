var ai_constants = {
    danger_radius: [ 16.5, 32.5, 65 ],
    danger_scaling: 1,
    danger_distance_squish: 2e-3,
    danger_velocity_order: 0.75,
    danger_ship_forward_velocity_scaling: 0,
    danger_ship_reverse_velocity_scaling: 1,
    danger_direction_multiplier: 2,
    target_radius: [ 10, 17.5, 30 ],
    target_min_distance: 100
};

class Target {
    constructor(target) {
        this.type = (target.hasOwnProperty("fire_rate")) ? "s" : "a";
        this.position = target.position.copy();
        this.size = target.size;
        this.velocity = target.velocity.copy();
        this.pointer = target;
        if (this.type == 'a')
            this.group = this.size;
        else
            this.group = 3;
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
        this.counts = [ 0, 0, 0, 0 ];
    }
    
    //Allows us to just run a function in the wrap
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

    //Calculates the danger value of a danger (saucer, asteroid, or saucer_bullet)
    calculateDangerLevel(danger) {
        return this.optimizeInWrap((offset) => {
            var r = Vector.sub(Vector.add(this.ship.position, offset), danger.position);
            var value = r.mag();
            if (danger.hasOwnProperty("size"))
                value -= ai_constants.danger_radius[danger.size];
            value = ai_constants.danger_scaling * (Math.E ** (-ai_constants.danger_distance_squish * value));
            var proj_sv = Vector.proj_val(r, this.ship.velocity);
            if (proj_sv > 0) proj_sv *= ai_constants.danger_ship_forward_velocity_scaling;
            else proj_sv *= ai_constants.danger_ship_reverse_velocity_scaling;
            var proj_dv = Vector.proj_val(r, danger.velocity);
            value *= Math.max(0, proj_dv - proj_sv) ** ai_constants.danger_velocity_order;
            return sigmoid(value) * 2 - 1;
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

    //Find future position of a book assuming no more thrust applied
    findFutureShipPosition(time) {
        var initial_velocity = this.ship.velocity.copy();
        var velocity = Vector.mul(this.ship.velocity, 1 / (Math.E ** (this.ship.drag_coefficient * time)));
        var position = Vector.div(Vector.add(Vector.mul(this.ship.position, this.ship.drag_coefficient), Vector.sub(initial_velocity, velocity)), this.ship.drag_coefficient);
        return position
    }

    //Calculate distance between two dangers while applying danger bounds
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

    //Calculate the bullet collision time assuming you are trying to hit a certain target
    findBulletCollisionTime(target) {
        return this.optimizeInWrap((offset) => {
            this.ship.position.add(offset);
            var direction = new Vector(Math.cos(this.ship.angle), -Math.sin(this.ship.angle));
            direction.mul(this.ship.width / 2 + 5);
            var bullet_position = Vector.add(direction, this.ship.position);
            direction.norm();
            var bullet_velocity = Vector.mul(direction, this.ship.bullet_speed);
            bullet_velocity.add(this.ship.velocity);
            this.ship.position.sub(offset);
            return this.findCircleCollisionTime(bullet_position, bullet_velocity, 0, target.position, target.velocity, ai_constants.target_radius[target.size]);
        }, (best, next) => {
            return (best == null || (next != null && next < best));
        });
    }

    //Calculate if we should or should not shoot at current angle and position
    manageFire(delay) {

        if (this.ship.bullet_cooldown < 1 || this.ship.teleport_buffer > 0 || this.controls.teleport) return;

        var keys = Object.keys(this.attacked_targets);
        for (var i = 0; i < keys.length; i++) {
            this.attacked_targets[keys[i]] -= delay;
            if (this.attacked_targets[keys[i]] <= 0)
                delete this.attacked_targets[keys[i]];
        }

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
        if (casualty != null && !(casualty.pointer in this.attacked_targets)) {
            this.controls.fire = true;
            this.attacked_targets[casualty.pointer] = min_time;
        }

    }

    //Calculates the need to go in both directions (forward, left, rear, right)
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
            direction.mul(this.dangers[i].danger_level * ai_constants.danger_direction_multiplier);
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

    //Simulates the ship doing certain movements
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
        if (dforward && drear) {
            if (dleft && dright) {
                this.controls.teleport = true;
                return;
            } else if (dleft)
                this.controls.left = true;
            else if (dright)
                this.controls.right = true;
            else {
                if (left >= right)
                    this.controls.left = true;
                else
                    this.controls.right = true;
            }
        } else if (dforward) {
            if (dleft && dright)
                this.controls.forward = true;
            else if (dleft)
                this.controls.forward = this.controls.left = true;
            else if (dright)
                this.controls.forward = this.controls.right = true;
            else
                this.controls.forward = true;
        } else if (drear) {
            if (dleft && dright) {
                this.controls.teleport = true;
                return;
            }
            else if (dleft)
                this.controls.left = true;
            else if (dright)
                this.controls.right = true;
            else {
                if (left >= right)
                    this.controls.left = true;
                else
                    this.controls.right = true;
            }
        } else {
            if (dleft && dright)
                this.controls.forward = true;
            if (dleft)
                this.controls.forward = this.controls.left = true;
            else if (dright)
                this.controls.forward = this.controls.right = true;    
        }
    }

    //Decides on the best target to aim at
    findBestTarget() {
        var target = null;
        var highest_danger_level = 0;
        for (var i = 0; i < this.targets.length; i++) {
            if (this.targets[i].pointer in this.attacked_targets)
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
        this.counts = [ 0, 0, 0, 0 ];
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
        
        //Find out if there is a danger that is too close to shoot
        var proximal_danger = false;
        for (var i = 0; i < this.dangers.length; i++) {
            if (this.dangers[i].danger_level < 0.5) continue;
            var distance = this.getShortestDistance(this.dangers[i].position, this.ship.position);
            if (this.dangers[i].hasOwnProperty("size"))
                if (distance - ai_constants.danger_radius[this.targets[i].size] < ai_constants.target_min_distance)
                    proximal_danger = true;
            else
                if (distance < ai_constants.target_min_distance)
                    proximal_danger = true;
        }
        
        //The ai actions
        if (proximal_danger)
            this.manageFlee(delay);
        else
           this.manageAim(delay);
        this.manageFire(delay);

    }

    //Draws the debug info for a specific entity
    drawDebugForItem(item) {
        if (settings.show_target_radius)
            Debug.drawTargetRadius(item);
        if (settings.show_danger_radius)
            Debug.drawDangerRadius(item);
        if (settings.show_target_min_distance)
            Debug.drawTargetMinDistance(item);
        if (settings.show_danger_level)
            Debug.drawDangerLevel(item);
        if (settings.show_danger_flee)
            Debug.drawDangerFlee(item);
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

/*
CONSTANTS:
- danger_radius: A radius based on the max polygon radius of each asteroid/saucer
- target_safety_distance: The minimum distance between splittable asteroid and player to shoot

PROGRAM:
- Create virtual versions of every entity in the game
- Decide if we should flee or aim (because we can't do both at the same time)
    - If we decided to aim, then take the steps to aim
    - If we decided to flee, take the steps to flee
- If it is viable/safe to shoot, then shoot
**Notes**
- Make sure to edit the virtual entities, not the original ones (abstraction barrier)
- Make sure time complexity isn't too high (or else the program will be slow)
- Dangers vs. targets difference is just that dangers include saucer bullets

FIRING:
- For each target, calculate the minimum amount of time necessary for a bullet to reach the target O(n)
    - Can use quadratic formula to get this time
    - Sometimes might have no solution
    - If distance involves a collision, then return null
- Check if the position of the ship will be too close to the target by this time O(1)
    - Can calculate position of ship using differential equation
    - Can use danger_radius[asteroid.size] + target_safety_distance to decide if we are too close or not
    - If so, don't shoot
    - Constants Used: danger_radius, target_safety radius
- Check if the time to reach the target is within the limit of the bullet life O(1)
    - If so, then shoot
- Time Complexity: O(n) -> n is the number of targets

AIMING:
- Pick the most dangerous target on the screen
- See minimum rotation to shoot that target
    - Got to use calculus to predict future position of ship
    - Find minimum total time to execute a target while predicting target's future motion
    - Check total time added together to aim

FLEEING:
- For each danger, calculate the danger value between 0 (no danger) to 1 (you're prolly dead already)
    - Formula: **Insert Formula Here**
    - In order for an object to be classified as dangerous, it has to have a danger level >=0.5
- left, right, forward, stop scalars
- For every object that's been classified as dangerous:
    - Get unit vector opposing vector from ship to danger
    - Multiply this by the danger
    - Add to each of 4 scalars based on components/projection onto axis created by angle of the ship
- Squish each of these values into ranges of 0 to 1
- Different Scenarios:
    - A dangerous direction is a direction where the squished value is >=0.5
    - Dangers: None -> Do nothing
    - Dangers: Left -> Forward
    - Dangers: Right -> Forward
    - Dangers: Left, Right -> Forward
    - Dangers: Forward -> Right or Left based on which direction is safer
    - Dangers: Forward, Left -> Right
    - Dangers: Forward, Right -> Left
    - Dangers: Back -> Forward
    - Dangers: Back, Left -> Right, forward
    - Dangers: Back, Right -> Left, forward
    - Dangers: Back, Right, Left -> Forward
    - Dangers: Forward, Left, Right -> Teleport
    - Dangers: Forward, Left, Right, Back -> Teleport
- Time Complexity: O(n)
*/