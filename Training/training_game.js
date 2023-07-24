const { Vector, Rect, Polygon, wrap } = require("./math.js");

let seed = 1;
function random() {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function randomInRange(range) {
    return range[0] + random() * (range[1] - range[0]);
}

const canvas_bounds = {
    width: 1475,
    height: 931
};

const settings = {
    remove_particles: true
}

//Ship config information
const ship_configuration = {
    width: 30,
    height: 16,
    rear_offset: 6,
    rotation_speed: 6 * Math.PI / 180,
    acceleration: 0.125,
    drag_coefficient: 0.0075,
    fire_rate: 0.05,
    bullet_speed: 10,
    bullet_life: 60,
    trail_length: 8,
    thruster_flash_rate: 0.05,
    teleport_speed: 0.025,
    teleport_recharge_rate: 0.01,
    lives: 1,
    invincibility_flash_rate: 0.1
};

//Asteroid config information
const asteroid_configurations = {
    //Different polygon shapes that the asteroids could take
    shapes: [
        new Polygon([
            [ -0.1, 0 ],
            [ 0.75, 0 ],
            [ 1.5, 0.4 ],
            [ 1.2, 1 ],
            [ 1.5, 1.6 ],
            [ 1, 2.1 ],
            [ 0.45, 1.6 ],
            [ -0.1, 2.1 ],
            [ -0.7, 1.6 ],
            [ -0.7, 0.4 ]
        ]),
        new Polygon([
            [ -0.25, 0 ],
            [ 0.75, 0.3 ],
            [ 1.15, 0 ],
            [ 1.5, 0.5 ],
            [ 0.6, 0.9 ],
            [ 1.5, 1.35 ],
            [ 1.5, 1.55 ],
            [ 0.5, 2.1 ],
            [ -0.25, 2.1 ],
            [ 0, 1.5 ],
            [ -0.7, 1.5 ],
            [ -0.7, 0.75 ]
        ]),
        new Polygon([
            [ -0.25, 0 ],
            [ 0.1, 0.25 ],
            [ 1, 0 ],
            [ 1.5, 0.75 ],
            [ 1, 1.2 ],
            [ 1.5, 1.7 ],
            [ 1, 2.1 ],
            [ 0.4, 1.7 ],
            [ -0.25, 2.1 ],
            [ -0.75, 1.5 ],
            [ -0.4, 0.9 ],
            [ -0.7, 0.4 ]
        ])
    ],
    //Maximum bounding rect size of an asteroid
    max_rect: new Rect(0, 0, 150, 150),
    //The up-scaling of the asteroids based on the size (smaller number means smaller asteroid)
    sizes: [ 10, 25, 40 ],
    //The range of the speeds the asteroids could rotate
    rotation_speed: [ 0, 0.02 ],
    //The speed multiplier based on the asteroid's size
    size_speed: [ 3, 2, 1 ],
    //The function for the speed scaling of the asteroids
    speed_scaling: (wave) => {
        const last_wave = Math.max(1, wave - 1);
        return [ Math.max(1, 1 + 0.1 * Math.log2(last_wave)), Math.max(1, 1 + 0.1 * Math.log2(wave)) ];
    },
    //The function for the number of asteroids that spawn in the game after all have been destroyed
    spawn_count: (wave) => {
        return Math.floor((wave + 2) * (canvas_bounds.width * canvas_bounds.height) / 1e6);
    }
};

//Explosion config information
const explosion_configuration = {
    //Number of particles in an explosion
    particle_count: 15,
    //The range of the initial velocity of each particle
    particle_speed: [ 0, 8 ],
    //The range of how long a particle stays in the game
    particle_life: [ 30, 60 ],
    //The drag coefficient of a particle's velocity (decelerating force is directly proportional to the particles' velocity)
    particle_drag_coefficient: 0.05,
    //The range of the radius of a particle
    particle_radius: [ 1, 2 ]
};

//Saucer config information
const saucer_configurations = {
    //The shape of the saucer
    shape: new Polygon([
        [ 0.2, 0 ],
        [ 0.6, -0.2 ],
        [ 0.2, -0.4 ],
        [ 0.15, -0.6 ],
        [ -0.15, -0.6 ],
        [ -0.2, -0.4 ],
        [ -0.6, -0.2 ],
        [ -0.2, 0 ]
    ]),
    //The size multipliers of the saucer
    sizes: [ 40, 50 ],
    //The function to find the scaling of the speed based on the player's current wave
    speed_scaling: (wave) => {
        const last_wave = Math.max(1, wave - 1);
        const upper_bound = Math.min(5, 3 + wave / 5);
        const lower_bound = Math.min(5, 3 + last_wave / 5);
        return [ lower_bound, upper_bound ];
    },
    //The function to calculate the rate at which the direction of movement of the saucer can change
    direction_change_rate: (wave) => {
        return Math.min(1e-2, 1 - 1e-2 / wave);
    },
    //The function to calculate the bullet speed of the saucer
    bullet_speed: (wave) => {
        const last_wave = Math.max(1, wave - 1);
        const upper_bound = Math.min(6, 4 + wave / 10 * 4);
        const lower_bound = Math.min(6, 4 + last_wave / 10 * 4);
        return [ lower_bound, upper_bound ];
    },
    //The function to calculate the fire rate of the saucer
    fire_rate: (wave) => {
        const last_wave = Math.max(1, wave - 1);
        const upper_bound = Math.min(0.02, wave / 10 * 0.02);
        const lower_bound = Math.min(0.02, last_wave / 10 * 0.02);
        return [ lower_bound, upper_bound ];
    },
    //The bullet life of the saucer's bullets
    bullet_life: 200,
    //The spawn rate of the saucer (given that no saucer is already in the game)
    spawn_rate: (wave) => {
        return Math.min(1, wave / 1000);
    }
};

//Gives point values associated with different in-game events
const point_values = {
    //Score given for an asteroid kill/split by the player
    asteroids: 50,
    //Score given for a saucer kill by the player
    saucers: 0,
    //The number of points needed to get an extra life
    extra_life: 10000
};

//Class for the particle
class Particle {
    
    constructor(position, velocity, drag_coefficient, radius, life) {
        this.position = position;
        this.velocity = velocity;
        this.drag_coefficient = drag_coefficient;
        this.radius = radius;
        this.life = life;
        this.dead = false;
    }

    //Updates the position of the particle
    updatePosition(delay) {
        const initial_velocity = this.velocity.copy();
        this.velocity.mul(1 / (Math.E ** (this.drag_coefficient * delay)));
        this.position = Vector.div(Vector.add(Vector.mul(this.position, this.drag_coefficient), Vector.sub(initial_velocity, this.velocity)), this.drag_coefficient);
        wrap(this.position);
    }

    //Reduce the particle's life and set it to being dead if the life is 0 or lower
    updateLife(delay) {
        this.life -= delay;
        this.dead |= (this.life <= 0);
    }

    //Update the particle
    update(delay) {
        this.updatePosition(delay);
        this.updateLife(delay)
    }

}

//Class for explosion
class Explosion {

    constructor(position) {
        this.particles = [];
        if (!settings.remove_particles) {
            for (let i = 0; i < explosion_configuration.particle_count; i++)
                this.makeParticle(position);
            this.dead = false;
        } else this.dead = true;
    }

    //Makes a particle according to explosion_configuration variable
    makeParticle(position) {
        if (settings.remove_particles)
            return;
        const speed = randomInRange(explosion_configuration.particle_speed);
        const angle = random() * Math.PI * 2;
        const life = randomInRange(explosion_configuration.particle_life);
        const unit_vector = new Vector(Math.cos(angle), -Math.sin(angle));
        const radius = randomInRange(explosion_configuration.particle_radius);
        this.particles.push(new Particle(position, Vector.mul(unit_vector, speed), explosion_configuration.particle_drag_coefficient, radius, life));
    }

    //Updates the explosion
    update(delay) {
        if (settings.remove_particles) {
            this.dead = true;
            return;
        }
        const new_particles = [];
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].update(delay);
            if (!this.particles[i].dead)
                new_particles.push(this.particles[i]);
        }
        this.particles = new_particles;
        if (this.particles.length == 0)
            this.dead = true;
    }

}

