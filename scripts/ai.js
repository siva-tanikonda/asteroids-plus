var ai_constants = {
    danger_radius: [ 17.5, 32.5, 65 ],
    distance_squish: 5e-3,
    velocity_squish: 1,
    velocity_order: 1,
    target_min_radius: 100,
    target_radius: [ 12.5, 15, 30 ]
};

class VirtualShip {
    constructor(ship) {
        this.position = ship.position.copy();
        this.bullet_cooldown = ship.bullet_cooldown;
        this.bullet_speed = ship.bullet_speed;
        this.bullet_life = ship.bullet_life;
        this.teleport_buffer = ship.teleport_buffer;
        this.angle = ship.angle;
        this.width = ship.width;
        this.rotation_speed = ship.rotation_speed;
        this.dead = ship.dead;
        this.lives = ship.lives;
    }
}

class VirtualTarget {
    constructor(target, type) {
        this.type = type;
        this.position = target.position.copy();
        this.velocity = target.velocity.copy();
        this.size = target.size;
        this.pointer = target;
    }
}

class HitTracker {
    constructor(target, time) {
        this.target = target;
        this.pointer = target.pointer;
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
        this.attacked_targets = {};
        this.primary_target = null;
        this.targets = [];
    }

    findWithWrap(func, comp) {
        var horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        var vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        var best = null;
        for (var i = 0; i < 3; i++)
            for (var j = 0; j < 3; j++) {
                var result = func(new Vector(horizontal[i], vertical[j]));
                if (comp(best, result))
                    best = result;
            }
        return best;
    }

