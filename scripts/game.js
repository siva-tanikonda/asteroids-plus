var asteroid_configurations = {
    shapes: [
        new Polygon([
            [-0.1, 0],
            [0.75, 0],
            [1.5, 0.4],
            [1.2, 1],
            [1.5, 1.6],
            [1, 2.1],
            [0.45, 1.6],
            [-0.1, 2.1],
            [-0.7, 1.6],
            [-0.7, 0.4]
        ]),
        new Polygon([
            [-0.25, 0],
            [0.75, 0.3],
            [1.15, 0],
            [1.5, 0.5],
            [0.6, 0.9],
            [1.5, 1.35],
            [1.5, 1.55],
            [0.5, 2.1],
            [-0.25, 2.1],
            [0, 1.5],
            [-0.7, 1.5],
            [-0.7, 0.75]
        ]),
        new Polygon([
            [-0.25, 0],
            [0.1, 0.25],
            [1, 0],
            [1.5, 0.75],
            [1, 1.2],
            [1.5, 1.7],
            [1, 2.1],
            [0.4, 1.7],
            [-0.25, 2.1],
            [-0.75, 1.5],
            [-0.4, 0.9],
            [-0.7, 0.4]
        ])
    ],
    max_rect: new Rect(0, 0, 150, 150),
    sizes: [ 12.5, 25, 50 ],
    rotation_speed: [ 0, 0.02 ],
    size_speed: [ 2, 1.5, 1 ],
    speed_scaling: (wave) => {
        var last_wave = Math.max(1, wave - 1);
        return [ Math.max(2, 2 + 0.1 * Math.log2(last_wave)), Math.max(2, 2 + 0.1 * Math.log2(wave))];
    },
    spawn_count: (wave) => {
        return Math.min(7, wave + 4);
    }
};

var explosion_configuration = {
    particle_count: 15,
    particle_speed: [0, 8],
    particle_life: [30, 60],
    particle_drag_coefficient: 0.05,
    particle_radius: [1, 2]
};

var saucer_configurations = {
    shape: new Polygon([
        [0.2, 0],
        [0.6, -0.2],
        [0.2, -0.4],
        [0.15, -0.6],
        [-0.15, -0.6],
        [-0.2, -0.4],
        [-0.6, -0.2],
        [-0.2, 0]
    ]),
    sizes: [ 40, 60 ],
    speed_scaling: (wave) => {
        var last_wave = Math.max(1, wave - 1);
        var upper_bound = Math.min(5, 3 + wave / 5);
        var lower_bound = Math.min(5, 3 + last_wave / 5);
        return [ lower_bound, upper_bound ];
    },
    direction_change_rate: (wave) => {
        return Math.min(1e-2, 1 - 1e-2 / wave);
    },
    bullet_accuracy: (wave) => {
        return Math.PI / 100 * Math.max(0, 100 - 25 * Math.log2(wave));
    },
    bullet_speed: (wave) => {
        var last_wave = Math.max(1, wave - 1);
        var upper_bound = Math.min(9, 4 + wave / 10 * 4);
        var lower_bound = Math.min(9, 4 + last_wave / 10 * 4);
        return [lower_bound, upper_bound];
    },
    fire_rate: (wave) => {
        var last_wave = Math.max(1, wave - 1);
        var upper_bound = Math.min(0.02, wave / 10 * 0.02);
        var lower_bound = Math.min(0.02, last_wave / 10 * 0.02);
        return [lower_bound, upper_bound];
    },
    bullet_life: (wave) => {
        return 80 + 6 * Math.log2(wave);
    },
    spawn_rate: (wave) => {
        return Math.min(1, wave / 1000);
    }
};

var point_values = {
    asteroids: 50,
    saucers: 100
};

function wrap(v, wrap_x = true, wrap_y = true) {
    while (v.x >= canvas_bounds.width && wrap_x)
        v.x -= canvas_bounds.width;
    while (v.x < 0 && wrap_x)
        v.x += canvas_bounds.width;
    while (v.y >= canvas_bounds.height && wrap_y)
        v.y -= canvas_bounds.height;
    while (v.y < 0 && wrap_y)
        v.y += canvas_bounds.height;
}

function renderWrap(position, radius, action, offset_x = true, offset_y = true) {
    var horizontal = [0];
    var vertical = [0];
    if (position.x + radius >= canvas_bounds.width)
        horizontal.push(-canvas_bounds.width);
    if (position.x - radius <= 0)
        horizontal.push(canvas_bounds.width);
    if (position.y + radius >= canvas_bounds.height)
        vertical.push(-canvas_bounds.height);
    if (position.y - radius <= 0)
        vertical.push(canvas_bounds.height);
    for (var i = 0; i < horizontal.length; i++)
        for (var j = 0; j < vertical.length; j++)
            if ((horizontal[i] == 0 || offset_x) && (vertical[i] == 0 || offset_y))
                action(new Vector(horizontal[i], vertical[j]));
}