//Class for bullet
class Bullet {

    constructor(position, velocity, life) {
        this.position = position;
        this.velocity = velocity;
        this.life = life;
        this.radius = 0.75;
        this.dead = false;
        this.entity = 'b';
    }

    //Updates the bullet
    update(delay) {
        this.position.add(Vector.mul(this.velocity, delay));
        wrap(this.position);
        this.life -= delay;
        this.dead |= (this.life <= 0);
    }

    //Checks the collision with a generic object and returns if the object was hit or not
    checkCollision(item, explosions) {
        if (item.dead || this.dead)
            return false;
        const horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        const vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const hit = item.bounds.containsPoint(Vector.add(this.position, new Vector(horizontal[i], vertical[j])));
                if (hit) {
                    this.dead = item.dead = true;
                    explosions.push(new Explosion(item.position));
                    return true;
                }
            }    
        }
        return false;
    }

    //Checks collision with asteroid, but also splits asteroid if there's a collision
    checkAsteroidCollision(split_asteroids, wave, asteroid, explosions) {
        const hit = this.checkCollision(asteroid, explosions)
        if (hit)
            asteroid.destroy(split_asteroids, wave);
        return hit;
    }

}

//Class for player ship
class Ship {

    constructor(controls) {
        this.position = new Vector(canvas_bounds.width / 2, canvas_bounds.height / 2);
        this.velocity = new Vector();
        this.width = ship_configuration.width;
        this.height = ship_configuration.height;
        this.rear_offset = ship_configuration.rear_offset;
        this.bounds = new Polygon([
            [ -this.width / 2, -this.height / 2 ],
            [ -this.width / 2, this.height / 2 ],
            [ this.width / 2, 0 ]
        ]);
        this.angle = Math.PI / 2;
        this.bounds.rotate(this.angle, new Vector());
        this.rotation_speed = ship_configuration.rotation_speed;
        this.acceleration = ship_configuration.acceleration;
        this.drag_coefficient = ship_configuration.drag_coefficient;
        this.bullet_cooldown = 1;
        this.fire_rate = ship_configuration.fire_rate;
        this.bullet_speed = ship_configuration.bullet_speed;
        this.bullet_life = ship_configuration.bullet_life;
        this.trail_length = ship_configuration.trail_length;
        this.thruster_status = 0;
        this.thruster_flash_rate = ship_configuration.thruster_flash_rate;
        this.teleport_buffer = 0.0;
        this.teleport_speed = ship_configuration.teleport_speed;
        this.teleport_cooldown = 1;
        this.teleport_recharge_rate = ship_configuration.teleport_recharge_rate;
        this.teleport_location = new Vector();
        this.bounds.translate(this.position);
        this.lives = ship_configuration.lives;
        this.dead = false;
        this.invincibility = 0;
        this.invincibility_time = 100;
        this.invincibility_flash = 0;
        this.invincibility_flash_rate = ship_configuration.invincibility_flash_rate;
        this.accelerating = false;
        this.entity = 'p';
        this.controls = controls;
    }

