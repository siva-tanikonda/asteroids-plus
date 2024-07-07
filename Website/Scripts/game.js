//This is a set of configurations on the game (you can change these if you want)
let config = JSON.parse(`{
    "asteroid_shapes": [
        [ [ -0.1, 0 ], [ 0.75, 0 ], [ 1.5, 0.4 ], [ 1.2, 1 ], [ 1.5, 1.6 ], [ 1, 2.1 ], [ 0.45, 1.6 ], [ -0.1, 2.1 ], [ -0.7, 1.6 ], [ -0.7, 0.4 ] ],
        [ [ -0.25, 0 ], [ 0.75, 0.3 ], [ 1.15, 0 ], [ 1.5, 0.5 ], [ 0.6, 0.9 ], [ 1.5, 1.35 ], [ 1.5, 1.55 ], [ 0.5, 2.1 ], [ -0.25, 2.1 ], [ 0, 1.5 ], [ -0.7, 1.5 ], [ -0.7, 0.75 ] ],
        [ [ -0.25, 0 ], [ 0.1, 0.25 ], [ 1, 0 ], [ 1.5, 0.75 ], [ 1, 1.2 ], [ 1.5, 1.7 ], [ 1, 2.1 ], [ 0.4, 1.7 ], [ -0.25, 2.1 ], [ -0.75, 1.5 ], [ -0.4, 0.9 ], [ -0.7, 0.4 ] ]
    ],
    "asteroid_sizes": [ 10, 25, 40 ],
    "asteroid_rotation_speed_range": [ 0, 0.02 ],
    "asteroid_size_speed_scaling": [ 3, 2, 1 ],
    "asteroid_invincibility_time": 100,
    "saucer_shape": [ [ 0.2, 0 ], [ 0.6, -0.2 ], [ 0.2, -0.4 ], [ 0.15, -0.6 ], [ -0.15, -0.6 ], [ -0.2, -0.4 ], [ -0.6, -0.2 ], [ -0.2, 0 ] ],
    "saucer_sizes": [ 40, 50 ],
    "saucer_bullet_life": 200,
    "ship_width": 30,
    "ship_height": 16,
    "ship_rotation_speed": 0.07,
    "ship_acceleration": 0.2,
    "ship_drag_coefficient": 0.0025,
    "ship_fire_rate": 0.05,
    "ship_bullet_speed": 10,
    "ship_bullet_life": 60,
    "ship_teleport_speed": 0.025,
    "ship_teleport_recharge_rate": 0.01,
    "game_extra_life_point_value": 10000,
    "game_asteroid_point_value": 50,
    "game_saucer_point_value": 0,
    "game_precision": 25
}`);

//Applies the border wrap effect when drawing something
function renderWrap(position, radius, action, offset_x = true, offset_y = true) {
    const horizontal = [ 0 ];
    const vertical = [ 0 ];
    if (position.x + radius >= canvas_bounds.width && offset_x) {
        horizontal.push(-canvas_bounds.width);
    }
    if (position.x - radius <= 0 && offset_x) {
        horizontal.push(canvas_bounds.width);
    }
    if (position.y + radius >= canvas_bounds.height && offset_y) {
        vertical.push(-canvas_bounds.height);
    }
    if (position.y - radius <= 0 && offset_y) {
        vertical.push(canvas_bounds.height);
    }
    for (let i = 0; i < horizontal.length; i++) {
        for (let j = 0; j < vertical.length; j++) {
            action(new Vector(horizontal[i], vertical[j]));
        }
    }
}

//Manages an object ID counter to get a unique ID for each object
class ObjectId {
    constructor() {
        this.id = 0;
    }
    get(item) {
        if (item.id == -1) {
            item.id = this.id++;
            this.id %= 1000000;
        }
        return item.id;
    }
}

//Class for the particle
class Particle {
    
    //Constructor
    constructor(position, velocity, drag_coefficient, radius, life) {
        this.position = position;
        this.velocity = velocity;
        this.drag_coefficient = drag_coefficient;
        this.radius = radius;
        this.life = life;
        this.dead = false;
    }

    //Updates the position of the particle
    #move(delay) {
        let initial_velocity = this.velocity.copy();
        this.velocity.mul(1 / (Math.E ** (this.drag_coefficient * delay))); //Differential Equation to deal with accelerated movement over a short time
        this.position = Vector.div(Vector.add(Vector.mul(this.position, this.drag_coefficient), Vector.sub(initial_velocity, this.velocity)), this.drag_coefficient);
        wrap(this.position);
    }

    //Reduce the particle's life and set it to being dead if the life is 0 or lower
    #updateLife(delay) {
        this.life -= delay;
        this.dead |= (this.life <= 0);
    }

    //Update the particle
    update(delay) {
        this.#move(delay);
        this.#updateLife(delay);
    }
    
    //Draws the particle given a certain offset for the wrap
    #drawParticle(offset) {
        ctx.translate(offset.x, offset.y);
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.resetTransform();
    }
    
    //Draws the particle while applying the wrap
    draw() {
        renderWrap(this.position, this.radius, (offset) => {
            this.#drawParticle(offset);
        });
    }

}

//Class for explosion
class Explosion {

    //Constructor
    constructor(position) {
        this.particles = [];
        if (!settings.remove_particles) {
            for (let i = 0; i < 15; i++) {
                this.#makeParticle(position);
            }
            this.dead = false;
        } else {
            this.dead = true;
        }
    }

