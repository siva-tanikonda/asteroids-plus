//Loads external dependencies
const { parentPort } = require("worker_threads");
const { Vector, Rect, Polygon, randomInRange, wrap, solveQuadratic } = require("./math.js");
let thread_id = null;
const seedrandom = require("seedrandom");

//Holds the seeded random number generator
let random = null;

//Constants required to make the canvas game compatible with this Node.js tester
const canvas_bounds = {
    width: 900,
    height: 900
};
const game_speed = 1;
const delay = 1;
const start_wave = 0;
let controls = {
    left: false,
    right: false,
    forward: false,
    fire: false,
    teleport: false,
    start: false,
    pause: false
};
const settings = {
    remove_particles: true,
    game_precision: 25,
    game_lives: 1
};
let game = null;
let ai = null;

//The Game (all settings same, but only 1 life, and no extra life at 10000 pts)
const ship_configuration = {
    width: 30,
    height: 16,
    rear_offset: 6,
    rotation_speed: 4 * Math.PI / 180,
    acceleration: 0.2,
    drag_coefficient: 0.0025,
    fire_rate: 0.05,
    bullet_speed: 10,
    bullet_life: 60,
    trail_length: 8,
    thruster_flash_rate: 0.05,
    teleport_speed: 0.025,
    teleport_recharge_rate: 0.01,
    invincibility_flash_rate: 0.1
};
const asteroid_configurations = {
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
    max_rect: new Rect(0, 0, 75, 75),
    sizes: [ 10, 25, 40 ],
    rotation_speed: [ 0, 0.02 ],
    size_speed: [ 3, 2, 1 ],
    invincibility_time: 100,
    speed_scaling: (wave) => {
        const last_wave = Math.max(1, wave - 1);
        return [ Math.max(1, 1 + 0.1 * Math.log2(last_wave)), Math.max(1, 1 + 0.1 * Math.log2(wave)) ];
    },
    spawn_count: (wave) => {
        return Math.floor((wave * 2 + 2) * (canvas_bounds.width * canvas_bounds.height) / 1e6);
    }
};
const explosion_configuration = {
    particle_count: 15,
    particle_speed: [ 0, 8 ],
    particle_life: [ 30, 60 ],
    particle_drag_coefficient: 0.05,
    particle_radius: [ 1, 2 ]
};
const saucer_configurations = {
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
    sizes: [ 40, 50 ],
    speed_scaling: (wave) => {
        const last_wave = Math.max(1, wave - 1);
        const upper_bound = Math.min(5, 3 + wave / 5);
        const lower_bound = Math.min(5, 3 + last_wave / 5);
        return [ lower_bound, upper_bound ];
    },
    direction_change_rate: (wave) => {
        return Math.min(1e-2, 1 - 1e-2 / wave);
    },
    bullet_speed: (wave) => {
        const last_wave = Math.max(1, wave - 1);
        const upper_bound = Math.min(6, 4 + wave / 10 * 4);
        const lower_bound = Math.min(6, 4 + last_wave / 10 * 4);
        return [ lower_bound, upper_bound ];
    },
    fire_rate: (wave) => {
        const last_wave = Math.max(1, wave - 1);
        const upper_bound = Math.min(0.02, wave / 10 * 0.02);
        const lower_bound = Math.min(0.02, last_wave / 10 * 0.02);
        return [ lower_bound, upper_bound ];
    },
    bullet_life: 200,
    spawn_rate: (wave) => {
        return Math.min(1, wave / 2000);
    }
};
const point_values = {
    asteroids: 50,
    saucers: 0,
    extra_life: Infinity
};
class Particle {
    constructor(position, velocity, drag_coefficient, radius, life) {
        this.position = position;
        this.velocity = velocity;
        this.drag_coefficient = drag_coefficient;
        this.radius = radius;
        this.life = life;
        this.dead = false;
    }
    updatePosition(delay) {
        const initial_velocity = this.velocity.copy();
        this.velocity.mul(1 / (Math.E ** (this.drag_coefficient * delay)));
        this.position = Vector.div(Vector.add(Vector.mul(this.position, this.drag_coefficient), Vector.sub(initial_velocity, this.velocity)), this.drag_coefficient);
        wrap(this.position);
    }
    updateLife(delay) {
        this.life -= delay;
        this.dead |= (this.life <= 0);
    }
    update(delay) {
        this.updatePosition(delay);
        this.updateLife(delay)
    }
}
class Explosion {
    constructor(position) {
        this.particles = [];
        if (!settings.remove_particles) {
            for (let i = 0; i < explosion_configuration.particle_count; i++)
                this.makeParticle(position);
            this.dead = false;
        } else this.dead = true;
    }
    makeParticle(position) {
        if (settings.remove_particles)
            return;
        const speed = randomInRange(random, explosion_configuration.particle_speed);
        const angle = random() * Math.PI * 2;
        const life = randomInRange(random, explosion_configuration.particle_life);
        const unit_vector = new Vector(Math.cos(angle), -Math.sin(angle));
        const radius = randomInRange(random, explosion_configuration.particle_radius);
        this.particles.push(new Particle(position, Vector.mul(unit_vector, speed), explosion_configuration.particle_drag_coefficient, radius, life));
    }
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
class Bullet {
    constructor(position, velocity, life) {
        this.position = position;
        this.velocity = velocity;
        this.life = life;
        this.radius = 0.75;
        this.dead = false;
        this.entity = 'b';
    }
    update(delay) {
        this.position.add(Vector.mul(this.velocity, delay));
        wrap(this.position);
        this.life -= delay;
        this.dead |= (this.life <= 0);
    }
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
    checkAsteroidCollision(split_asteroids, wave, asteroid, explosions) {
        if (asteroid.invincibility > 0) return false;
        const hit = this.checkCollision(asteroid, explosions)
        if (hit)
            asteroid.destroy(split_asteroids, wave);
        return hit;
    }
}
class Ship {
    constructor() {
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
        this.lives = settings.game_lives;
        this.dead = false;
        this.invincibility = 0;
        this.invincibility_time = 100;
        this.invincibility_flash = 0;
        this.invincibility_flash_rate = ship_configuration.invincibility_flash_rate;
        this.accelerating = false;
        this.entity = 'p';
    }
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
    rotate(delay) {
        const old_angle = this.angle;
        if (controls.left) this.angle += delay * this.rotation_speed;
        if (controls.right) this.angle -= delay * this.rotation_speed;
        this.bounds.rotate(this.angle - old_angle, this.position);
        while (this.angle >= Math.PI * 2) this.angle -= Math.PI * 2;
        while (this.angle < 0) this.angle += Math.PI * 2;
    }
    move(delay) {
        const direction = new Vector(Math.cos(this.angle), -Math.sin(this.angle));
        if (this.teleport_buffer == 0 && controls.forward) {
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
    fire(delay, ship_bullets) {
        if (controls.fire && this.bullet_cooldown >= 1 && this.teleport_buffer <= 0) {
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
    updateTeleportation(delay) {
        if (controls.teleport && this.teleport_cooldown >= 1 && this.teleport_buffer <= 0) {
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
    updateInvincibility(delay) {
        if (this.invincibility > 0) {
            this.invincibility_flash += this.invincibility_flash_rate * delay;
            while (this.invincibility_flash >= 1)
                this.invincibility_flash--;
        }
        this.invincibility = Math.max(0, this.invincibility - delay);
    }
    update(delay, ship_bullets) {
        if (this.dead && this.lives > 0)
            this.reviveShip();
        if (this.dead) return;
        this.rotate(delay);
        const old_position = this.position.copy();
        this.move(delay);
        this.updateTeleportation(delay);
        wrap(this.position);
        this.bounds.translate(Vector.sub(this.position, old_position));
        this.fire(delay, ship_bullets);
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
        if (asteroid.invincibility <= 0 && this.checkPolygonCollision(asteroid, explosions))
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
class Asteroid {
    static analyzeAsteroidConfigurations() {
        for (let i = 0; i < asteroid_configurations.shapes.length; i++) {
            const rect = asteroid_configurations.shapes[i].getRect();
            const shift = new Vector(-rect.left, -rect.top);
            asteroid_configurations.shapes[i].translate(shift);
        }
    }
    constructor(position, size, wave) {
        const type = Math.floor(randomInRange(random, [0, 3]));
        this.size = size;
        if (!game.title_screen && size == 2)
            this.invincibility = asteroid_configurations.invincibility_time;
        else this.invincibility = 0;
        this.bounds = asteroid_configurations.shapes[type].copy();
        this.bounds.scale(asteroid_configurations.sizes[size]);
        this.rect = this.bounds.getRect();
        this.bounds.translate(new Vector(-this.rect.width / 2, -this.rect.height / 2));
        this.position = position;
        this.bounds.translate(this.position);
        this.angle = randomInRange(random, [0, Math.PI * 2]);
        this.bounds.rotate(this.angle, this.position);
        this.rotation_speed = randomInRange(random, asteroid_configurations.rotation_speed);
        if (Math.floor(random() * 2) == 1)
            this.rotation_speed *= -1;
        const velocity_angle = random() * Math.PI * 2;
        this.velocity = new Vector(Math.cos(velocity_angle), Math.sin(velocity_angle));
        const speed = randomInRange(random, asteroid_configurations.speed_scaling(wave));
        this.velocity.mul(asteroid_configurations.size_speed[size] * speed);
        this.dead = false;
        this.entity = 'a';
    }
    rotate(delay) {
        const old_angle = this.angle;
        this.angle += this.rotation_speed * delay;
        this.bounds.rotate(this.angle - old_angle, this.position);
        while (this.angle < 0) this.angle += 2 * Math.PI;
        while (this.angle >= 2 * Math.PI) this.angle -= 2 * Math.PI;
    }
    updatePosition(delay) {
        const old_position = this.position.copy();
        this.position.add(Vector.mul(this.velocity, delay));
        wrap(this.position);
        this.bounds.translate(Vector.sub(this.position, old_position));
    }
    update(delay) {
        this.rotate(delay);
        this.updatePosition(delay);
        this.rect = this.bounds.getRect();
        if (this.invincibility > 0)
            this.invincibility -= delay;
    }
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
class Saucer {
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
        this.position.y = randomInRange(random, [this.rect.height / 2, canvas_bounds.height - this.rect.height / 2]);
        if (Math.floor(randomInRange(random, [0, 2])) == 0)
            this.position.x = -this.rect.width / 2;
        else
            this.position.x = canvas_bounds.width + this.rect.width / 2;
        this.bounds.translate(this.position);
        this.velocity = new Vector(randomInRange(random, saucer_configurations.speed_scaling(wave)), 0);
        if (this.position.x > canvas_bounds.width)
            this.velocity.x *= -1;
        this.direction_change_rate = saucer_configurations.direction_change_rate(wave);
        this.direction_change_cooldown = 1;
        this.vertical_movement = 1;
        if (Math.floor(randomInRange(random, [0, 2])) == 0)
            this.vertical_movement = -1;
        this.entered_x = this.entered_y = false;
        this.bullet_life = saucer_configurations.bullet_life;
        this.fire_rate = randomInRange(random, saucer_configurations.fire_rate(wave));
        this.bullet_cooldown = 0;
        this.bullet_speed = randomInRange(random, saucer_configurations.bullet_speed(wave));
        this.dead = false;
        this.entity = 's';
    }
    updatePosition(delay) {
        if (this.direction_change_cooldown <= 0) {
            if (Math.floor(randomInRange(random, [0, 2])) == 0) {
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
        const old_position = this.position.copy();
        this.position.add(Vector.mul(this.velocity, delay));
        wrap(this.position, this.entered_x, this.entered_y);
        this.bounds.translate(Vector.sub(this.position, old_position));
        this.entered_x |= (this.position.x <= canvas_bounds.width - this.rect.width / 2 && this.position.x >= this.rect.width / 2);
        this.entered_y |= (this.position.y >= this.rect.height / 2 && this.position.y <= canvas_bounds.height - this.rect.height / 2);
    }
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
class Game {
    constructor (title_screen = false) {
        this.ship = new Ship();
        this.ship_bullets = [];
        this.wave = start_wave;
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
        this.time = 0;
    }
    makeAsteroids() {
        const count = asteroid_configurations.spawn_count(this.wave);
        for (let i = 0; i < count; i++) {
            let position = new Vector(randomInRange(random, [0, canvas_bounds.width]), randomInRange(random, [0, canvas_bounds.height]));
            let distance = position.dist(this.ship.position);
            while (distance < asteroid_configurations.max_rect.width * 2) {
                position = new Vector(randomInRange(random, [0, canvas_bounds.width]), randomInRange(random, [0, canvas_bounds.height]));
                distance = position.dist(this.ship.position);
            }
            this.asteroids.push(new Asteroid(position, 2, this.wave));
        }
    }
    makeSaucer(delay) {
        if (this.saucer_cooldown >= 1) {
            this.saucers.push(new Saucer(Math.floor(randomInRange(random, [ 0, saucer_configurations.sizes.length ])), this.wave));
            this.saucer_cooldown = 0;
        }
        this.saucer_cooldown = Math.min(1, this.saucer_cooldown + saucer_configurations.spawn_rate(this.wave) * delay);
    }
    update(delay) {
        if (!this.title_screen && !(this.ship.dead && this.ship.lives <= 0) && !this.paused && controls.pause && !this.old_pause)
            this.paused = true;
        else if (this.paused && controls.pause && !this.old_pause)
            this.paused = false;
        if (this.title_screen || (this.ship.dead && this.ship.lives <= 0) || this.paused) {
            this.title_flash += this.title_flash_rate * delay;
            while (this.title_flash >= 1)
                this.title_flash--;
            if (!this.paused) {
                if (!this.ship.dead)
                    this.title_screen = false;
                return true;
            }
        }
        this.old_pause = controls.pause;
        if (this.paused) return;
        if (this.asteroids.length == 0) {
            this.wave++;
            this.makeAsteroids();
        }
        if (!this.title_screen && this.saucers.length == 0)
            this.makeSaucer(delay);
        if (this.score >= (1 + this.extra_lives) * point_values.extra_life && this.ship.lives != 0) {
            this.ship.lives++;
            this.extra_lives++;
        }
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
        const split_asteroids = [];
        if (!this.title_screen) {
            for (let i = 0; i < this.saucer_bullets.length; i++)
                this.ship.checkBulletCollision(this.saucer_bullets[i], this.explosions);
            for (let i = 0; i < this.saucers.length; i++)
                this.ship.checkSaucerCollision(this.saucers[i], this.explosions);
            for (let i = 0; i < this.asteroids.length; i++)
                this.ship.checkAsteroidCollision(split_asteroids, this.wave, this.asteroids[i], this.explosions);
        }
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
        const new_saucers = [];
        for (let i = 0; i < this.saucers.length; i++) {
            if (!this.saucers[i].dead)
                new_saucers.push(this.saucers[i]);
        }
        this.saucers = new_saucers;
        const new_saucer_bullets = [];
        for (let i = 0; i < this.saucer_bullets.length; i++) {
            if (!this.saucer_bullets[i].dead)
                new_saucer_bullets.push(this.saucer_bullets[i]);
        }
        this.saucer_bullets = new_saucer_bullets;
        for (let i = 0; i < split_asteroids.length; i++)
            this.asteroids.push(split_asteroids[i]);
        const new_asteroids = [];
        for (let i = 0; i < this.asteroids.length; i++) {
            if (!this.asteroids[i].dead)
                new_asteroids.push(this.asteroids[i]);
        }
        this.asteroids = new_asteroids;
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

//The AI
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
        let size_index;
        if (item.entity == "b") size_index = 0;
        else if (item.entity == "p") size_index = 1;
        else if (item.entity == "a") size_index = 2 + item.size;
        else size_index = 5 + item.size;
        this.size = AI.danger_radius[size_index];
        this.position = item.position.copy();
        this.velocity = item.velocity.copy();
        this.danger_level = ai.calculateDanger(this);
        this.entity = "d";
        if (this.danger_level >= 1)
            ai.in_danger = true;
        if (size_index >= 5)
            ai.saucer_exists = true;
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
        this.controls = {
            left: false,
            right: false,
            forward: false,
            fire: false
        };
        this.C = C;
        this.in_danger = false;
        this.dangers = [];
        this.targets = [];
        this.markers = [];
        this.crosshair = null;
        this.ship = null;
        this.flee_values = [ 0, 0, 0, 0 ];
        this.nudge_values = [ 0, 0, 0, 0 ];
        this.size_groups = [ 0, 0 ];
        this.saucer_exists = false;
    }
    calculateDanger(danger) {
        const p = optimizeInWrap((offset) => {
            return Vector.sub(Vector.add(danger.position, offset), this.ship.position);
        }, (best, next) => {
            return (best == null || next.mag() < best.mag());
        });
        let result = 0;
        let danger_velocity_term = Math.max(0, -p.comp(danger.velocity));
        result += this.C[2] * (danger_velocity_term ** this.C[3]);
        danger_velocity_term = Math.max(0, p.comp(danger.velocity));
        result -= this.C[28] * (danger_velocity_term ** this.C[29]);
        let ship_velocity_term = Math.max(0, p.comp(this.ship.velocity));
        result += this.C[4] * (ship_velocity_term ** this.C[5]);
        ship_velocity_term = Math.max(0, -p.comp(this.ship.velocity));
        result -= this.C[6] * (ship_velocity_term ** this.C[7]);
        let ship_direction_term = new Vector(Math.cos(this.ship.angle), Math.sin(-this.ship.angle));
        ship_direction_term = Math.max(0, p.comp(ship_direction_term)); 
        result += this.C[8] * (ship_direction_term ** this.C[9]);
        ship_direction_term = new Vector(Math.cos(this.ship.angle), Math.sin(-this.ship.angle));
        ship_direction_term = Math.max(0, -p.comp(ship_direction_term)); 
        result -= this.C[26] * (ship_direction_term ** this.C[27]);
        let distance_term = 1 / Math.max(1, p.mag() - this.ship.size - danger.size);
        result += this.C[1];
        result *= (distance_term ** this.C[0]);
        result = Math.max(0, result);
        return result;
    }
    generateVirtualEntities() {
        if (!game.title_screen && !game.ship.dead)
            this.ship = new VirtualShip(game.ship);
        this.dangers = [];
        this.targets = [];
        this.in_danger = false;
        this.saucer_exists = false;
        this.flee_values = [ 0, 0, 0, 0 ];
        this.nudge_values = [ 0, 0, 0, 0 ];
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
                this.flee_values[0] += this.C[10] * ((-p.y) ** this.C[11]);
            else
                this.flee_values[1] += this.C[10] * (p.y ** this.C[11]);
            this.nudge_values[2] += this.C[18] * (Math.abs(p.y) ** this.C[19]);
            if (p.x > 0) {
                this.flee_values[2] += this.C[12] * (p.x ** this.C[13]);
                this.nudge_values[0] += this.C[20] * (p.x ** this.C[21]);
                this.nudge_values[1] += this.C[20] * (p.x ** this.C[21]);
            }
            else {
                this.flee_values[3] += this.C[14] * ((-p.x) ** this.C[15]);
                this.nudge_values[0] += this.C[16] * ((-p.x) ** this.C[17]);
                this.nudge_values[1] += this.C[16] * ((-p.x) ** this.C[17]);
            }
        }
    }
    manageFleeing() {
        this.crosshair = null;
        if (this.flee_values[0] + this.nudge_values[0] >= 1 && this.flee_values[1] < 1)
            this.controls.left = true;
        if (this.flee_values[1] + this.nudge_values[1] >= 1 && this.flee_values[0] < 1)
            this.controls.right = true;
        if (this.controls.left && this.controls.right) {
            if (this.flee_values[0] >= this.flee_values[1])
                this.controls.right = false;
            else this.controls.left = false;
        }
        if (this.flee_values[2] + this.nudge_values[2] >= 1 && this.flee_values[3] < 1)
            this.controls.forward = true;
        if (this.flee_values[0] >= 1 && this.flee_values[1] >= 1 && this.flee_values[3] >= 1) {
            if (this.flee_values[0] >= this.flee_values[1])
                this.controls.left = true;
            else this.controls.right = true;
        }
    }
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
    predictStates(step) {
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
        for (let i = 0; i < this.targets.length; i++) {
            this.targets[i].position.add(Vector.mul(this.targets[i].velocity, step));
            wrap(this.targets[i].position);
        }
    }
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
    getShortestDistance(v1, v2) {
        return optimizeInWrap((offset) => {
            return Vector.sub(Vector.add(v1, offset), v2).mag();
        }, (best, next) => {
            return (best == null || next < best);
        });
    }
    checkBulletCollisionTime(target, pessimistic_size = false) {
        return optimizeInWrap((offset) => {
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
            if (result >= this.ship.bullet_life - 1 || (target.size > 0 && target.size < 3 && Vector.add(p1, Vector.mul(v1, result)) - target.size < this.C[22])) return null;
            return result;
        }, (best, next) => {
            return (best == null || (next != null && best > next));
        });
    }
    checkCollateralDamage(target) {
        for (let i = 0; i < this.targets.length; i++) {
            const result = this.checkBulletCollisionTime(this.targets[i], true);
            if (result != null && !Object.is(target, this.targets[i])) return true;
        }
        return false;
    }
    checkClutterViolation(target) {
        if (target.size_index >= 3 || target.size_index == 0) return false;
        let extra_size_groups = [ 0, 0 ];
        for (let i = 0; i < this.markers.length; i++) {
            if (this.markers[i].reference.entity == 'a' && this.markers[i].reference.size == 2) extra_size_groups[1] += 2;
            else if (this.markers[i].reference.entity == 'a' && this.markers[i].reference.size == 1) extra_size_groups[0] += 2;
        }
        if (target.size_index == 1) {
            if (this.size_groups[0] + extra_size_groups[0] == 0) return false;
            if (this.size_groups[0] + extra_size_groups[0] + 2 > this.C[23]) return true;
            if (this.size_groups[0] + extra_size_groups[0] + this.size_groups[1] + extra_size_groups[1] + 1 > this.C[24]) return true;
        } else if (target.size_index == 2) {
            if (this.size_groups[0] + extra_size_groups[0] + this.size_groups[1] + extra_size_groups[1] + 2 > this.C[24]) return true;
        }
        return false;
    }
    checkShootingOpportunity() {
        let destroyed = null;
        let min_time = Infinity;
        for (let i = 0; i < this.targets.length; i++) {
            if (this.targets[i].size_index < 3 && this.targets[i].reference.invincibility > 0) continue;
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
    manageShooting(delay) {
        if (this.ship.bullet_cooldown < 1) return;
        this.predictStates(delay / settings.game_precision);
        const opportunity = this.checkShootingOpportunity();
        if (opportunity[0] != null) {
            this.controls.fire = true;
            this.markers.push(new Marker(opportunity[1] + 1, opportunity[0]));
        }
    }
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
    manageAim(delay) {
        if (this.crosshair != null && (this.targetMarked(this.crosshair) || this.crosshair.life <= 0))
            this.crosshair = null;
        if (this.ship.velocity.mag() < this.C[25] && this.saucer_exists)
            this.controls.forward = true;
        if (this.crosshair == null) {
            let angle_offset = 0;
            let target = null;
            let aim_angle = null;
            let iterations = 0;
            this.predictStates(delay);
            while (angle_offset <= Math.PI) {
                this.ship.angle += angle_offset;
                while (this.ship.angle >= Math.PI * 2) this.ship.angle -= Math.PI * 2;
                let result = this.checkShootingOpportunity();
                if (result[0] != null) {
                    target = result[0];
                    this.ship.angle -= angle_offset;
                    aim_angle = this.ship.angle + angle_offset;
                    break;
                }
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
            } else if (this.ship.velocity.mag() < 1)
                this.controls.forward = true;
        }
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
        if (this.crosshair != null && !game.paused) {
            this.crosshair.life -= delay;
            if (this.crosshair.life <= 0) this.crosshair = null;
        }
    }
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
    resetControls() {
        for (let i in this.controls)
            this.controls[i] = false;
    }
    applyControls() {
        controls.left = this.controls.left;
        controls.right = this.controls.right;
        controls.forward = this.controls.forward;
        controls.fire = this.controls.fire;
    }

}

//Run a test on a specific seed and C-value
function test(C, trial) {
    //Sets initial simulation settings
    controls = {
        left: false,
        right: false,
        forward: false,
        fire: false,
        teleport: false,
        start: false,
        pause: false
    };
    let flee_time = 0;
    random = seedrandom(trial);
    game = new Game();
    ai = new AI(C);
    let dead = false;
    //Runs the game loop
    while (!dead) {
        ai.update(delay);
        if (ai.in_danger) flee_time += delay;
        ai.applyControls();
        const iteration_updates = settings.game_precision * game_speed;
        for (let j = 0; j < iteration_updates; j++) {
            const done = game.update(delay / settings.game_precision);
            if (done) {
                dead = true;
                break;
            }
        }
    }
    return [ game.score, game.time, flee_time ];
}

//Listen for messages of initialization or a new trial to test 
parentPort.on("message", (msg) => {
    if (msg == "exit") {
        parentPort.close();
        return;
    }
    const input = JSON.parse(msg);
    if (input.length > 1) {
        const result = test(input[0], input[2]);
        parentPort.postMessage(JSON.stringify([input[1], result]));
    } else {
        thread_id = input[0];
        parentPort.postMessage(JSON.stringify([]));
    }
});