    //Revives the ship after a death (if the ship has extra lives)
    reviveShip() {
        this.lives--;
        if (this.lives > 0) {
            this.invincibility = this.invincibility_time;
            this.dead = false;
            const old_position = this.position.copy();
            this.position = new Vector(canvas_bounds.width / 2, canvas_bounds.height / 2);
            this.bounds.translate(Vector.sub(this.position, old_position));
            const old_angle = this.angle;
            this.angle = Math.PI / 2;
            this.bounds.rotate(this.angle - old_angle, this.position);
            this.velocity = new Vector();
            this.thruster_status = 0;
            this.bullet_cooldown = 1;
            this.teleport_cooldown = 1;
        }
    }

    //Rotates the ship based on user input
    rotate(delay) {
        const old_angle = this.angle;
        if (this.controls.left) this.angle += delay * this.rotation_speed;
        if (this.controls.right) this.angle -= delay * this.rotation_speed;
        this.bounds.rotate(this.angle - old_angle, this.position);
        while (this.angle >= Math.PI * 2) this.angle -= Math.PI * 2;
        while (this.angle < 0) this.angle += Math.PI * 2;
    }

    //Moves the ship based on the thruster activation
    move(delay) {
        const direction = new Vector(Math.cos(this.angle), -Math.sin(this.angle));
        if (this.teleport_buffer == 0 && this.controls.forward) {
            direction.mul(this.acceleration);
            this.velocity.add(Vector.mul(direction, delay));
            this.thruster_status += this.thruster_flash_rate * delay;
            while (this.thruster_status >= 1)
                this.thruster_status--;
            this.accelerating = true;
        }
        else {
            this.accelerating = false;
            this.thruster_status = 0;
        }
        const initial_velocity = this.velocity.copy();
        this.velocity.mul(1 / (Math.E ** (this.drag_coefficient * delay)));
        this.position = Vector.div(Vector.add(Vector.mul(this.position, this.drag_coefficient), Vector.sub(initial_velocity, this.velocity)), this.drag_coefficient);
    }