    //Makes a particle
    #makeParticle(position) {
        if (settings.remove_particles) {
            return;
        }
        let speed = randomInRange([ 0, 8 ]);
        let angle = Math.random() * Math.PI * 2;
        let life = randomInRange([ 30, 60 ]);
        let unit_vector = new Vector(Math.cos(angle), -Math.sin(angle));
        let radius = randomInRange([ 1, 2 ]);
        this.particles.push(new Particle(position, Vector.mul(unit_vector, speed), 0.05, radius, life));
    }

    //Updates the explosion
    update(delay) {
        if (settings.remove_particles) {
            this.dead = true;
            return;
        }
        let new_particles = [];
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].update(delay);
            if (!this.particles[i].dead) {
                new_particles.push(this.particles[i]);
            }
        }
        this.particles = new_particles;
        if (this.particles.length == 0) {
            this.dead = true;
        }
    }

    //Draws the explosion
    draw() {
        if (settings.remove_particles) {
            return;
        }
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].draw();
        }
    }

}

//Class for bullet
class Bullet {

    //Constructor
    constructor(position, velocity, life) {
        this.position = position;
        this.velocity = velocity;
        this.life = life;
        this.dead = false;
        this.id = -1;
    }

    //Updates the bullet
    update(delay) {
        this.position.add(Vector.mul(this.velocity, delay));
        wrap(this.position);
        this.life -= delay;
        this.dead |= (this.life <= 0);
    }

    //Draws a bullet with the given offset
    #drawBullet(offset) {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1.5;
        ctx.translate(offset.x, offset.y);
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 0.75, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.resetTransform();
    }

    //Draws a bullet while applying the border wrap effect
    draw() {
        renderWrap(this.position, 0.75, (offset) => {
            this.#drawBullet(offset);
        });
    }

    //Checks collision with asteroid, but also splits asteroid if there's a collision
    checkAsteroidCollision(split_asteroids, wave, asteroid, explosions) {
        if (asteroid.invincibility > 0 || asteroid.dead || this.dead) {
            return false;
        }
        let horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        let vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                let hit = asteroid.bounds.containsPoint(Vector.add(this.position, new Vector(horizontal[i], vertical[j])));
                if (hit) {
                    this.dead = asteroid.dead = true;
                    explosions.push(new Explosion(asteroid.position));
                    asteroid.destroy(split_asteroids, wave);
                    return true;
                }
            }    
        }
        return false;
    }

    //Checks the collision with a saucer and returns if the saucer was hit or not
    checkSaucerCollision(saucer, explosions) {
        if (saucer.dead || this.dead) {
            return false;
        }
        let horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        let vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                let hit = saucer.bounds.containsPoint(Vector.add(this.position, new Vector(horizontal[i], vertical[j])));
                if (hit) {
                    this.dead = saucer.dead = true;
                    explosions.push(new Explosion(saucer.position));
                    return true;
                }
            }    
        }
        return false;
    }

}

//Class for asteroid
class Asteroid {

    //Tweaks the shape of the asteroid to allow for better scaling
    static analyzeAsteroidConfigurations() {
        for (let i = 0; i < config.asteroid_shapes.length; i++) {
            let shape = new Polygon(config.asteroid_shapes[i]);
            let rect = shape.getRect();
            shape.translate(new Vector(-rect.left, -rect.top));
            for (let j = 0; j < config.asteroid_shapes[i].length; j++) {
                config.asteroid_shapes[i][j][0] = shape.points[j].x;
                config.asteroid_shapes[i][j][1] = shape.points[j].y;
            }
        }
    }

    //Constructor
    constructor(position, size, wave, title_screen) {
        let max_size = config.asteroid_sizes.length - 1;
        let type = Math.floor(randomInRange([0, config.asteroid_shapes.length]));
        this.size = size;
        if (!title_screen && size == max_size) {
            this.invincibility = config.asteroid_invincibility_time;
        } else {
            this.invincibility = 0;
        }
        this.bounds = new Polygon(config.asteroid_shapes[type]);
        this.bounds.scale(config.asteroid_sizes[size]);
        let rect = this.bounds.getRect();
        this.bounds.translate(new Vector(-rect.width / 2, -rect.height / 2));
        this.position = position;
        this.bounds.translate(this.position);
        this.angle = randomInRange([0, Math.PI * 2]);
        this.bounds.rotate(this.angle, this.position);
        this.rotation_speed = randomInRange(config.asteroid_rotation_speed_range);
        if (Math.floor(Math.random() * 2) == 1) {
            this.rotation_speed *= -1;
        }
        let velocity_angle = Math.random() * Math.PI * 2;
        this.velocity = new Vector(Math.cos(velocity_angle), Math.sin(velocity_angle));
        let speed = randomInRange([ Asteroid.#generateAsteroidSpeed(wave - 1), Asteroid.#generateAsteroidSpeed(wave) ]);
        this.velocity.mul(config.asteroid_size_speed_scaling[size] * speed);
        this.dead = false;
        this.id = -1;
    }

    //Rotates the asteroid
    #rotate(delay) {
        let old_angle = this.angle;
        this.angle += this.rotation_speed * delay;
        this.bounds.rotate(this.angle - old_angle, this.position);
        while (this.angle < 0) {
            this.angle += 2 * Math.PI;
        }
        while (this.angle >= 2 * Math.PI) {
            this.angle -= 2 * Math.PI;
        }
    }

    //Updates the position of the asteroid
    #move(delay) {
        let old_position = this.position.copy();
        this.position.add(Vector.mul(this.velocity, delay));
        wrap(this.position);
        this.bounds.translate(Vector.sub(this.position, old_position));
    }

    //Updates the asteroid as a whole
    update(delay) {
        this.#rotate(delay);
        this.#move(delay);
        //Updates the bounding rect of the asteroid based on the rotation and translation
        if (this.invincibility > 0) {
            this.invincibility -= delay;
        }
    }

