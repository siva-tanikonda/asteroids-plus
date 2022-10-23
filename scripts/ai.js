var ai_constants = {
    danger_radius: [ 17.5, 32.5, 65 ],
    distance_squish: 5e-3,
    velocity_squish: 1,
    velocity_order: 1,
    target_radius: [ 7.5, 10, 20 ]
};

function runInWrap(func) {
    var horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
    var vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
    for (var i = 0; i < 3; i++)
        for (var j = 0; j < 3; j++) {
            var result = func(ai, new Vector(horizontal[i], vertical[j]));
            if (result != null)
                return result;
        }
}

class VirtualShip {
    constructor(ship) {
        this.position = ship.position.copy();
        this.angle = ship.angle;
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
    }

    calculateDangerLevel(ship, item) {
        var horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        var vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        var danger = 0;
        var ship_position = ship.position.copy();
        for (var i = 0; i < 3; i++)
            for (var j = 0; j < 3; j++) {
                ship_position.add(new Vector(horizontal[i], vertical[j]));
                var distance = Vector.dist(item.position, ship_position);
                if (item.hasOwnProperty("size"))
                    distance -= ai_constants.danger_radius[item.size];
                var value = Math.E ** (-ai_constants.distance_squish * distance);
                value *= ai_constants.velocity_squish * (Vector.proj_val(Vector.sub(ship_position, item.position), item.velocity) ** ai_constants.velocity_order);
                value = 2 / (1 + Math.E ** (-value)) - 1;
                danger = Math.max(danger, value);
                ship_position.sub(new Vector(horizontal[i], vertical[j]));
            }
        return danger;
    }

    getFireTarget(ship, targets) {
        if (game.ship.bullet_cooldown < 0 || game.ship.teleport_buffer > 0)
            return false;
        var result = runInWrap((ai, offset) => {
            var time = 0;
            var direction = new Vector(Math.cos(ship.angle), -Math.sin(ship.angle));
            direction.norm();
            var bullet_velocity = Vector.mul(direction, game.ship.bullet_speed);
            var bullet_position = Vector.add(ship.position, Vector.mul(direction, game.ship.width / 2 + 5));
            bullet_position.add(bullet_velocity);
            wrap(bullet_position);
            while (time < game.ship.bullet_life) {
                bullet_position.add(bullet_velocity);
                wrap(bullet_position);
                for (var i = 0; i < targets.length; i++) {
                    var target_position = Vector.add(targets[i].position, Vector.mul(targets[i].velocity, time + 1));
                    target_position.add(offset);
                    if (!(targets[i] in ai.attacked_targets) && Vector.dist(bullet_position, target_position) <= ai_constants.target_radius[targets[i].size])
                        return {
                            target: targets[i],
                            life: time 
                        };
                }
                time++;
            }
        });
        return result;
    }

    update(game, delay) {

        var targets = [];
        for (var i = 0; i < game.asteroids.length; i++)
            targets.push(game.asteroids[i]);
        for (var i = 0; i < game.saucers.length; i++)
            targets.push(game.saucers[i]);
        var ship = new VirtualShip(game.ship);
        var attacked_keys = Object.keys(this.attacked_targets);
        for (var i = 0; i < attacked_keys.length; i++) {
            this.attacked_targets[attacked_keys[i]] -= delay;
            if (this.attacked_targets[attacked_keys[i]] <= 0)
                delete this.attacked_targets[attacked_keys[i]];
        }

        this.controls.fire = false;
        var fire_choice = this.getFireTarget(ship, targets);
        if (fire_choice != null) {
            this.attacked_targets[fire_choice.target] = fire_choice.life;
            this.controls.fire = true;
        }
    }

    drawDebugForItem(item) {
        if (settings.show_danger)
            Debug.drawDangerLevel(item);
        if (settings.show_danger_radius)
            Debug.drawDangerRadius(item);
        if (settings.show_target_radius)
            Debug.drawTargetRadius(item);
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