    //Manage firing
    fire(delay, ship_bullets) {
        if (this.controls.fire && this.bullet_cooldown >= 1 && this.teleport_buffer <= 0) {
            const direction = new Vector(Math.cos(this.angle), -Math.sin(this.angle));
            direction.mul(this.width / 2 + 5);
            const bullet_position = Vector.add(direction, this.position);
            direction.normalize();
            const bullet_velocity = Vector.mul(direction, this.bullet_speed);
            bullet_velocity.add(this.velocity);
            ship_bullets.push(new Bullet(bullet_position, bullet_velocity, this.bullet_life));
            this.bullet_cooldown = 0;
        }
        this.bullet_cooldown = Math.min(1, this.bullet_cooldown + this.fire_rate * delay);
    }

    //Manages the teleportation of the ship
    updateTeleportation(delay) {
        if (this.controls.teleport && this.teleport_cooldown >= 1 && this.teleport_buffer <= 0) {
            this.teleport_location = new Vector(Math.floor(random() * canvas_bounds.width), Math.floor(random() * canvas_bounds.height));
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
    updateInvincibility(delay) {
        if (this.invincibility > 0) {
            this.invincibility_flash += this.invincibility_flash_rate * delay;
            while (this.invincibility_flash >= 1)
                this.invincibility_flash--;
        }
        this.invincibility = Math.max(0, this.invincibility - delay);
    }

    //Updates the ship
    update(delay, ship_bullets) {

        //Sequence to manage ship survival
        if (this.dead && this.lives > 0)
            this.reviveShip();
        if (this.dead) return;

        //Sequence to update position (including moving and teleporting)
        this.rotate(delay);
        const old_position = this.position.copy();
        this.move(delay);
        this.updateTeleportation(delay);
        wrap(this.position);
        this.bounds.translate(Vector.sub(this.position, old_position));

        //Shoots if player says so and player isn't teleporting
        this.fire(delay, ship_bullets);

        //Update's ship's invincibility frames
        this.updateInvincibility(delay);

    }

    //Checks if the ship has collided with a bullet
    checkBulletCollision(bullet, explosions) {
        if (bullet.dead || this.dead || this.invincibility > 0 || this.teleport_buffer != 0)
            return false;
        const horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        const vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const hit = this.bounds.containsPoint(Vector.add(bullet.position, new Vector(horizontal[i], vertical[j])));
                if (hit) {
                    this.dead = bullet.dead = true;
                    explosions.push(new Explosion(this.position));
                    return true;
                }
            }    
        }
        return false;
    }