    //Draws the asteroid with a certain offset
    #drawAsteroid(offset) {
        ctx.translate(offset.x, offset.y);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1.5;
        if (this.invincibility > 0) {
            ctx.globalAlpha = 0.25;
        } else if (settings.debug.show_hitboxes) {
            Debug.drawBounds(this);
        }
        ctx.beginPath();
        ctx.moveTo(this.bounds.points[this.bounds.points.length - 1].x, this.bounds.points[this.bounds.points.length - 1].y);
        for (let i = 0; i < this.bounds.points.length; i++) {
            ctx.lineTo(this.bounds.points[i].x, this.bounds.points[i].y);
        }
        ctx.stroke();
        ctx.resetTransform();
        ctx.globalAlpha = 1;
        if (settings.debug.show_velocity) {
            Debug.drawVelocity(this);
        }
        if (settings.debug.show_positions) {
            Debug.drawPosition(this);
        }
    }

    //Draws the asteroid with the application of the wrap effect
    draw() {
        let rect = this.bounds.getRect();
        renderWrap(this.position, Math.max(rect.width / 2, rect.height / 2), (offset) => {
            this.#drawAsteroid(offset);
        });
    }

    //Splits the asteroid in two
    destroy(split_asteroids, wave) {
        this.dead = true;
        if (this.size == 0) {
            return;
        }
        split_asteroids.push(new Asteroid(this.position.copy(), this.size - 1, wave, false));
        split_asteroids.push(new Asteroid(this.position.copy(), this.size - 1, wave, false));
    }

    static #generateAsteroidSpeed(wave) {
        return Math.max(1, 1 + 0.1 * Math.log2(wave));
    }

}

//Class for saucer
class Saucer {

    //Tweaks the saucer bounds a little bit to allow for proper scaling
    static analyzeSaucerConfigurations() {
        let shape = new Polygon(config.saucer_shape);
        let rect = shape.getRect();
        shape.translate(new Vector(-rect.left, -rect.top));
        for (let i = 0; i < config.saucer_shape.length; i++) {
            config.saucer_shape[i][0] = shape.points[i].x;
            config.saucer_shape[i][1] = shape.points[i].y;
        }
    }

    //Constructor
    constructor(size, wave) {
        this.bounds = new Polygon(config.saucer_shape);
        this.size = size;
        this.bounds.scale(config.saucer_sizes[this.size]);
        let rect = this.bounds.getRect();
        this.bounds.translate(new Vector(-rect.width / 2, -rect.height / 2));
        this.position = new Vector();
        this.position.y = randomInRange([rect.height / 2, canvas_bounds.height - rect.height / 2]);
        if (Math.floor(randomInRange([0, 2])) == 0) {
            this.position.x = -rect.width / 2;
        } else {
            this.position.x = canvas_bounds.width + rect.width / 2;
        }
        this.bounds.translate(this.position);
        this.velocity = new Vector(randomInRange([ Saucer.#generateSaucerSpeed(Math.max(1, wave - 1)), Saucer.#generateSaucerSpeed(wave) ]), 0);
        if (this.position.x > canvas_bounds.width) {
            this.velocity.x *= -1;
        }
        this.direction_change_rate = Saucer.#generateDirectionChangeRate(wave);
        this.direction_change_cooldown = 1;
        this.vertical_movement = 1;
        if (Math.floor(randomInRange([0, 2])) == 0) {
            this.vertical_movement = -1;
        }
        this.entered_x = this.entered_y = false;
        this.bullet_life = config.saucer_bullet_life;
        this.fire_rate = randomInRange([ Saucer.#generateFireRate(Math.max(1, wave - 1)), Saucer.#generateFireRate(wave) ]);
        this.bullet_cooldown = 0;
        this.bullet_speed = randomInRange([ Saucer.#generateBulletSpeed(Math.max(1, wave - 1)), Saucer.#generateBulletSpeed(wave) ]);
        this.dead = false;
        this.id = -1;
    }

    //Updates the position of the saucer
    #move(delay) {
        //Changes the firection of the saucer if probability says so (movement goes from diagonal to horizontal or horizontal to diagonal)
        if (this.direction_change_cooldown <= 0) {
            if (Math.floor(randomInRange([0, 2])) == 0) {
                let direction = this.velocity.x / Math.abs(this.velocity.x);
                if (this.velocity.y == 0) {
                    let new_velocity = new Vector(direction, this.vertical_movement);
                    new_velocity.normalize();
                    new_velocity.mul(this.velocity.mag());
                    this.velocity = new_velocity;
                } else {
                    direction = this.velocity.x / Math.abs(this.velocity.x);
                    this.velocity.x = this.velocity.mag() * direction;
                    this.velocity.y = 0;
                }
            }
            this.direction_change_cooldown = 1;
        }
        this.direction_change_cooldown = Math.max(0, this.direction_change_cooldown - this.direction_change_rate * delay);
        //Actually changes the position of the saucer
        let old_position = this.position.copy();
        this.position.add(Vector.mul(this.velocity, delay));
        wrap(this.position, this.entered_x, this.entered_y);
        this.bounds.translate(Vector.sub(this.position, old_position));
        //Checks if the wrap effect should be applied on each axis for the saucer (only if the saucer has fully entered the map on one direction)
        let rect = this.bounds.getRect();
        this.entered_x |= (this.position.x <= canvas_bounds.width - rect.width / 2 && this.position.x >= rect.width / 2);
        this.entered_y |= (this.position.y >= rect.height / 2 && this.position.y <= canvas_bounds.height - rect.height / 2);
    }

    //Calculates the best direction to fire for the saucer
    #bestFireDirection(ship) {
        let horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        let vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        let best = Vector.sub(ship.position, this.position);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (i == 0 && j == 0) {
                    continue;
                }
                let shifted_position = Vector.add(this.position, new Vector(horizontal[i], vertical[j]));
                let choice = Vector.sub(ship.position, shifted_position);
                if (choice.mag() < best.mag()) {
                    best = choice;
                }
            }
        }
        return best;
    }

    //Manages the saucer's shooting system
    #fire(delay, ship, saucer_bullets) {
        if (this.bullet_cooldown >= 1) {
            let bullet_velocity = this.#bestFireDirection(ship);
            bullet_velocity.normalize();
            bullet_velocity.mul(this.bullet_speed);
            let bullet_position = this.position.copy();
            bullet_position.add(bullet_velocity);
            saucer_bullets.push(new Bullet(bullet_position, bullet_velocity, this.bullet_life));
            this.bullet_cooldown = 0;
        }
        this.bullet_cooldown = Math.min(1, this.bullet_cooldown + this.fire_rate * delay);
    }

    //Updates the saucer
    update(delay, ship, saucer_bullets) {
        this.#move(delay);
        this.#fire(delay, ship, saucer_bullets);
    }

    //Draw the saucer with a certain offset
    #drawSaucer(offset) {
        ctx.translate(offset.x, offset.y);
        if (settings.debug.show_hitboxes) {
            Debug.drawBounds(this);
        }
        ctx.strokeStyle = "white";
        ctx.fillStyle = "rgb(20, 20, 20)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.bounds.points[this.bounds.points.length - 1].x, this.bounds.points[this.bounds.points.length - 1].y);
        for (let i = 0; i < this.bounds.points.length; i++) {
            ctx.lineTo(this.bounds.points[i].x, this.bounds.points[i].y);
        }
        ctx.moveTo(this.bounds.points[1].x, this.bounds.points[1].y);
        ctx.lineTo(this.bounds.points[this.bounds.points.length - 2].x, this.bounds.points[this.bounds.points.length - 2].y);
        ctx.moveTo(this.bounds.points[2].x, this.bounds.points[2].y);
        ctx.lineTo(this.bounds.points[this.bounds.points.length - 3].x, this.bounds.points[this.bounds.points.length - 3].y);
        ctx.stroke();
        if (settings.debug.show_velocity) {
            Debug.drawVelocity(this);
        }
        if (settings.debug.show_positions) {
            Debug.drawPosition(this);
        }
        ctx.resetTransform();
    }

    //Draws the saucer with the border wrap effect
    draw() {
        let rect = this.bounds.getRect();
        renderWrap(this.position, Math.max(rect.width / 2, rect.height / 2), (offset) => {
            this.#drawSaucer(offset);
        }, this.entered_x, this.entered_y);
    }

    static #generateSaucerSpeed(wave) {
        return Math.min(5, 3 + wave / 5);
    }