    getCollisionTime(p1, v1, r1, p2, v2, r2) {
        var a = (v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2;
        var b = 2 * ((p1.x - p2.x) * (v1.x - v2.x) + (p1.y - p2.y) * (v1.y - v2.y));
        var c = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 - (r1 + r2) ** 2;
        var solutions = solveQuadratic(a, b, c);
        if (solutions.length > 0) {
            if (solutions[0] >= 0)
                return solutions[0];
            else if (solutions.length > 1 && solutions[1] >= 0)
                return solutions[1];
        }
        return null;
    }

    calculateDanger(ship, danger) {
        return this.findWithWrap((offset) => {
            ship.position.add(offset);
            var distance = Vector.dist(danger.position, ship.position);
            if (danger.hasOwnProperty("size"))
                distance -= ai_constants.danger_radius[danger.size];
            var value = Math.E ** (-ai_constants.distance_squish * distance);
            value *= ai_constants.velocity_squish * (Math.max(0, Vector.proj_val(Vector.sub(ship.position, danger.position), danger.velocity)) ** ai_constants.velocity_order);
            value = 2 / (1 + Math.E ** (-value)) - 1;
            ship.position.sub(offset);
            return value;
        }, (best, next) => {
            return (best == null || best < next);
        });
    }

    //Finds the best target to shoot at
    calculateBestTarget(ship, dangers) {
        var target = null;
        var max_danger = -Infinity;
        for (var i = 0; i < dangers.length; i++) {

            var attacked_keys = Object.keys(this.attacked_targets);
            var attacked = false;
            for (var j = 0; j < attacked_keys.length; j++)
                if (Object.is(this.attacked_targets[attacked_keys[j]].pointer, dangers[i].pointer)) {
                    attacked = true;
                    break;
                }
            if (attacked) continue;

            var distance = this.findWithWrap((offset) => {
                return Vector.sub(Vector.add(ship.position, offset), dangers[i].position).mag();
            }, (best, next) => {
                return (best == null || next < best);
            });
            if (distance < ai_constants.target_min_radius) continue;

            var danger = this.calculateDanger(ship, dangers[i]);

            if (max_danger < danger) {
                target = dangers[i];
                max_danger = danger;
            }   

        }
        return target;
    }

    //Finds the amount of time needed for bullet to hit a target from current ship position and angle
    getHitTime(ship, target) {
        if (target in this.attacked_targets)
            return null;
        var result = this.findWithWrap((offset) => {
            target.position.add(offset);
            var direction = new Vector(Math.cos(ship.angle), -Math.sin(ship.angle));
            var bv = Vector.mul(direction, ship.bullet_speed);
            var bp = Vector.add(ship.position, Vector.mul(direction, ship.width / 2 + 5));
            target.position.sub(offset);
            var collision_time = this.getCollisionTime(bp, bv, 0, target.position, target.velocity, ai_constants.target_radius[target.size]);
            if (collision_time != null) {
                return new HitTracker(target, collision_time);
            }
        }, (best, next) => {
            return (best == null || (next != null && best.time > next.time));
        });
        return result;
    }

    //Finds the target we will hit if we actuall shoot (it returns null if we shouldn't shoot)
    findFiringTarget(ship) {
        var target = null;
        for (var i = 0; i < this.targets.length; i++) {
            var result = this.getHitTime(ship, this.targets[i]);
            var distance = this.findWithWrap((offset) => {
                return Vector.sub(Vector.add(ship.position, offset), this.targets[i].position).mag();
            }, (best, next) => {
                return (best == null || next < best);
            });
            if (distance < ai_constants.target_min_radius && this.targets[i].size > 0 && this.targets[i].type == 'a')
                return null;
            if (result != null && result.time <= ship.bullet_life && (target == null || target.time < result.time))
                target = result;
        }
        return target;
    }

    manageFiring(game, ship) {
        this.controls.fire = false;
        if (ship.bullet_cooldown <= 0 || ship.teleport_buffer > 0 || ship.dead || game.title_screen || game.paused)
            return;
        var fire_target = this.findFiringTarget(ship);
        if (fire_target != null) {
            this.attacked_targets[fire_target.target] = {
                pointer: fire_target.pointer,
                time: fire_target.time
            };
            this.controls.fire = true;
        }
    }

    acquireTarget(game, ship) {
        this.primary_target = this.calculateBestTarget(ship, this.targets);
        if (ship.lives <= 0 || game.title_screen)
            this.primary_target = null;
    }

    updateAttackedTargets(delay) {
        var attacked_keys = Object.keys(this.attacked_targets);
        for (var i = 0; i < attacked_keys.length; i++) {
            this.attacked_targets[attacked_keys[i]].time -= delay;
            if (this.attacked_targets[attacked_keys[i]].time <= 0)
                delete this.attacked_targets[attacked_keys[i]];
        }
    }

    aim(ship, delay) {
        this.controls.left = this.controls.right = false;
        if (this.primary_target == null) return;
        var old_angle = ship.angle;
        var old_target_position = this.primary_target.position.copy();
        var time = 1 / settings.game_precision;
        var best_rotation = 0;
        var fastest_time = Infinity;
        var tracker = this.getHitTime(ship, this.primary_target);
        if (tracker != null && tracker.time <= ship.bullet_life) {
            fastest_time = tracker.time;
            best_rotation = 0;
        }
        while (time < Math.PI / ship.rotation_speed) {
            this.primary_target.position.add(this.primary_target.velocity);
            var min_distance = ai_constants.danger_radius[this.primary_target.size] + ship.width / 2;
            ship.angle = old_angle + ship.rotation_speed * time;
            while (ship.angle >= Math.PI * 2)
                ship.angle -= Math.PI * 2;
            tracker = this.getHitTime(ship, this.primary_target);
            if (tracker != null && tracker.time <= ship.bullet_life && tracker.time * ship.bullet_speed - ship.width / 2 + 5 > min_distance) {
                if (fastest_time > tracker.time + time) {
                    fastest_time = tracker.time + time;
                    best_rotation = ship.rotation_speed * time;
                }
            }
            ship.angle = old_angle - ship.rotation_speed * time;
            while (ship.angle < 0)
                ship.angle += Math.PI * 2;
            tracker = this.getHitTime(ship, this.primary_target);
            if (tracker != null && tracker.time <= ship.bullet_life && tracker.time * ship.bullet_speed - ship.width / 2 + 5 > min_distance) {
                if (fastest_time > tracker.time + time) {
                    fastest_time = tracker.time + time;
                    best_rotation = -ship.rotation_speed * time;
                }
            }
            time += 1 / settings.game_precision;
        }
        ship.angle = old_angle;
        this.primary_target.position = old_target_position;
        if (best_rotation > 0) {
            this.controls.left = true;
            ship.angle += ship.rotation_speed * delay;
            while (ship.angle >= 2 * Math.PI)
                ship.angle -= 2 * Math.PI;
        } else if (best_rotation < 0) {
            this.controls.right = true;
            ship.angle -= ship.rotation_speed * delay;
            while (ship.angle < 0)
                ship.angle += 2 * Math.PI;
        }
    }

    update(game, delay) {

        this.targets = [];
        for (var i = 0; i < game.asteroids.length; i++)
            this.targets.push(new VirtualTarget(game.asteroids[i], 'a'));
        for (var i = 0; i < game.saucers.length; i++)
            this.targets.push(new VirtualTarget(game.saucers[i], 's'));
        var ship = new VirtualShip(game.ship);
        if (this.primary_target != null && this.primary_target.pointer != null)
            this.primary_target = new VirtualTarget(this.primary_target.pointer);
        
        //this.acquireTarget(game, ship);

        //this.aim(ship, delay);
        this.manageFiring(game, ship);
        this.updateAttackedTargets(delay);

    }

    drawDebugForItem(item) {
        if (settings.show_danger_radius)
            Debug.drawDangerRadius(item);
        if (settings.show_danger)
            Debug.drawDangerLevel(item);
        if (settings.show_target_radius)
            Debug.drawTargetRadius(item);
        if (settings.show_primary_target && this.primary_target != null && Object.is(item, this.primary_target.pointer))
            Debug.drawPrimaryTarget(item);
    }

    drawDebugVisuals(game, offset) {
        ctx.translate(offset.x, offset.y);
        for (var i = 0; i < game.asteroids.length; i++)
            this.drawDebugForItem(game.asteroids[i]);
        for (var i = 0; i < game.saucers.length; i++)
            this.drawDebugForItem(game.saucers[i]);
        for (var i = 0; i < game.saucer_bullets.length; i++)
            this.drawDebugForItem(game.saucer_bullets[i]);
        ctx.resetTransform();
    }

    drawDebug(game) {
        var horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        var vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        for (var i = 0; i < 3; i++)
            for (var j = 0; j < 3; j++)
                this.drawDebugVisuals(game, new Vector(horizontal[i], vertical[j]));
    }

}

/*
Aiming
- testFire(ship_position, ship_angle, targets) -> Tells us if we should shoot or not at current angle
    - We need to be able to test if a certain angle would be able to hit a certain polygon
    - We use a target_radius 
    - Will need to ensure we don't hit something too close (constants.targeting_distance) 
- testDanger(ship_position, targets) -> Tells us danger level of the target
    - distance between + velocity_danger * proj(velocity of target, distance between)
- getBestAngle(ship_position, ship_angle, targets) -> Tells us what angle to go to
    - We will check degrees left and right and progress time during calculation
    - We will check if testFire returns true at either of these angles
    - Break ties by which one is most dangerous target
*/