    //Checks if the ship has collided with a polygon
    checkPolygonCollision(item, explosions) {
        if (item.dead || this.dead || this.invincibility > 0 || this.teleport_buffer != 0)
            return false;
        const horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        const vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        let old_offset = new Vector();
        const shifted_bounds = this.bounds.copy();
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                shifted_bounds.translate(Vector.sub(new Vector(horizontal[i], vertical[j]), old_offset));
                old_offset = new Vector(horizontal[i], vertical[j]);
                const hit = item.bounds.intersectsPolygon(shifted_bounds);
                if (hit) {
                    this.dead = item.dead = true;
                    explosions.push(new Explosion(item.position));
                    explosions.push(new Explosion(this.position));
                    return true;
                }
            }    
        }
        return false;
    }

    //Checks if the ship has collided with an asteroid (applies split to asteroid)
    checkAsteroidCollision(split_asteroids, wave, asteroid, explosions) {
        if (this.checkPolygonCollision(asteroid, explosions))
            asteroid.destroy(split_asteroids, wave);
    }

    //Checks if the ship has collided with a saucer
    checkSaucerCollision(saucer, explosions) {
        if (saucer.dead || this.dead || this.invincibility > 0 || this.teleport_buffer != 0)
            return false;
        const horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        const vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        let old_offset = new Vector();
        const shifted_bounds = this.bounds.copy();
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if ((horizontal[i] != 0 && !saucer.entered_x) || (vertical[i] != 0 && !saucer.entered_y))
                    continue;
                shifted_bounds.translate(Vector.sub(new Vector(horizontal[i], vertical[j]), old_offset));
                old_offset = new Vector(horizontal[i], vertical[j]);
                const hit = saucer.bounds.intersectsPolygon(shifted_bounds);
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

//Class for asteroid
class Asteroid {

    //Tweaks the shape of the asteroid to allow for better scaling
    static analyzeAsteroidConfigurations() {
        for (let i = 0; i < asteroid_configurations.shapes.length; i++) {
            const rect = asteroid_configurations.shapes[i].getRect();
            const shift = new Vector(-rect.left, -rect.top);
            asteroid_configurations.shapes[i].translate(shift);
        }
    }

    constructor(position, size, wave) {
        const type = Math.floor(randomInRange([0, 3]));
        this.size = size;
        this.bounds = asteroid_configurations.shapes[type].copy();
        this.bounds.scale(asteroid_configurations.sizes[size]);
        this.rect = this.bounds.getRect();
        this.bounds.translate(new Vector(-this.rect.width / 2, -this.rect.height / 2));
        this.position = position;
        this.bounds.translate(this.position);
        this.angle = randomInRange([0, Math.PI * 2]);
        this.bounds.rotate(this.angle, this.position);
        this.rotation_speed = randomInRange(asteroid_configurations.rotation_speed);
        if (Math.floor(random() * 2) == 1)
            this.rotation_speed *= -1;
        const velocity_angle = random() * Math.PI * 2;
        this.velocity = new Vector(Math.cos(velocity_angle), Math.sin(velocity_angle));
        const speed = randomInRange(asteroid_configurations.speed_scaling(wave));
        this.velocity.mul(asteroid_configurations.size_speed[size] * speed);
        this.dead = false;
        this.entity = 'a';
    }

    //Rotates the asteroid
    rotate(delay) {
        const old_angle = this.angle;
        this.angle += this.rotation_speed * delay;
        this.bounds.rotate(this.angle - old_angle, this.position);
        while (this.angle < 0) this.angle += 2 * Math.PI;
        while (this.angle >= 2 * Math.PI) this.angle -= 2 * Math.PI;
    }

    //Updates the position of the asteroid
    updatePosition(delay) {
        const old_position = this.position.copy();
        this.position.add(Vector.mul(this.velocity, delay));
        wrap(this.position);
        this.bounds.translate(Vector.sub(this.position, old_position));
    }

    //Updates the asteroid as a whole
    update(delay) {
        this.rotate(delay);
        this.updatePosition(delay);
        //Updates the bounding rect of the asteroid based on the rotation and translation
        this.rect = this.bounds.getRect();
    }

    //Splits the asteroid in two
    destroy(split_asteroids, wave) {
        this.dead = true;
        if (this.size == 0)
            return;
        const asteroid_1 = new Asteroid(this.position.copy(), this.size - 1, wave);
        const asteroid_2 = new Asteroid(this.position.copy(), this.size - 1, wave);
        split_asteroids.push(asteroid_1);
        split_asteroids.push(asteroid_2);
    }

}

//Class for saucer
class Saucer {

    //Tweaks the saucer bounds a little bit to allow for proper scaling
    static analyzeSaucerConfigurations() {
        const rect = saucer_configurations.shape.getRect();
        saucer_configurations.shape.translate(new Vector(-rect.left, -rect.top));
    }

    constructor(size, wave) {
        this.bounds = saucer_configurations.shape.copy();
        this.size = size;
        this.bounds.scale(saucer_configurations.sizes[this.size]);
        this.rect = this.bounds.getRect();
        this.bounds.translate(new Vector(-this.rect.width / 2, -this.rect.height / 2));
        this.position = new Vector();
        this.position.y = randomInRange([this.rect.height / 2, canvas_bounds.height - this.rect.height / 2]);
        if (Math.floor(randomInRange([0, 2])) == 0)
            this.position.x = -this.rect.width / 2;
        else
            this.position.x = canvas_bounds.width + this.rect.width / 2;
        this.bounds.translate(this.position);
        this.velocity = new Vector(randomInRange(saucer_configurations.speed_scaling(wave)), 0);
        if (this.position.x > canvas_bounds.width)
            this.velocity.x *= -1;
        this.direction_change_rate = saucer_configurations.direction_change_rate(wave);
        this.direction_change_cooldown = 1;
        this.vertical_movement = 1;
        if (Math.floor(randomInRange([0, 2])) == 0)
            this.vertical_movement = -1;
        this.entered_x = this.entered_y = false;
        this.bullet_life = saucer_configurations.bullet_life;
        this.fire_rate = randomInRange(saucer_configurations.fire_rate(wave));
        this.bullet_cooldown = 0;
        this.bullet_speed = randomInRange(saucer_configurations.bullet_speed(wave));
        this.dead = false;
        this.entity = 's';
    }

    //Updates the position of the saucer
    updatePosition(delay) {
        //Changes the firection of the saucer if probability says so (movement goes from diagonal to horizontal or horizontal to diagonal)
        if (this.direction_change_cooldown <= 0) {
            if (Math.floor(randomInRange([0, 2])) == 0) {
                let direction = this.velocity.x / Math.abs(this.velocity.x);
                if (this.velocity.y == 0) {
                    const new_velocity = new Vector(direction, this.vertical_movement);
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
        const old_position = this.position.copy();
        this.position.add(Vector.mul(this.velocity, delay));
        wrap(this.position, this.entered_x, this.entered_y);
        this.bounds.translate(Vector.sub(this.position, old_position));
        //Checks if the wrap effect should be applied on each axis for the saucer (only if the saucer has fully entered the map on one direction)
        this.entered_x |= (this.position.x <= canvas_bounds.width - this.rect.width / 2 && this.position.x >= this.rect.width / 2);
        this.entered_y |= (this.position.y >= this.rect.height / 2 && this.position.y <= canvas_bounds.height - this.rect.height / 2);
    }

    //Calculates the best direction to fire for the saucer
    bestFireDirection(ship) {
        const horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        const vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        let best = Vector.sub(ship.position, this.position);
        for (let i = 0; i < 3; i++)
            for (let j = 0; j < 3; j++) {
                if (i == 0 && j == 0) continue;
                const shifted_position = Vector.add(this.position, new Vector(horizontal[i], vertical[j]));
                const choice = Vector.sub(ship.position, shifted_position);
                if (choice.mag() < best.mag())
                    best = choice;
            }
        return best;
    }

    //Manages the saucer's shooting system
    fire(ship, saucer_bullets, delay) {
        if (this.bullet_cooldown >= 1) {
            const bullet_velocity = this.bestFireDirection(ship);
            bullet_velocity.normalize();
            bullet_velocity.mul(this.bullet_speed);
            const bullet_position = this.position.copy();
            bullet_position.add(bullet_velocity);
            saucer_bullets.push(new Bullet(bullet_position, bullet_velocity, this.bullet_life));
            this.bullet_cooldown = 0;
        }
        this.bullet_cooldown = Math.min(1, this.bullet_cooldown + this.fire_rate * delay);
    }

    update(ship, saucer_bullets, delay) {
        this.updatePosition(delay);
        this.fire(ship, saucer_bullets, delay);
    }

    //Checks collision of a saucer with a generic object
    checkCollision(item, explosions) {
        if (item.dead || this.dead)
            return false;
        const horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        const vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        let old_offset = new Vector();
        const shifted_bounds = this.bounds.copy();
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if ((horizontal[i] != 0 && !this.entered_x) || (vertical[i] != 0 && !this.entered_y))
                    continue;
                shifted_bounds.translate(Vector.sub(new Vector(horizontal[i], vertical[j]), old_offset));
                old_offset = new Vector(horizontal[i], vertical[j]);
                const hit = item.bounds.intersectsPolygon(shifted_bounds);
                if (hit) {
                    this.dead = item.dead = true;
                    explosions.push(new Explosion(item.position));
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
    
    constructor (controls, title_screen = false) {
        seed = 1;
        this.ship = new Ship(controls);
        this.ship_bullets = [];
        this.wave = 8;
        this.asteroids = [];
        this.explosions = [];
        this.saucers = [];
        this.saucer_bullets = [];
        this.score = 0;
        this.extra_lives = 0;
        this.saucer_cooldown = 0;
        this.title_screen = title_screen;
        this.title_flash = 0;
        this.title_flash_rate = 0.025;
        this.paused = false;
        this.old_pause = false;
        this.controls = controls;
        this.time = 0;
    }

    //Make asteroids from scratch
    makeAsteroids() {
        const count = asteroid_configurations.spawn_count(this.wave);
        for (let i = 0; i < count; i++) {
            let position = new Vector(randomInRange([0, canvas_bounds.width]), randomInRange([0, canvas_bounds.height]));
            let distance = position.dist(this.ship.position);
            while (distance < asteroid_configurations.max_rect.width * 2) {
                position = new Vector(randomInRange([0, canvas_bounds.width]), randomInRange([0, canvas_bounds.height]));
                distance = position.dist(this.ship.position);
            }
            this.asteroids.push(new Asteroid(position, 2, this.wave));
        }
    }

    //Make a saucer
    makeSaucer(delay) {
        if (this.saucer_cooldown >= 1) {
            this.saucers.push(new Saucer(Math.floor(randomInRange([ 0, saucer_configurations.sizes.length ])), this.wave));
            this.saucer_cooldown = 0;
        }
        this.saucer_cooldown = Math.min(1, this.saucer_cooldown + saucer_configurations.spawn_rate(this.wave) * delay);
    }

    //Update loop function (true means that the game has ended and false means that the game is still in progress)
    update(delay) {

        //Check if the game has been paused or unpaused
        if (!this.title_screen && !(this.ship.dead && this.ship.lives <= 0) && !this.paused && this.controls.pause && !this.old_pause)
            this.paused = true;
        else if (this.paused && this.controls.pause && !this.old_pause)
            this.paused = false;
        
        //Update the wave of the game
        this.wave = this.score / 1000 + 8;

        //Check if the game is paused, over, or beginning and update the flash animation (also check if player is dead)
        if (this.title_screen || (this.ship.dead && this.ship.lives <= 0) || this.paused) {
            this.title_flash += this.title_flash_rate * delay;
            while (this.title_flash >= 1)
                this.title_flash--;
            return true;
        }

        //See if the pause button was down in the previous frame
        this.old_pause = this.controls.pause;

        //Don't update the game if the game is paused
        if (this.paused) return;

        //Check if the asteroids have been cleared, and if so, make new ones
        if (this.asteroids.length == 0)
            this.makeAsteroids();

        //Check if we need to make a new saucer and if so, then make one
        if (!this.title_screen && this.saucers.length == 0)
            this.makeSaucer(delay);

        //Check if player get's an extra life
        if (this.score >= (1 + this.extra_lives) * point_values.extra_life && this.ship.lives != 0) {
            this.ship.lives++;
            this.extra_lives++;
        }

        //Update each asteroid, saucer, and ship (everything but collision stuff)
        if (!this.title_screen)
            this.ship.update(delay, this.ship_bullets);
        for (let i = 0; i < this.ship_bullets.length; i++)
            this.ship_bullets[i].update(delay);
        for (let i = 0; i < this.asteroids.length; i++)
            this.asteroids[i].update(delay);
        for (let i = 0; i < this.saucers.length; i++)
            this.saucers[i].update(this.ship, this.saucer_bullets, delay);
        for (let i = 0; i < this.saucer_bullets.length; i++)
            this.saucer_bullets[i].update(delay);

        //Stores the asteroids created from hits
        const split_asteroids = [];

        //Check if an asteroid, saucer bullet, or saucer hit the ship
        if (!this.title_screen) {
            for (let i = 0; i < this.saucer_bullets.length; i++)
                this.ship.checkBulletCollision(this.saucer_bullets[i], this.explosions);
            for (let i = 0; i < this.saucers.length; i++)
                this.ship.checkSaucerCollision(this.saucers[i], this.explosions);
            for (let i = 0; i < this.asteroids.length; i++)
                this.ship.checkAsteroidCollision(split_asteroids, this.wave, this.asteroids[i], this.explosions);
        }

        //Check if a player bullet hit an asteroid or saucer
        const new_ship_bullets = [];
        for (let i = 0; i < this.ship_bullets.length; i++) {
            for (let j = 0; j < this.asteroids.length; j++) {
                const hit = this.ship_bullets[i].checkAsteroidCollision(split_asteroids, this.wave, this.asteroids[j], this.explosions);
                if (hit && this.ship.lives != 0)
                    this.score += point_values.asteroids;
            }
            for (let j = 0; j < this.saucers.length; j++) {
                const hit = this.ship_bullets[i].checkCollision(this.saucers[j], this.explosions);
                if (hit && this.ship.lives != 0)
                    this.score += point_values.saucers;
            }
            if (!this.ship_bullets[i].dead)
                new_ship_bullets.push(this.ship_bullets[i]);    
        }
        this.ship_bullets = new_ship_bullets;

        //Check if a saucer is dead
        const new_saucers = [];
        for (let i = 0; i < this.saucers.length; i++) {
            if (!this.saucers[i].dead)
                new_saucers.push(this.saucers[i]);
        }
        this.saucers = new_saucers;

        //Check if a saucer bullet is dead
        const new_saucer_bullets = [];
        for (let i = 0; i < this.saucer_bullets.length; i++) {
            if (!this.saucer_bullets[i].dead)
                new_saucer_bullets.push(this.saucer_bullets[i]);
        }
        this.saucer_bullets = new_saucer_bullets;

        //For each asteroid created through a collision, add them to the list of total asteroids
        for (let i = 0; i < split_asteroids.length; i++)
            this.asteroids.push(split_asteroids[i]);

        //Check if the asteroid is dead, and if so, remove it from the list of asteroids
        const new_asteroids = [];
        for (let i = 0; i < this.asteroids.length; i++) {
            if (!this.asteroids[i].dead)
                new_asteroids.push(this.asteroids[i]);
        }
        this.asteroids = new_asteroids;

        //Update the explosions from collisions/death
        const new_explosions = [];
        for (let i = 0; i < this.explosions.length; i++) {
            this.explosions[i].update(delay);
            if (!this.explosions[i].dead)
                new_explosions.push(this.explosions[i]);
        }
        this.explosions = new_explosions;

        this.time += delay / 60;

        return false;

    }

}

module.exports = { Game };