    static #generateDirectionChangeRate(wave) {
        return Math.min(1e-2, 1 - 1e-2 / wave);
    }

    static #generateFireRate(wave) {
        return Math.min(0.02, wave / 10 * 0.02);
    }

    static #generateBulletSpeed(wave) {
        return Math.min(6, 4 + wave / 10 * 4);
    }

}

//Class for player ship
class Ship {

    //Constructor
    constructor() {
        this.position = new Vector(canvas_bounds.width / 2, canvas_bounds.height / 2);
        this.velocity = new Vector();
        this.width = config.ship_width;
        this.height = config.ship_height;
        this.bounds = new Polygon([
            [ -this.width / 2, -this.height / 2 ],
            [ -this.width / 2, this.height / 2 ],
            [ this.width / 2, 0 ]
        ]);
        this.angle = Math.PI / 2;
        this.bounds.rotate(this.angle, new Vector());
        this.rotation_speed = config.ship_rotation_speed;
        this.acceleration = config.ship_acceleration;
        this.drag_coefficient = config.ship_drag_coefficient;
        this.bullet_cooldown = 1;
        this.fire_rate = config.ship_fire_rate;
        this.bullet_speed = config.ship_bullet_speed;
        this.bullet_life = config.ship_bullet_life;
        this.thruster_status = 0;
        this.teleport_buffer = 0;
        this.teleport_speed = config.ship_teleport_speed;
        this.teleport_cooldown = 1;
        this.teleport_recharge_rate = config.ship_teleport_recharge_rate;
        this.teleport_location = new Vector();
        this.bounds.translate(this.position);
        this.lives = settings.game_lives;
        this.dead = false;
        this.invincibility = 0;
        this.invincibility_time = 100;
        this.invincibility_flash = 0;
        this.accelerating = false;
    }

