var ai_constants = {
    danger_radius: [ 16.5, 32.5, 65 ],
    target_radius: [ 10, 17.5, 30 ],
    target_min_distance: 100
};

class Target {
    constructor(target) {
        this.type = (target.hasOwnProperty("fire_rate")) ? "s" : "a";
        this.position = target.position.copy();
        this.size = target.size;
        this.velocity = target.velocity.copy();
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
    }
}

class HitTracker {
    constructor(target, timer) {
        this.target = target;
        this.timer = timer;
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
        this.attacked_targets = {};
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
        this.ship.velocity.mul(1 / (Math.E ** (this.ship.drag_coefficient * time)));
        return Vector.div(Vector.add(Vector.mul(this.ship.position, this.ship.drag_coefficient), Vector.sub(initial_velocity, this.ship.velocity)), this.ship.drag_coefficient);
    }

    //Calculate if we should or should not shoot at current angle and position
    manageFire(delay) {
        var keys = Object.keys(this.attacked_targets);
        for (var i = 0; i < keys.length; i++) {
            this.attacked_targets[keys[i]] -= delay;
            if (this.attacked_targets[keys[i]] <= 0)
                delete this.attacked_targets[keys[i]];
        }
        var casualty = null;
        var min_time = Infinity;
        for (var i = 0; i < this.targets.length; i++) {
            var direction = new Vector(Math.cos(this.ship.angle), -Math.sin(this.ship.angle));
            direction.norm();
            var bullet_velocity = Vector.mul(direction, this.ship.bullet_speed);
            direction.norm();
            var bullet_position = Vector.add(this.ship.position, Vector.mul(direction, this.ship.bullet_speed));
            var execution_time = this.findCircleCollisionTime(bullet_position, bullet_velocity, 0, this.targets[i].position, this.targets[i].velocity, ai_constants.target_radius[this.targets[i].size]);
            if (execution_time > this.ship.bullet_life) continue;
            var future_ship_position = this.findFutureShipPosition(execution_time);
            var future_target_position = Vector.add(this.targets[i].position, Vector.mul(this.targets[i].velocity, execution_time));
            if (Vector.dist(future_ship_position, future_target_position) - ai_constants.danger_radius[this.targets[i].size] < ai_constants.target_min_distance) continue;
            if (min_time > execution_time) {
                casualty = this.targets[i];
                min_time = execution_time;
            }
        }
        if (casualty != null && !(casualty in this.attacked_targets)) {
            this.controls.fire = true;
            this.attacked_targets[casualty] = min_time;
        }
    }

    //Just the update function for the ai
    update(delay) {
        
        //Setup virtual targets and reset controls
        this.controls.left = this.controls.right = this.controls.forward = this.controls.teleport = this.controls.fire = false;
        this.targets = [];
        this.ship = new VirtualShip(game.ship);
        for (var i = 0; i < game.asteroids.length; i++)
            this.targets.push(new Target(game.asteroids[i]));
        for (var i = 0; i < game.saucers.length; i++)
            this.targets.push(new Target(game.saucers[i]));
    
        this.manageFire(delay);

    }

    //Draws the debug info for a specific entity
    drawDebugForItem(item) {
        if (settings.show_target_radius)
            Debug.drawTargetRadius(item);
        if (settings.show_danger_radius)
            Debug.drawDangerRadius(item);
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