function drawBounds(item) {
    ctx.fillStyle = 'rgb(200, 100, 100)';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(item.bounds.points[item.bounds.points.length - 1].x, item.bounds.points[item.bounds.points.length - 1].y);
    for (var i = 0; i < item.bounds.points.length; i++)
        ctx.lineTo(item.bounds.points[i].x, item.bounds.points[i].y);
    ctx.fill();
    ctx.globalAlpha = 1;
}

function drawPosition(item) {
    ctx.fillStyle = "rgb(125, 250, 125)";
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(item.position.x, item.position.y, 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
}

function drawVelocity(item) {
    var angle = item.velocity.angle();
    ctx.translate(item.position.x, item.position.y);
    ctx.rotate(angle);
    ctx.translate(-item.position.x, -item.position.y);
    var scale_velocity = item.velocity.mag() * 10;
    ctx.strokeStyle = "rgb(250, 250, 100)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(item.position.x, item.position.y);
    ctx.lineTo(item.position.x + scale_velocity, item.position.y);
    ctx.lineTo(item.position.x + scale_velocity - 5, item.position.y - 5);
    ctx.moveTo(item.position.x + scale_velocity, item.position.y);
    ctx.lineTo(item.position.x + scale_velocity - 5, item.position.y + 5);
    ctx.stroke();
    ctx.resetTransform();
}

function drawAcceleration(item) {
    if (!item.accelerating) return;
    ctx.translate(item.position.x, item.position.y);
    ctx.rotate(-item.angle);
    ctx.translate(-item.position.x, -item.position.y);
    var scale_acceleration = item.acceleration * 250;
    ctx.strokeStyle = "rgb(125, 150, 250)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(item.position.x, item.position.y);
    ctx.lineTo(item.position.x + scale_acceleration, item.position.y);
    ctx.lineTo(item.position.x + scale_acceleration - 5, item.position.y - 5);
    ctx.moveTo(item.position.x + scale_acceleration, item.position.y);
    ctx.lineTo(item.position.x + scale_acceleration - 5, item.position.y + 5);
    ctx.stroke();
    ctx.resetTransform();
}

class Particle {
    constructor(position, velocity, drag_coefficient, radius, life) {
        this.position = position;
        this.velocity = velocity;
        this.drag_coefficient = drag_coefficient;
        this.radius = radius;
        this.life = life;
        this.dead = false;
    }
    update(delay) {
        var initial_velocity = this.velocity.copy();
        this.velocity.mul(1/(Math.E ** (this.drag_coefficient * delay)));
        this.position = Vector.div(Vector.add(Vector.mul(this.position, this.drag_coefficient), Vector.sub(initial_velocity, this.velocity)), this.drag_coefficient);
        wrap(this.position)
        this.life -= delay;
        if (this.life <= 0)
            this.dead = true;
    }
    drawParticle(offset) {
        ctx.translate(offset.x, offset.y);
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.resetTransform();
    }
    draw() {
        renderWrap(this.position, this.radius, (offset) => {
            this.drawParticle(offset);
        });
    }
}

class Explosion {
    constructor(position) {
        this.particles = [];
        for (var i = 0; i < explosion_configuration.particle_count; i++) {
            var speed = randomInRange(explosion_configuration.particle_speed);
            var angle = Math.random() * Math.PI * 2;
            var life = randomInRange(explosion_configuration.particle_life);
            var unit_vector = new Vector(Math.cos(angle), -Math.sin(angle));
            var radius = randomInRange(explosion_configuration.particle_radius);
            this.particles.push(new Particle(position, Vector.mul(unit_vector, speed), explosion_configuration.particle_drag_coefficient, radius, life));
        }
        this.dead = false;
    }
    update(delay) {
        var new_particles = [];
        for (var i = 0; i < this.particles.length; i++) {
            this.particles[i].update(delay);
            if (!this.particles[i].dead)
                new_particles.push(this.particles[i]);
        }
        this.particles = new_particles;
        if (this.particles.length == 0)
            this.dead = true;
    }
    draw() {
        for (var i = 0; i < this.particles.length; i++)
            this.particles[i].draw();
    }
}

class Bullet {

    constructor(position, velocity, life) {
        this.position = position;
        this.velocity = velocity;
        this.life = life;
        this.radius = 0.75;
        this.dead = false;
    }

    update(delay) {
        this.position.add(Vector.mul(this.velocity, delay));
        wrap(this.position);
        this.life -= delay;
        if (this.life <= 0)
            this.dead = true;
    }

    drawBullet(offset) {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1.5;
        ctx.translate(offset.x, offset.y);
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.resetTransform();
    }

    draw() {
        renderWrap(this.position, this.radius, (offset) => {
            this.drawBullet(offset);
        });
    }

    checkCollision(item, explosions) {
        if (item.dead || this.dead)
            return false;
        var horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        var vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                var hit = item.bounds.containsPoint(Vector.add(this.position, new Vector(horizontal[i], vertical[j])));
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
        var hit = this.checkCollision(asteroid, explosions)
        if (hit)
            asteroid.destroy(split_asteroids, wave);
        return hit;
    }

}

class Ship {

    constructor() {
        this.position = new Vector(canvas_bounds.width / 2, canvas_bounds.height / 2);
        this.velocity = new Vector();
        this.width = 30
        this.height = 16;
        this.rear_offset = 6;
        this.bounds = new Polygon([
            [-this.width / 2, -this.height / 2],
            [-this.width / 2, this.height / 2],
            [this.width / 2, 0]
        ]);
        this.angle = Math.PI / 2;
        this.bounds.rotate(this.angle, new Vector());
        this.rotation_speed = 5;
        this.acceleration = 0.1;
        this.drag_coefficient = 0.01;
        this.bullet_cooldown = 1;
        this.fire_rate = 0.05;
        this.bullet_speed = 8;
        this.bullet_life = 60;
        this.trail_length = 8;
        this.thruster_status = 0;
        this.thruster_flash_rate = 0.05;
        this.teleport_buffer = 0;
        this.teleport_speed = 0.025;
        this.teleport_cooldown = 1;
        this.teleport_recharge_rate = 0.005;
        this.teleport_location = new Vector();
        this.bounds.translate(this.position);
        this.lives = 3;
        this.dead = false;
        this.invincibility = 0;
        this.invincibility_time = 100;
        this.invincibility_flash = 0;
        this.invincibility_flash_rate = 0.1;
        this.accelerating = false;
    }

    update(left, right, forward, fire, teleport, delay, ship_bullets) {
        if (this.dead && this.lives > 0) {
            this.lives--;
            if (this.lives > 0) {
                this.invincibility = this.invincibility_time;
                this.dead = false;
                var old_position = this.position.copy();
                this.position = new Vector(canvas_bounds.width / 2, canvas_bounds.height / 2);
                this.bounds.translate(Vector.sub(this.position, old_position));
                var old_angle = this.angle;
                this.angle = Math.PI / 2;
                this.bounds.rotate(this.angle - old_angle, this.position);
                this.velocity = new Vector();
                this.thruster_status = 0;
                this.bullet_cooldown = 1;
                this.teleport_cooldown = 1;
            }
        }
        if (this.dead) return;
        var old_position = this.position.copy();
        var old_angle = this.angle;
        if (left) this.angle += delay * Math.PI * this.rotation_speed / 180;
        if (right) this.angle -= delay * Math.PI * this.rotation_speed / 180;
        this.bounds.rotate(this.angle - old_angle, this.position);
        while (this.angle >= Math.PI * 2) this.angle -= Math.PI * 2;
        while (this.angle < 0) this.angle += Math.PI * 2;
        var direction = new Vector(Math.cos(this.angle), -Math.sin(this.angle));
        if (this.teleport_buffer == 0 && forward) {
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
        var initial_velocity = this.velocity.copy();
        this.velocity.mul(1/(Math.E ** (this.drag_coefficient * delay)));
        this.position = Vector.div(Vector.add(Vector.mul(this.position, this.drag_coefficient), Vector.sub(initial_velocity, this.velocity)), this.drag_coefficient);
        if (fire && this.bullet_cooldown >= 1 && this.teleport_buffer == 0) {
            direction.norm();
            direction.mul(this.width / 2 + 5);
            var bullet_position = Vector.add(direction, this.position);
            direction.norm();
            var bullet_velocity = Vector.mul(direction, this.bullet_speed);
            bullet_velocity.add(this.velocity);
            ship_bullets.push(new Bullet(bullet_position, bullet_velocity, this.bullet_life));
            this.bullet_cooldown = 0;
        }
        this.bullet_cooldown = Math.min(1, this.bullet_cooldown + this.fire_rate * delay);
        if (teleport && this.teleport_cooldown >= 1 && this.teleport_buffer <= 0) {
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
        this.teleport_cooldown = Math.min(this.teleport_cooldown + this.teleport_recharge_rate * delay, 1);
        wrap(this.position);
        this.bounds.translate(Vector.sub(this.position, old_position));
        if (this.invincibility > 0) {
            this.invincibility_flash += this.invincibility_flash_rate * delay;
            while (this.invincibility_flash >= 1)
                this.invincibility_flash--;
        }
        this.invincibility = Math.max(0, this.invincibility - delay);
        return true;
    }

    drawShip(offset, position, show_bounds, show_positions, show_velocity, show_acceleration, alpha = 1) {
        if (this.invincibility > 0 && this.invincibility_flash < 0.5)
            return;
        ctx.strokeStyle = "white";
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 2;
        ctx.translate(offset.x, offset.y);
        ctx.translate(position.x, position.y);
        ctx.rotate(-this.angle);
        ctx.translate(-position.x, -position.y);
        ctx.beginPath();
        ctx.moveTo(position.x - this.width / 2, position.y - this.height / 2);
        ctx.lineTo(position.x + this.width / 2, position.y);
        ctx.moveTo(position.x - this.width / 2, position.y + this.height / 2);
        ctx.lineTo(position.x + this.width / 2, position.y);
        ctx.moveTo(position.x - this.width / 2 + this.rear_offset, position.y - this.height / 2 + (this.height / this.width) * this.rear_offset - 1);
        ctx.lineTo(position.x - this.width / 2 + this.rear_offset, position.y + this.height / 2 - (this.height / this.width) * this.rear_offset + 1);
        if (this.thruster_status >= 0.5) {
            ctx.moveTo(position.x - this.width / 2 + this.rear_offset, position.y - this.height / 2 + (this.height / this.width) * this.rear_offset - 1);
            ctx.lineTo(position.x - this.width / 2 + this.rear_offset - this.trail_length, position.y);
            ctx.lineTo(position.x - this.width / 2 + this.rear_offset, position.y + this.height / 2 - (this.height / this.width) * this.rear_offset + 1);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.resetTransform();
        if (show_bounds) {
            ctx.translate(offset.x, offset.y);
            drawBounds(this);
            ctx.translate(-offset.x, -offset.y);
        }
        if (show_positions)
            drawPosition(this);
        if (show_velocity)
            drawVelocity(this);
        if (show_acceleration)
            drawAcceleration(this);
    }

    drawLife(position) {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2 * 4 / 3;
        ctx.scale(0.75, 0.75);
        ctx.translate(position.x, position.y);
        ctx.rotate(-Math.PI / 2);
        ctx.translate(-position.x, -position.y);
        ctx.beginPath();
        ctx.moveTo(position.x - this.width / 2, position.y - this.height / 2);
        ctx.lineTo(position.x + this.width / 2, position.y);
        ctx.moveTo(position.x - this.width / 2, position.y + this.height / 2);
        ctx.lineTo(position.x + this.width / 2, position.y);
        ctx.moveTo(position.x - this.width / 2 + this.rear_offset, position.y - this.height / 2 + (this.height / this.width) * this.rear_offset - 1);
        ctx.lineTo(position.x - this.width / 2 + this.rear_offset, position.y + this.height / 2 - (this.height / this.width) * this.rear_offset + 1);
        ctx.stroke();
        ctx.resetTransform();
    }

    drawWrapBeforeTeleportation(offset) {
        if (this.teleport_buffer == 0)
            this.drawShip(offset, this.position, settings.show_bounds, settings.show_positions, settings.show_velocity, settings.show_acceleration);
        else {
            this.drawShip(offset, this.position, false, settings.show_positions, settings.show_velocity, settings.show_acceleration, 1 - this.teleport_buffer);
        }
    }

    drawWrapAfterTeleportation(offset) {
        this.drawShip(offset, this.teleport_location, false, false, false, false, this.teleport_buffer);
    }

    draw() {
        if (this.dead) return;
        renderWrap(this.position, this.width / 2, (offset) => {
            this.drawWrapBeforeTeleportation(offset);
        });
        if (this.teleport_buffer != 0)
            renderWrap(this.position, this.width / 2, (offset) => {
                this.drawWrapAfterTeleportation(offset);
            });
    }

    drawLives() {
        var base_position = new Vector(29, 70);
        for (var i = 0; i < this.lives; i++)
            this.drawLife(Vector.add(base_position, new Vector(this.height * 2 * i, 0)));
    }

    checkBulletCollision(bullet, explosions) {
        if (bullet.dead || this.dead || this.invincibility > 0 || this.teleport_buffer != 0)
            return false;
        var horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        var vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                var hit = this.bounds.containsPoint(Vector.add(bullet.position, new Vector(horizontal[i], vertical[j])));
                if (hit) {
                    this.dead = bullet.dead = true;
                    explosions.push(new Explosion(this.position));
                    explosions.push(new Explosion(bullet.position));
                    return true;
                }
            }    
        }
        return false;
    }

    checkPolygonCollision(item, explosions) {
        if (item.dead || this.dead || this.invincibility > 0 || this.teleport_buffer != 0)
            return false;
        var horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        var vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        var old_offset = new Vector();
        var shifted_bounds = this.bounds.copy();
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                shifted_bounds.translate(Vector.sub(new Vector(horizontal[i], vertical[j]), old_offset));
                old_offset = new Vector(horizontal[i], vertical[j]);
                var hit = item.bounds.intersectsPolygon(shifted_bounds);
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

    checkAsteroidCollision(split_asteroids, wave, asteroid, explosions) {
        if (this.checkPolygonCollision(asteroid, explosions))
            asteroid.destroy(split_asteroids, wave);
    }

    checkSaucerCollision(saucer, explosions) {
        if (saucer.dead || this.dead || this.invincibility > 0 || this.teleport_buffer != 0)
            return false;
        var horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        var vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        var old_offset = new Vector();
        var shifted_bounds = this.bounds.copy();
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                if ((horizontal[i] != 0 && !saucer.entered_x) || (vertical[i] != 0 && !saucer.entered_y))
                    continue;
                shifted_bounds.translate(Vector.sub(new Vector(horizontal[i], vertical[j]), old_offset));
                old_offset = new Vector(horizontal[i], vertical[j]);
                var hit = saucer.bounds.intersectsPolygon(shifted_bounds);
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
        for (var i = 0; i < asteroid_configurations.shapes.length; i++) {
            var rect = asteroid_configurations.shapes[i].getRect();
            var shift = new Vector(-rect.left, -rect.top);
            asteroid_configurations.shapes[i].translate(shift);
        }
    }

    constructor(position, size, wave) {
        var type = Math.floor(randomInRange([0, 3]));
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
        if (Math.floor(Math.random() * 2) == 1)
            this.rotation_speed *= -1;
        var velocity_angle = Math.random() * Math.PI * 2;
        this.velocity = new Vector(Math.cos(velocity_angle), Math.sin(velocity_angle));
        var speed = randomInRange(asteroid_configurations.speed_scaling(wave));
        this.velocity.mul(asteroid_configurations.size_speed[size] * speed);
        this.dead = false;
    }

    update(delay) {
        var old_position = this.position.copy();
        var old_angle = this.angle;
        this.angle += this.rotation_speed * delay;
        this.bounds.rotate(this.angle - old_angle, this.position);
        while (this.angle < 0) this.angle += 2 * Math.PI;
        while (this.angle >= 2 * Math.PI) this.angle -= 2 * Math.PI;
        this.position.add(Vector.mul(this.velocity, delay));
        wrap(this.position);
        this.bounds.translate(Vector.sub(this.position, old_position));
        this.rect = this.bounds.getRect();
    }

    drawAsteroid(offset) {
        ctx.translate(offset.x, offset.y);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.bounds.points[this.bounds.points.length - 1].x, this.bounds.points[this.bounds.points.length - 1].y);
        for (var i = 0; i < this.bounds.points.length; i++)
            ctx.lineTo(this.bounds.points[i].x, this.bounds.points[i].y);
        ctx.stroke();
        ctx.resetTransform();
        if (settings.show_bounds) {
            ctx.translate(offset.x, offset.y);
            drawBounds(this);
            ctx.translate(-offset.x, -offset.y);
        }
        if (settings.show_positions)
            drawPosition(this);
        if (settings.show_velocity)
            drawVelocity(this);
    }

    draw() {
        renderWrap(this.position, Math.max(this.rect.width / 2, this.rect.height / 2), (offset) => {
            this.drawAsteroid(offset);
        });
    }

    destroy(split_asteroids, wave) {
        this.dead = true;
        if (this.size == 0)
            return;
        var asteroid_1 = new Asteroid(this.position.copy(), this.size - 1, wave);
        var asteroid_2 = new Asteroid(this.position.copy(), this.size - 1, wave);
        split_asteroids.push(asteroid_1);
        split_asteroids.push(asteroid_2);
    }

}

class Saucer {

    static analyzeSaucerConfigurations() {
        var rect = saucer_configurations.shape.getRect();
        saucer_configurations.shape.translate(new Vector(-rect.left, -rect.top));
    }

    constructor(wave) {
        this.bounds = saucer_configurations.shape.copy();
        this.size = randomInArray(saucer_configurations.sizes);
        this.bounds.scale(this.size);
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
        this.bullet_life = saucer_configurations.bullet_life(wave);
        this.fire_rate = randomInRange(saucer_configurations.fire_rate(wave));
        this.bullet_cooldown = 0;
        this.bullet_speed = randomInRange(saucer_configurations.bullet_speed(wave));
        this.bullet_accuracy = saucer_configurations.bullet_accuracy(wave);
        this.dead = false;
    }

    bestFireDirection(ship) {
        var horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        var vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        var best = Vector.sub(ship.position, this.position);
        for (var i = 0; i < 3; i++)
            for (var j = 0; j < 3; j++) {
                if (i == 0 && j == 0) continue;
                var shifted_position = Vector.add(this.position, new Vector(horizontal[i], vertical[j]));
                var choice = Vector.sub(ship.position, shifted_position);
                if (choice.mag() < best.mag())
                    best = choice;
            }
        return best;
    }

    update(ship, saucer_bullets, delay) {
        if (this.direction_change_cooldown <= 0) {
            if (Math.floor(randomInRange([0, 2])) == 0) {
                var direction = this.velocity.x / Math.abs(this.velocity.x);
                if (this.velocity.y == 0) {
                    var new_velocity = new Vector(direction, this.vertical_movement);
                    new_velocity.norm();
                    new_velocity.mul(this.velocity.mag());
                    this.velocity = new_velocity;
                } else {
                    var direction = this.velocity.x / Math.abs(this.velocity.x);
                    this.velocity.x = this.velocity.mag() * direction;
                    this.velocity.y = 0;
                }
            }
            this.direction_change_cooldown = 1;
        }
        this.direction_change_cooldown = Math.max(0, this.direction_change_cooldown - this.direction_change_rate * delay);
        var old_position = this.position.copy();
        this.position.add(Vector.mul(this.velocity, delay));
        wrap(this.position, this.entered_x, this.entered_y);
        this.bounds.translate(Vector.sub(this.position, old_position));
        this.entered_x |= (this.position.x <= canvas_bounds.width - this.rect.width / 2 && this.position.x >= this.rect.width / 2);
        this.entered_y |= (this.position.y >= this.rect.height / 2 && this.position.y <= canvas_bounds.height - this.rect.height / 2);
        if (this.bullet_cooldown >= 1) {
            var bullet_velocity = this.bestFireDirection(ship);
            bullet_velocity.norm();
            bullet_velocity.mul(this.bullet_speed);
            var angle_deviation = randomInRange([0, this.bullet_accuracy]);
            if (randomInArray([0, 1]) == 0)
                bullet_velocity.rotate(angle_deviation, new Vector());
            else
                bullet_velocity.rotate(-angle_deviation, new Vector());
            var bullet_position = this.position.copy();
            bullet_position.add(bullet_velocity);
            saucer_bullets.push(new Bullet(bullet_position, bullet_velocity, this.bullet_life));
            this.bullet_cooldown = 0;
        }
        this.bullet_cooldown = Math.min(1, this.bullet_cooldown + this.fire_rate * delay);
    }

    drawSaucer(offset) {
        ctx.translate(offset.x, offset.y);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.bounds.points[this.bounds.points.length - 1].x, this.bounds.points[this.bounds.points.length - 1].y);
        for (var i = 0; i < this.bounds.points.length; i++)
            ctx.lineTo(this.bounds.points[i].x, this.bounds.points[i].y);
        ctx.moveTo(this.bounds.points[1].x, this.bounds.points[1].y);
        ctx.lineTo(this.bounds.points[this.bounds.points.length - 2].x, this.bounds.points[this.bounds.points.length - 2].y);
        ctx.moveTo(this.bounds.points[2].x, this.bounds.points[2].y);
        ctx.lineTo(this.bounds.points[this.bounds.points.length - 3].x, this.bounds.points[this.bounds.points.length - 3].y);
        ctx.stroke();
        if (settings.show_bounds)
            drawBounds(this);
        if (settings.show_positions)
            drawPosition(this);
        if (settings.show_velocity)
            drawVelocity(this);
        ctx.resetTransform();
    }

    draw() {
        renderWrap(this.position, Math.max(this.rect.width / 2, this.rect.height / 2), (offset) => {
            this.drawSaucer(offset);
        }, this.entered_x, this.entered_y);
    }

    checkCollision(item, explosions) {
        if (item.dead || this.dead)
            return false;
        var horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        var vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        var old_offset = new Vector();
        var shifted_bounds = this.bounds.copy();
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                if ((horizontal[i] != 0 && !this.entered_x) || (vertical[i] != 0 && !this.entered_y))
                    continue;
                shifted_bounds.translate(Vector.sub(new Vector(horizontal[i], vertical[j]), old_offset));
                old_offset = new Vector(horizontal[i], vertical[j]);
                var hit = item.bounds.intersectsPolygon(shifted_bounds);
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

    checkAsteroidCollision(split_asteroids, wave, asteroid, explosions) {
        if (this.checkCollision(asteroid, explosions))
            asteroid.destroy(split_asteroids, wave);
    }

}

class Game {
    
    constructor (title_screen = false) {
        this.ship = new Ship();
        this.ship_bullets = [];
        this.wave = 1;
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
    }

    makeAsteroids() {
        var count = asteroid_configurations.spawn_count(this.wave);
        for (var i = 0; i < count; i++) {
            var position = new Vector(randomInRange([0, canvas_bounds.width]), randomInRange([0, canvas_bounds.height]));
            var distance = position.distance(this.ship.position);
            while (distance < asteroid_configurations.max_rect.width * 2) {
                position = new Vector(randomInRange([0, canvas_bounds.width]), randomInRange([0, canvas_bounds.height]));
                distance = position.distance(this.ship.position);
            }
            this.asteroids.push(new Asteroid(position, 2, this.wave));
        }
    }

    makeSaucer(delay) {
        if (this.saucer_cooldown >= 1) {
            this.saucers.push(new Saucer(this.wave));
            this.saucer_cooldown = 0;
        }
        this.saucer_cooldown = Math.min(1, this.saucer_cooldown + saucer_configurations.spawn_rate(this.wave) * delay);
    }

    update(left, right, forward, fire, teleport, start, pause, delay) {

        if (!this.title_screen && !(this.ship.dead && this.ship.lives <= 0) && !this.paused && pause && !this.old_pause)
            this.paused = true;
        else if (this.paused && pause && !this.old_pause)
            this.paused = false;

        this.wave = this.score / 1000 + 1;

        if (this.title_screen || (this.ship.dead && this.ship.lives <= 0) || this.paused) {
            this.title_flash += this.title_flash_rate * delay;
            while (this.title_flash >= 1)
                this.title_flash--;
            if (start && !this.paused) {
                if (!this.ship.dead)
                    this.title_screen = false;
                return true;
            }
        }

        this.old_pause = pause;

        if (this.paused) return;

        if (this.asteroids.length == 0)
            this.makeAsteroids();

        if (!this.title_screen && this.saucers.length == 0)
            this.makeSaucer(delay);

        if (this.score >= (1 + this.extra_lives) * 10000) {
            this.ship.lives++;
            this.extra_lives++;
        }

        if (!this.title_screen)
            this.ship.update(left, right, forward, fire, teleport, delay, this.ship_bullets);

        var split_asteroids = [];

        if (!this.title_screen) {
            for (var i = 0; i < this.saucer_bullets.length; i++)
                this.ship.checkBulletCollision(this.saucer_bullets[i], this.explosions);
            for (var i = 0; i < this.saucers.length; i++)
                this.ship.checkSaucerCollision(this.saucers[i], this.explosions);
            for (var i = 0; i < this.asteroids.length; i++)
                this.ship.checkAsteroidCollision(split_asteroids, this.wave, this.asteroids[i], this.explosions);
        }

        var new_ship_bullets = [];
        for (var i = 0; i < this.ship_bullets.length; i++) {
            this.ship_bullets[i].update(delay);
            for (var j = 0; j < this.asteroids.length; j++) {
                var hit = this.ship_bullets[i].checkAsteroidCollision(split_asteroids, this.wave, this.asteroids[j], this.explosions);
                if (hit)
                    this.score += point_values.asteroids;
            }
            for (var j = 0; j < this.saucers.length; j++) {
                var hit = this.ship_bullets[i].checkCollision(this.saucers[j], this.explosions);
                if (hit)
                    this.score += point_values.saucers;
            }
            if (!this.ship_bullets[i].dead)
                new_ship_bullets.push(this.ship_bullets[i]);    
        }
        this.ship_bullets = new_ship_bullets;

        var new_saucers = [];
        for (var i = 0; i < this.saucers.length; i++) {
            this.saucers[i].update(this.ship, this.saucer_bullets, delay);
            for (var j = 0; j < this.asteroids.length; j++)
                this.saucers[i].checkAsteroidCollision(split_asteroids, this.wave, this.asteroids[j], this.explosions);
            if (!this.saucers[i].dead)
                new_saucers.push(this.saucers[i]);
        }
        this.saucers = new_saucers;

        var new_saucer_bullets = [];
        for (var i = 0; i < this.saucer_bullets.length; i++) {
            this.saucer_bullets[i].update(delay);
            for (var j = 0; j < this.asteroids.length; j++)
                this.saucer_bullets[i].checkAsteroidCollision(split_asteroids, this.wave, this.asteroids[j], this.explosions);
            if (!this.saucer_bullets[i].dead)
                new_saucer_bullets.push(this.saucer_bullets[i]);
        }
        this.saucer_bullets = new_saucer_bullets;

        for (var i = 0; i < split_asteroids.length; i++)
            this.asteroids.push(split_asteroids[i]);

        var new_asteroids = [];
        for (var i = 0; i < this.asteroids.length; i++) {
            this.asteroids[i].update(delay);
            if (!this.asteroids[i].dead)
                new_asteroids.push(this.asteroids[i]);
        }
        this.asteroids = new_asteroids;

        var new_explosions = [];
        for (var i = 0; i < this.explosions.length; i++) {
            this.explosions[i].update(delay);
            if (!this.explosions[i].dead)
                new_explosions.push(this.explosions[i]);
        }
        this.explosions = new_explosions;

        return false;

    }

    drawScore() {
        ctx.font = "20px Rubik Regular";
        ctx.fillStyle = "white";
        var text_size = ctx.measureText(this.score);
        ctx.fillText(this.score, 15, 15 + text_size.actualBoundingBoxAscent);
    }

    drawTitle() {
        ctx.fillStyle = "rgb(30, 30, 30)";
        ctx.globalAlpha = 0.5;
        ctx.fillRect(0, 0, canvas_bounds.width, canvas_bounds.height);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "white";
        ctx.font = "25px Rubik Regular";
        if (this.title_flash <= 0.5) {
            var textSize = ctx.measureText("Press Enter to Start");
            ctx.fillText("Press Enter to Start", canvas_bounds.width / 2 - textSize.width / 2, canvas_bounds.height / 2);
        }
    }

    drawGameOver() {
        ctx.fillStyle = "rgb(30, 30, 30)";
        ctx.globalAlpha = 0.5;
        ctx.fillRect(0, 0, canvas_bounds.width, canvas_bounds.height);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "white";
        ctx.font = "35px Rubik Regular";
        var textSize = ctx.measureText("Score: " + this.score);
        ctx.fillText("Score: " + this.score, canvas_bounds.width / 2 - textSize.width / 2, canvas_bounds.height / 2 - 30);
        ctx.font = "25px Rubik Regular";
        if (this.title_flash <= 0.5) {
            textSize = ctx.measureText("Press Enter to Try Again");
            ctx.fillText("Press Enter to Try Again", canvas_bounds.width / 2 - textSize.width / 2, canvas_bounds.height / 2 + 30);
        }
    }

    drawPause() {
        ctx.fillStyle = "rgb(30, 30, 30)";
        ctx.globalAlpha = 0.5;
        ctx.fillRect(0, 0, canvas_bounds.width, canvas_bounds.height);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "white";
        ctx.font = "35px Rubik Regular";
        var textSize = ctx.measureText("Paused");
        ctx.fillText("Paused", canvas_bounds.width / 2 - textSize.width / 2, canvas_bounds.height / 2 - 30);
        ctx.font = "25px Rubik Regular";
        if (this.title_flash <= 0.5) {
            textSize = ctx.measureText("Press Escape to Resume");
            ctx.fillText("Press Escape to Resume", canvas_bounds.width / 2 - textSize.width / 2, canvas_bounds.height / 2 + 30);
        }
    }

    draw() {
        if (!this.title_screen)
            this.ship.draw();
        for (var i = 0; i < this.asteroids.length; i++)
            this.asteroids[i].draw();
        for (var i = 0; i < this.ship_bullets.length; i++)
            this.ship_bullets[i].draw();
        for (var i = 0; i < this.saucer_bullets.length; i++)
            this.saucer_bullets[i].draw();
        for (var i = 0; i < this.saucers.length; i++)
            this.saucers[i].draw();
        for (var i = 0; i < this.explosions.length; i++)
            this.explosions[i].draw();
        if (!this.title_screen && !this.ship.dead) {
            this.drawScore();
            this.ship.drawLives();
        } else if (this.title_screen)
            this.drawTitle();
        if (this.ship.dead && this.ship.lives <= 0) {
            this.drawGameOver();
        }
        if (this.paused) {
            this.drawPause();
        }
    }

}