    //Revives the ship after a death (if the ship has extra lives)
    #reviveShip() {
        this.lives--;
        if (this.lives > 0) {
            this.invincibility = this.invincibility_time;
            this.dead = false;
            let old_position = this.position.copy();
            this.position = new Vector(canvas_bounds.width / 2, canvas_bounds.height / 2);
            this.bounds.translate(Vector.sub(this.position, old_position));
            let old_angle = this.angle;
            this.angle = Math.PI / 2;
            this.bounds.rotate(this.angle - old_angle, this.position);
            this.velocity = new Vector();
            this.thruster_status = 0;
            this.bullet_cooldown = 1;
            this.teleport_cooldown = 1;
        }
    }

    //Rotates the ship based on user input
    #rotate(delay) {
        let old_angle = this.angle;
        if (controls.left) {
            this.angle += delay * this.rotation_speed;
        }
        if (controls.right) {
            this.angle -= delay * this.rotation_speed;
        }
        this.bounds.rotate(this.angle - old_angle, this.position);
        while (this.angle >= Math.PI * 2) {
            this.angle -= Math.PI * 2;
        }
        while (this.angle < 0) {
            this.angle += Math.PI * 2;
        }
    }

    //Moves the ship based on the thruster activation
    #move(delay) {
        let direction = new Vector(Math.cos(this.angle), -Math.sin(this.angle));
        if (this.teleport_buffer == 0 && controls.forward) {
            direction.mul(this.acceleration);
            this.velocity.add(Vector.mul(direction, delay));
            this.thruster_status += 0.05 * delay;
            while (this.thruster_status >= 1) {
                this.thruster_status--;
            }
            this.accelerating = true;
        } else {
            this.thruster_status = 0;
            this.accelerating = false;
        }
        let initial_velocity = this.velocity.copy();
        this.velocity.mul(1 / (Math.E ** (this.drag_coefficient * delay))); //Differential equation to get accelerated velocity over a short period of time
        this.position = Vector.div(Vector.add(Vector.mul(this.position, this.drag_coefficient), Vector.sub(initial_velocity, this.velocity)), this.drag_coefficient);
    }

    //Manage firing
    #fire(delay, ship_bullets) {
        if (controls.fire && this.bullet_cooldown >= 1 && this.teleport_buffer <= 0) {
            const direction = new Vector(Math.cos(this.angle), -Math.sin(this.angle));
            direction.mul(this.width / 2 + 5);
            let bullet_position = Vector.add(direction, this.position);
            direction.normalize();
            let bullet_velocity = Vector.mul(direction, this.bullet_speed);
            bullet_velocity.add(this.velocity);
            ship_bullets.push(new Bullet(bullet_position, bullet_velocity, this.bullet_life));
            this.bullet_cooldown = 0;
        }
        this.bullet_cooldown = Math.min(1, this.bullet_cooldown + this.fire_rate * delay);
    }

    //Manages the teleportation of the ship
    #updateTeleportation(delay) {
        if (controls.teleport && this.teleport_cooldown >= 1 && this.teleport_buffer <= 0) {
            this.teleport_location = new Vector(Math.floor(Math.random() * canvas_bounds.width), Math.floor(Math.random() * canvas_bounds.height));
            this.teleport_buffer += this.teleport_speed * delay;
            this.teleport_cooldown = 0;
        }
        if (this.teleport_buffer < 1 && this.teleport_buffer > 0) {
            this.teleport_buffer += this.teleport_speed * delay;
            if (this.teleport_buffer >= 1) {
                this.position = this.teleport_location;
                this.teleport_buffer = 0;
            }
        }
        this.teleport_cooldown = Math.min(this.teleport_cooldown + this.teleport_recharge_rate * delay, 1.0);
    }

    //Manage invincibility
    #updateInvincibility(delay) {
        if (this.invincibility > 0) {
            this.invincibility_flash += 0.1 * delay;
            while (this.invincibility_flash >= 1) {
                this.invincibility_flash--;
            }
        }
        this.invincibility = Math.max(0, this.invincibility - delay);
    }

    //Updates the ship
    update(delay, ship_bullets) {

        //Sequence to manage ship survival
        if (this.dead && this.lives > 0) {
            this.#reviveShip();
        }
        if (this.dead) {
            return;
        }

        //Sequence to update position (including moving and teleporting)
        this.#rotate(delay);
        let old_position = this.position.copy();
        this.#move(delay);
        this.#updateTeleportation(delay);
        wrap(this.position);
        this.bounds.translate(Vector.sub(this.position, old_position));

        //Shoots if player says so and player isn't teleporting
        this.#fire(delay, ship_bullets);

        //Update's ship's invincibility frames
        this.#updateInvincibility(delay);

    }

    //Draws ship at a certain position with a certain offset and opacity (and also whether to show debug info)
    #drawShip(offset, position, show_hitboxes, show_positions, show_velocity, show_acceleration, alpha = 1.0) {
        if (this.invincibility > 0 && this.invincibility_flash < 0.5) {
            return;
        }
        if (this.teleport_buffer == 0 && show_hitboxes) {
            ctx.translate(offset.x, offset.y);
            Debug.drawBounds(this);
            ctx.translate(-offset.x, -offset.y);
        }
        ctx.strokeStyle = "white";
        ctx.fillStyle = "rgb(20, 20, 20)";
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 1.5;
        ctx.translate(offset.x, offset.y);
        ctx.translate(position.x, position.y);
        ctx.rotate(-this.angle);
        ctx.translate(-position.x, -position.y);
        ctx.beginPath();
        ctx.moveTo(position.x - this.width / 2, position.y - this.height / 2);
        ctx.lineTo(position.x + this.width / 2, position.y);
        ctx.moveTo(position.x - this.width / 2, position.y + this.height / 2);
        ctx.lineTo(position.x + this.width / 2, position.y);
        ctx.moveTo(position.x - this.width / 2 + 6, position.y - this.height / 2 + (this.height / this.width) * 6 - 1);
        ctx.lineTo(position.x - this.width / 2 + 6, position.y + this.height / 2 - (this.height / this.width) * 6 + 1);
        if (this.thruster_status >= 0.5) {
            ctx.moveTo(position.x - this.width / 2 + 6, position.y - this.height / 2 + (this.height / this.width) * 6 - 1);
            ctx.lineTo(position.x - this.width / 2 + 6 - 8, position.y);
            ctx.lineTo(position.x - this.width / 2 + 6, position.y + this.height / 2 - (this.height / this.width) * 6 + 1);
        }
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        ctx.resetTransform();
        if (show_velocity) {
            Debug.drawVelocity(this);
        }
        if (show_acceleration) {
            Debug.drawAcceleration(this);
        }
        if (show_positions) {
            Debug.drawPosition(this);
        }
    }

    //Draws a life for the ship
    #drawLife(position) {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1.5 * 4 / 3;
        ctx.scale(0.75, 0.75);
        ctx.translate(position.x, position.y);
        ctx.rotate(-Math.PI / 2);
        ctx.translate(-position.x, -position.y);
        ctx.beginPath();
        ctx.moveTo(position.x - this.width / 2, position.y - this.height / 2);
        ctx.lineTo(position.x + this.width / 2, position.y);
        ctx.moveTo(position.x - this.width / 2, position.y + this.height / 2);
        ctx.lineTo(position.x + this.width / 2, position.y);
        ctx.moveTo(position.x - this.width / 2 + 6, position.y - this.height / 2 + (this.height / this.width) * 6 - 1);
        ctx.lineTo(position.x - this.width / 2 + 6, position.y + this.height / 2 - (this.height / this.width) * 6 + 1);
        ctx.stroke();
        ctx.resetTransform();
    }

    //Draws the ship before the teleportation (ship is fading)
    #drawWrapBeforeTeleportation(offset) {
        if (this.teleport_buffer == 0) {
            this.#drawShip(offset, this.position, settings.debug.show_hitboxes, settings.debug.show_positions, settings.debug.show_velocity, settings.debug.show_acceleration);
        } else {
            this.#drawShip(offset, this.position, false, settings.debug.show_positions, settings.debug.show_velocity, settings.debug.show_acceleration, 1.0 - this.teleport_buffer);
        }
    }

    //Draws the ship after the teleportation (ship is coming into view)
    #drawWrapAfterTeleportation(offset) {
        this.#drawShip(offset, this.teleport_location, false, false, false, false, this.teleport_buffer);
    }

    //Draws the ship while applying the wrap effect and teleportation effect
    draw() {
        if (this.dead) {
            return;
        }
        renderWrap(this.position, this.width / 2, (offset) => {
            this.#drawWrapBeforeTeleportation(offset);
        });
        if (this.teleport_buffer != 0) {
            renderWrap(this.position, this.width / 2, (offset) => {
                this.#drawWrapAfterTeleportation(offset);
            });
        }
    }

    //Draws the lives of the ship
    drawLives() {
        const base_position = new Vector(29, 70);
        for (let i = 0; i < this.lives; i++) {
            this.#drawLife(Vector.add(base_position, new Vector(this.height * 2 * i, 0)));
        }
    }

    //Checks if the ship has collided with a bullet
    checkBulletCollision(bullet, explosions) {
        if (bullet.dead || this.dead || this.invincibility > 0 || this.teleport_buffer != 0) {
            return false;
        }
        let horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        let vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                let hit = this.bounds.containsPoint(Vector.add(bullet.position, new Vector(horizontal[i], vertical[j])));
                if (hit) {
                    this.dead = bullet.dead = true;
                    explosions.push(new Explosion(this.position));
                    return true;
                }
            }    
        }
        return false;
    }

    //Checks if the ship has collided with an asteroid
    checkAsteroidCollision(split_asteroids, wave, asteroid, explosions) {
        if (asteroid.invincibility > 0 || asteroid.dead || this.dead || this.invincibility > 0 || this.teleport_buffer != 0) {
            return false;
        }
        let horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        let vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        let old_offset = new Vector();
        const shifted_bounds = this.bounds.copy();
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                shifted_bounds.translate(Vector.sub(new Vector(horizontal[i], vertical[j]), old_offset));
                old_offset = new Vector(horizontal[i], vertical[j]);
                let hit = asteroid.bounds.intersectsPolygon(shifted_bounds);
                if (hit) {
                    this.dead = asteroid.dead = true;
                    explosions.push(new Explosion(asteroid.position));
                    explosions.push(new Explosion(this.position));
                    asteroid.destroy(split_asteroids, wave);
                    return true;
                }
            }    
        }
        return false;
    }

    //Checks if the ship has collided with a saucer
    checkSaucerCollision(saucer, explosions) {
        if (saucer.dead || this.dead || this.invincibility > 0 || this.teleport_buffer != 0) {
            return false;
        }
        let horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        let vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        let old_offset = new Vector();
        const shifted_bounds = this.bounds.copy();
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if ((horizontal[i] != 0 && !saucer.entered_x) || (vertical[j] != 0 && !saucer.entered_y)) {
                    continue;
                }
                shifted_bounds.translate(Vector.sub(new Vector(horizontal[i], vertical[j]), old_offset));
                old_offset = new Vector(horizontal[i], vertical[j]);
                let hit = saucer.bounds.intersectsPolygon(shifted_bounds);
                if (hit) {
                    this.dead = saucer.dead = true;
                    explosions.push(new Explosion(saucer.position));
                    explosions.push(new Explosion(this.position));
                    return true;
                }
            }    
        }
        return false;
    }

}

