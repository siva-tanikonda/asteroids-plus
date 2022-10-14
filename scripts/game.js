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
    sizes: [ 12.5, 25, 50 ],
    rotation_speed: [ 0, 0.02 ],
    size_speed: [ 3, 2, 1 ],
    speed_scaling: (wave) => {
        return 0.25 * Math.log2(wave);
    }
};

function wrap(v) {
    while (v.x >= canvas_bounds.width)
        v.x -= canvas_bounds.width;
    while (v.x < 0)
        v.x += canvas_bounds.width;
    while (v.y >= canvas_bounds.height)
        v.y -= canvas_bounds.height;
    while (v.y < 0)
        v.y += canvas_bounds.height;
}

function renderWrap(position, radius, action) {
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
        this.drawBullet(new Vector());
        var offset = new Vector();
        if (this.position.x + this.radius > canvas_bounds.width)
            offset.x = -canvas_bounds.width;
        else if (this.position.x - this.radius < 0)
            offset.x = canvas_bounds.width;
        if (this.position.y + this.radius > canvas_bounds.height)
            offset.y = -canvas_bounds.height;
        else if (this.position.y - this.radius < 0)
            offset.y = canvas_bounds.height;
        if (offset.x != 0)
            this.drawBullet(new Vector(offset.x, 0));
        if (offset.y != 0)
            this.drawBullet(new Vector(0, offset.y));
    }

    checkCollision(item) {
        if (item.dead || this.dead)
            return false;
        var vertical = [0, canvas_bounds.width, -canvas_bounds.width];
        var horizontal = [0, canvas_bounds.height, -canvas_bounds.height];
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                var hit = item.bounds.containsPoint(Vector.add(this.position, new Vector(horizontal[i], vertical[j])));
                if (hit) {
                    this.dead = item.dead = true;
                    return true;
                }
            }    
        }
        return false;
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
        this.angle = 0;
        this.rotation_speed = 5;
        this.acceleration = 0.1;
        this.drag_coefficient = 0.02;
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
    }

    update(left, right, forward, fire, teleport, delay, ship_bullets) {
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
        }
        else
            this.thruster_status = 0;
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
        return true;
    }

    drawShip(offset, position, show_bounds, show_positions, alpha = 1) {
        ctx.strokeStyle = "white";
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
    }

    drawWrapBeforeTeleportation(offset) {
        if (this.teleport_buffer == 0)
            this.drawShip(offset, this.position, settings.show_bounds, settings.show_positions);
        else {
            this.drawShip(offset, this.position, false, settings.show_positions, 1 - this.teleport_buffer);
        }
    }

    drawWrapAfterTeleportation(offset) {
        this.drawShip(offset, this.teleport_location, false, false, this.teleport_buffer);
    }

    draw() {
        renderWrap(this.position, this.width / 2, (offset) => {
            this.drawWrapBeforeTeleportation(offset);
        });
        if (this.teleport_buffer != 0)
            renderWrap(this.position, this.width / 2, (offset) => {
                this.drawWrapAfterTeleportation(offset);
            });
    }

}

class Asteroid {

    static analyzeAsteroidTypes() {
        for (var i = 0; i < asteroid_configurations.shapes.length; i++) {
            var rect = asteroid_configurations.shapes[i].getRect();
            var shift = new Vector(-rect.left, -rect.top);
            asteroid_configurations.shapes[i].translate(shift);
        }
    }

    constructor(ship, size, wave) {
        var type = Math.floor(Math.random() * 3);
        this.size = size;
        this.bounds = asteroid_configurations.shapes[type].copy();
        this.bounds.scale(asteroid_configurations.sizes[size]);
        this.rect = this.bounds.getRect();
        this.bounds.translate(new Vector(-this.rect.width / 2, -this.rect.height / 2));
        this.position = new Vector(Math.floor(Math.random() * canvas_bounds.width), Math.floor(Math.random() * canvas_bounds.height));
        while (Math.abs(ship.position.x - this.position.x) < this.rect.width / 2 || Math.abs(ship.position.y - this.position.y) < this.rect.height / 2) {
            this.position.x = Math.floor(Math.random() * canvas_bounds.width);
            this.position.y = Math.floor(Math.random() * canvas_bounds.height);
        }
        this.bounds.translate(this.position);
        this.angle = 0;
        this.rotation_speed = Math.random() * (asteroid_configurations.rotation_speed[1] - asteroid_configurations.rotation_speed[0]) + asteroid_configurations.rotation_speed[0];
        if (Math.floor(Math.random() * 2) == 1)
            this.rotation_speed *= -1;
        var velocity_angle = Math.random() * Math.PI * 2;
        this.velocity = new Vector(Math.cos(velocity_angle), Math.sin(velocity_angle));
        this.velocity.mul(asteroid_configurations.size_speed[size] * asteroid_configurations.speed_scaling(wave));
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
    }

    drawAsteroid(offset) {
        ctx.translate(offset.x, offset.y);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1.5;
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
    }

    draw() {
        renderWrap(this.position, Math.max(this.rect.width / 2, this.rect.height / 2), (offset) => {
            this.drawAsteroid(offset);
        });
    }

}

class Game {
    
    constructor () {
        this.ship = new Ship();
        this.ship_bullets = [];
        this.wave = 1;
        this.asteroids = [];
        this.asteroids.push(new Asteroid(this.ship, 2, this.wave));
    }

    update(left, right, forward, fire, teleport, delay) {

        this.ship.update(left, right, forward, fire, teleport, delay, this.ship_bullets);

        var new_ship_bullets = [];
        for (var i = 0; i < this.ship_bullets.length; i++) {
            this.ship_bullets[i].update(delay);
            for (var j = 0; j < this.asteroids.length; j++)
                var hit = this.ship_bullets[i].checkCollision(this.asteroids[j]);
            if (!this.ship_bullets[i].dead)
                new_ship_bullets.push(this.ship_bullets[i]);    
        }
        this.ship_bullets = new_ship_bullets;

        var new_asteroids = [];
        for (var i = 0; i < this.asteroids.length; i++) {
            this.asteroids[i].update(delay);
            if (!this.asteroids[i].dead)
                new_asteroids.push(this.asteroids[i]);
        }
        this.asteroids = new_asteroids;
    }

    draw() {
        this.ship.draw();
        for (var i = 0; i < this.asteroids.length; i++)
            this.asteroids[i].draw();
        for (var i = 0; i < this.ship_bullets.length; i++)
            this.ship_bullets[i].draw();
    }

}