//Game class
class Game {
    
    #ship;
    #ship_bullets;
    #wave;
    #asteroids;
    #explosions;
    #saucers;
    #saucer_bullets;
    #score;
    #extra_lives;
    #saucer_cooldown;
    #title_screen;
    #title_flash;
    #title_flash_rate;
    #paused;
    #old_pause;
    #time;
    #extra_life_point_value;
    #asteroid_point_value;
    #saucer_point_value;
    #object_id;

    static analyzeGameConfiguration() {
        Asteroid.analyzeAsteroidConfigurations();
        Saucer.analyzeSaucerConfigurations();
    }

    //Constructor
    constructor (title_screen = false) {
        this.#ship = new Ship();
        this.#ship_bullets = [];
        this.#wave = 0;
        this.#asteroids = [];
        this.#explosions = [];
        this.#saucers = [];
        this.#saucer_bullets = [];
        this.#score = 0;
        this.#extra_lives = 0;
        this.#saucer_cooldown = 0;
        this.#title_screen = title_screen;
        this.#title_flash = 0;
        this.#title_flash_rate = 0.025;
        this.#paused = false;
        this.#old_pause = false;
        this.#time = 0;
        this.#extra_life_point_value = config.game_extra_life_point_value;
        this.#asteroid_point_value = config.game_asteroid_point_value;
        this.#saucer_point_value = config.game_saucer_point_value;
        this.#object_id = new ObjectId();
    }

    //Make asteroids from scratch
    #makeAsteroids() {
        let count = Game.#generateAsteroidSpawnCount(this.#wave);
        for (let i = 0; i < count; i++) {
            let position = new Vector(randomInRange([0, canvas_bounds.width]), randomInRange([0, canvas_bounds.height]));
            this.#asteroids.push(new Asteroid(position, 2, this.#wave, this.#title_screen));
        }
    }

    //Make a saucer
    #makeSaucer(delay) {
        if (this.#saucer_cooldown >= 1) {
            this.#saucers.push(new Saucer(Math.floor(randomInRange([ 0, config.saucer_sizes.length ])), this.#wave));
            this.#saucer_cooldown = 0;
        }
        this.#saucer_cooldown = Math.min(1, this.#saucer_cooldown + Game.#generateSaucerSpawnRate(this.#wave) * delay);
    }

    //Update loop function (true means that the game has ended and false means that the game is still in progress)
    update(delay) {

        //Check if the game has been paused or unpaused
        if (!this.#title_screen && !(this.#ship.dead && this.#ship.lives <= 0) && !this.#paused && controls.pause && !this.#old_pause) {
            this.#paused = true;
        } else if (this.#paused && controls.pause && !this.#old_pause) {
            this.#paused = false;
        }

        //Check if the game is paused, over, or beginning and update the flash animation (also check if player is dead)
        if (this.#title_screen || (this.#ship.dead && this.#ship.lives <= 0) || this.#paused) {
            this.#title_flash += this.#title_flash_rate * delay;
            while (this.#title_flash >= 1) {
                this.#title_flash--;
            }
            if (controls.start && !this.#paused) {
                if (!this.#ship.dead) {
                    this.#title_screen = false;
                }
                return true;
            }
        }

        //See if the pause button was down in the previous frame
        this.#old_pause = controls.pause;

        //Don't update the game if the game is paused
        if (this.#paused) {
            return;
        }

        //Check if the asteroids have been cleared, and if so, make new ones and update the wave
        if (this.#asteroids.length == 0) {
            this.#wave++;
            this.#makeAsteroids();
        }

        //Check if we need to make a new saucer and if so, then make one
        if (!this.#title_screen && this.#saucers.length == 0) {
            this.#makeSaucer(delay);
        }

        //Check if player gets an extra life
        if (this.#score >= (1 + this.#extra_lives) * this.#extra_life_point_value && this.#ship.lives != 0) {
            this.#ship.lives++;
            this.#extra_lives++;
        }

        //Update each asteroid, saucer, and ship (everything but collision stuff)
        if (!this.#title_screen) {
            this.#ship.update(delay, this.#ship_bullets);
        }
        for (let i = 0; i < this.#ship_bullets.length; i++) {
            this.#ship_bullets[i].update(delay);
        }
        for (let i = 0; i < this.#asteroids.length; i++) {
            this.#asteroids[i].update(delay);
        }
        for (let i = 0; i < this.#saucers.length; i++) {
            this.#saucers[i].update(delay, this.#ship, this.#saucer_bullets);
        }
        for (let i = 0; i < this.#saucer_bullets.length; i++) {
            this.#saucer_bullets[i].update(delay);
        }

        //Stores the asteroids created from hits
        let split_asteroids = [];

        //Check if an asteroid, saucer bullet, or saucer hit the ship
        if (!this.#title_screen) {
            for (let i = 0; i < this.#saucer_bullets.length; i++) {
                this.#ship.checkBulletCollision(this.#saucer_bullets[i], this.#explosions);
            }
            for (let i = 0; i < this.#saucers.length; i++) {
                this.#ship.checkSaucerCollision(this.#saucers[i], this.#explosions);
            }
            for (let i = 0; i < this.#asteroids.length; i++) {
                this.#ship.checkAsteroidCollision(split_asteroids, this.#wave, this.#asteroids[i], this.#explosions);
            }
        }

        //Check if a player bullet hit an asteroid or saucer
        let new_ship_bullets = [];
        for (let i = 0; i < this.#ship_bullets.length; i++) {
            for (let j = 0; j < this.#asteroids.length; j++) {
                let hit = this.#ship_bullets[i].checkAsteroidCollision(split_asteroids, this.#wave, this.#asteroids[j], this.#explosions);
                if (hit && this.#ship.lives != 0) {
                    this.#score += this.#asteroid_point_value;
                }
            }
            for (let j = 0; j < this.#saucers.length; j++) {
                let hit = this.#ship_bullets[i].checkSaucerCollision(this.#saucers[j], this.#explosions);
                if (hit && this.#ship.lives != 0) {
                    this.#score += this.#saucer_point_value;
                }
            }
            if (!this.#ship_bullets[i].dead) {
                new_ship_bullets.push(this.#ship_bullets[i]);
            }    
        }
        this.#ship_bullets = new_ship_bullets;

        //Check if a saucer is dead
        let new_saucers = [];
        for (let i = 0; i < this.#saucers.length; i++) {
            if (!this.#saucers[i].dead) {
                new_saucers.push(this.#saucers[i]);
            }
        }
        this.#saucers = new_saucers;

        //Check if a saucer bullet hit an asteroid
        let new_saucer_bullets = [];
        for (let i = 0; i < this.#saucer_bullets.length; i++) {
            if (!this.#saucer_bullets[i].dead) {
                new_saucer_bullets.push(this.#saucer_bullets[i]);
            }
        }
        this.#saucer_bullets = new_saucer_bullets;

        //For each asteroid created through a collision, add them to the list of total asteroids
        for (let i = 0; i < split_asteroids.length; i++) {
            this.#asteroids.push(split_asteroids[i]);
        }

        //Check if the asteroid is dead, and if so, remove it from the list of asteroids
        let new_asteroids = [];
        for (let i = 0; i < this.#asteroids.length; i++) {
            if (!this.#asteroids[i].dead) {
                new_asteroids.push(this.#asteroids[i]);
            }
        }
        this.#asteroids = new_asteroids;

        //Update the explosions from collisions/death
        let new_explosions = [];
        for (let i = 0; i < this.#explosions.length; i++) {
            this.#explosions[i].update(delay);
            if (!this.#explosions[i].dead) {
                new_explosions.push(this.#explosions[i]);
            }
        }
        this.#explosions = new_explosions;

        //Updates the time in the game
        this.#time += delay / 60;

        return false;

    }

    //Draws the current player's score on the corner of the screen during the game
    #drawScore() {
        ctx.font = "300 20px Roboto Mono";
        ctx.fillStyle = "white";
        const text_size = ctx.measureText(this.#score);
        ctx.fillText(this.#score, 15, 15 + text_size.actualBoundingBoxAscent);
    }

    //Draws title screen ("Press Enter to Start") if the page is launched initially
    #drawTitle() {
        ctx.fillStyle = "rgb(20, 20, 20)";
        ctx.globalAlpha = 0.75;
        ctx.fillRect(0, 0, canvas_bounds.width, canvas_bounds.height);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "white";
        ctx.font = "300 25px Roboto Mono";
        if (this.#title_flash <= 0.5) {
            const textSize = ctx.measureText("Press Enter to Start");
            ctx.fillText("Press Enter to Start", canvas_bounds.width / 2 - textSize.width / 2, canvas_bounds.height / 2);
        }
    }

    //Draws game over screen
    #drawGameOver() {
        ctx.fillStyle = "rgb(20, 20, 20)";
        ctx.globalAlpha = 0.75;
        ctx.fillRect(0, 0, canvas_bounds.width, canvas_bounds.height);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "white";
        ctx.font = "300 35px Roboto Mono";
        let textSize = ctx.measureText("Score: " + this.#score);
        ctx.fillText("Score: " + this.#score, canvas_bounds.width / 2 - textSize.width / 2, canvas_bounds.height / 2 - 30);
        ctx.font = "300 25px Roboto Mono";
        if (this.#title_flash <= 0.5) {
            textSize = ctx.measureText("Press Enter to Try Again");
            ctx.fillText("Press Enter to Try Again", canvas_bounds.width / 2 - textSize.width / 2, canvas_bounds.height / 2 + 30);
        }
    }

    //Draws pause overlay
    #drawPause() {
        ctx.fillStyle = "rgb(20, 20, 20)";
        ctx.globalAlpha = 0.75;
        ctx.fillRect(0, 0, canvas_bounds.width, canvas_bounds.height);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "white";
        ctx.font = "300 35px Roboto Mono";
        let textSize = ctx.measureText("Paused");
        ctx.fillText("Paused", canvas_bounds.width / 2 - textSize.width / 2, canvas_bounds.height / 2 - 30);
        ctx.font = "300 25px Roboto Mono";
        if (this.#title_flash <= 0.5) {
            textSize = ctx.measureText("Press Escape to Resume");
            ctx.fillText("Press Escape to Resume", canvas_bounds.width / 2 - textSize.width / 2, canvas_bounds.height / 2 + 30);
        }
    }

    //Draw loop function for the game
    drawGame() {
        if (!this.#title_screen) {
            this.#ship.draw();
        }
        for (let i = 0; i < this.#asteroids.length; i++) {
            this.#asteroids[i].draw();
        }
        for (let i = 0; i < this.#ship_bullets.length; i++) {
            this.#ship_bullets[i].draw();
        }
        for (let i = 0; i < this.#saucers.length; i++) {
            this.#saucers[i].draw();
        }
        for (let i = 0; i < this.#saucer_bullets.length; i++) {
            this.#saucer_bullets[i].draw();
        }
        for (let i = 0; i < this.#explosions.length; i++) {
            this.#explosions[i].draw();
        }
    }

    //Draws the overlay of the game (lives, score, pause, game-over, and start screens)
    drawOverlay() {
        if (!this.#title_screen && !this.#ship.dead) {
            this.#drawScore();
            this.#ship.drawLives();
        } else if (this.#title_screen) {
            this.#drawTitle();
        }
        if (this.#ship.dead && this.#ship.lives <= 0) {
            this.#drawGameOver();
        }
        if (this.#paused) {
            this.#drawPause();
        }
        if (settings.debug.show_game_data) {
            let asteroid_lengths = [ 0, 0, 0 ];
            for (let i = 0; i < this.#asteroids.length; i++) {
                asteroid_lengths[this.#asteroids[i].size]++;
            }
            Debug.drawGameData(this.#wave, this.#saucers.length, asteroid_lengths, this.#time);
        }
    }

    getShip() {
        return {
            position: this.#ship.position.copy(),
            velocity: this.#ship.velocity.copy(),
            width: this.#ship.width,
            acceleration: this.#ship.acceleration,
            bullet_cooldown: this.#ship.bullet_cooldown,
            bullet_speed: this.#ship.bullet_speed,
            bullet_life: this.#ship.bullet_life,
            drag_coefficient: this.#ship.drag_coefficient,
            angle: this.#ship.angle,
            rotation_speed: this.#ship.rotation_speed
        };
    }

    getAsteroids() {
        let asteroids = [];
        for (let i = 0; i < this.#asteroids.length; i++) {
            asteroids.push({
                position: this.#asteroids[i].position.copy(),
                velocity: this.#asteroids[i].velocity.copy(),
                size: this.#asteroids[i].size,
                invincibility: this.#asteroids[i].invincibility,
                id: this.#object_id.get(this.#asteroids[i])
            });
        }
        return asteroids;
    }

    getSaucers() {
        let saucers = [];
        for (let i = 0; i < this.#saucers.length; i++) {
            saucers.push({
                position: this.#saucers[i].position.copy(),
                velocity: this.#saucers[i].velocity.copy(),
                size: this.#saucers[i].size,
                invincibility: 0,
                id: this.#object_id.get(this.#saucers[i])
            });
        }
        return saucers;
    }

    getSaucerBullets() {
        let saucer_bullets = [];
        for (let i = 0; i < this.#saucer_bullets.length; i++) {
            saucer_bullets.push({
                position: this.#saucer_bullets[i].position.copy(),
                velocity: this.#saucer_bullets[i].velocity.copy()
            });
        }
        return saucer_bullets;
    }

    getTitleScreen() {
        return this.#title_screen;
    }

    getShipDead() {
        return this.#ship.dead;
    }

    getPaused() {
        return this.#paused;
    }

    getShipLives() {
        return this.#ship.lives;
    }

    static #generateAsteroidSpawnCount(wave) {
        return (wave * 2 + 2) * (canvas_bounds.width * canvas_bounds.height) / 1e6;
    }

    static #generateSaucerSpawnRate(wave) {
        return Math.min(1, wave / 2000);
    }

}