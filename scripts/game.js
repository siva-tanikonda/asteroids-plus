var asteroid_types = [
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
];
var sizes = [ 12.5, 25, 50 ];

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

function drawBounds(item) {
    ctx.fillStyle = 'rgb(200, 100, 100)';
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.moveTo(item.bounds.points[item.bounds.points.length - 1].x, item.bounds.points[item.bounds.points.length - 1].y);
    for (var i = 0; i < item.bounds.points.length; i++)
        ctx.lineTo(item.bounds.points[i].x, item.bounds.points[i].y);
    ctx.fill();
    ctx.globalAlpha = 1;
}

function drawCenter(item) {
    ctx.fillStyle = "rgb(125, 250, 125)";
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(item.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
}

class Bullet {

    constructor(position, velocity, life) {
        this.position = position;
        this.velocity = velocity;
        this.life = life;
        this.radius = 0.75;
    }

    update(delay) {
        this.position.add(Vector.mul(this.velocity, delay));
        wrap(this.position);
        this.life -= delay;
        return (this.life <= 0);
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
        this.acceleration = 0.15;
        this.drag_coefficient = 0.02;
        this.bullets = [];
        this.bullet_cooldown = 1;
        this.fire_rate = 0.05;
        this.bullet_speed = 8;
        this.bullet_life = 60;
        this.trail_length = 8;
        this.thruster_status = 1;
        this.thruster_flash_rate = 0.05;
        this.teleport_buffer = 0;
        this.teleport_speed = 0.025;
        this.teleport_cooldown = 1;
        this.teleport_recharge_rate = 0.005;
        this.teleport_location = new Vector();
        this.bounds.translate(this.position);
    }

    update(left, right, forward, fire, teleport, delay) {
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
            this.bullets.push(new Bullet(bullet_position, bullet_velocity, this.bullet_life));
            this.bullet_cooldown = 0;
        }
        wrap(this.position);
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
        this.bounds.translate(Vector.sub(this.position, old_position));
        var new_bullets = [];
        for (var i = 0; i < this.bullets.length; i++) {
            var dead = this.bullets[i].update(delay);
            if (!dead)
                new_bullets.push(this.bullets[i]);
        }
        this.bullets = new_bullets;
        return true;
    }

    drawShip(offset, position, show_bounds, alpha = 1) {
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
    }

    draw() {
        if (this.teleport_buffer == 0)
            this.drawShip(new Vector(), this.position, settings.show_bounds);
        else {
            this.drawShip(new Vector(), this.position, false, 1 - this.teleport_buffer);
        }
        var offset = new Vector();
        if (this.position.x + 2 * this.width > canvas_bounds.width)
            offset.x = -canvas_bounds.width;
        else if (this.position.x - 2 * this.width < 0)
            offset.x = canvas_bounds.width;
        if (this.position.y + 2 * this.height > canvas_bounds.height)
            offset.y = -canvas_bounds.height;
        else if (this.position.y - 2 * this.height < 0)
            offset.y = canvas_bounds.height;
        if (offset.x != 0) {
            if (this.teleport_buffer == 0)
                this.drawShip(new Vector(offset.x, 0), this.position, settings.show_bounds);
            else
                this.drawShip(new Vector(offset.x, 0), this.position, false, 1 - this.teleport_buffer);
        }
        if (offset.y != 0) {
            if (this.teleport_buffer == 0)
                this.drawShip(new Vector(0, offset.y), this.position, settings.show_bounds);
            else
                this.drawShip(new Vector(0, offset.y), this.position, false, 1 - this.teleport_buffer);
        }
        if (this.teleport_buffer != 0) {
            if (this.teleport_buffer != 0)
                this.drawShip(new Vector(), this.teleport_location, false, this.teleport_buffer);
            offset = new Vector();
            if (this.teleport_location.x + 2 * this.width > canvas_bounds.width)
                offset.x = -canvas_bounds.width;
            else if (this.teleport_location.x - 2 * this.width < 0)
                offset.x = canvas_bounds.width;
            if (this.teleport_location.y + 2 * this.height > canvas_bounds.height)
                offset.y = -canvas_bounds.height;
            else if (this.teleport_location.y - 2 * this.height < 0)
                offset.y = canvas_bounds.height;
            if (offset.x != 0) {
                if (this.teleport_buffer == 0)
                    this.drawShip(new Vector(offset.x, 0), this.position, false);
                else
                    this.drawShip(new Vector(offset.x, 0), this.teleport_location, false, this.teleport_buffer);
            }
            if (offset.y != 0) {
                if (this.teleport_buffer == 0)
                    this.drawShip(new Vector(0, offset.y), this.position, false);
                else
                    this.drawShip(new Vector(0, offset.y), this.teleport_location, false, this.teleport_buffer);
            }
        }
        for (var i = 0; i < this.bullets.length; i++)
            this.bullets[i].draw();
    }

}

class Asteroid {

    static analyzeAsteroidTypes() {
        for (var i = 0; i < asteroid_types.length; i++) {
            var rect = asteroid_types[i].getRect();
            var shift = new Vector(-rect.left, -rect.top);
            asteroid_types[i].translate(shift);
        }
    }

    constructor(ship, size) {
        var type = Math.floor(Math.random() * 3);
        this.size = size;
        this.bounds = asteroid_types[type].copy();
        this.bounds.scale(sizes[size]);
        this.rect = this.bounds.getRect();
        this.bounds.translate(new Vector(-this.rect.width / 2, -this.rect.height / 2));
        this.position = new Vector(Math.floor(Math.random() * canvas_bounds.width), Math.floor(Math.random() * canvas_bounds.height));
        while (Math.abs(ship.position.x - this.position.x) < this.rect.width / 2 || Math.abs(ship.position.y - this.position.y) < this.rect.height / 2) {
            this.position.x = Math.floor(Math.random() * canvas_bounds.width);
            this.position.y = Math.floor(Math.random() * canvas_bounds.height);
        }
        this.bounds.translate(this.position);
    }

    update() {

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
    }

    draw() {
        this.drawAsteroid(new Vector());
        var offset = new Vector();
        if (this.position.x + 2 * this.rect.width > canvas_bounds.width)
            offset.x = -canvas_bounds.width;
        else if (this.position.x - 2 * this.rect.width < 0)
            offset.x = canvas_bounds.width;
        if (this.position.y + 2 * this.rect.height > canvas_bounds.height)
            offset.y = -canvas_bounds.height;
        else if (this.position.y - 2 * this.rect.height < 0)
            offset.y = canvas_bounds.height;
        if (offset.x != 0)
            this.drawAsteroid(new Vector(offset.x, 0));
        if (offset.y != 0)
            this.drawAsteroid(new Vector(0, offset.y));
    }

}

class Game {
    
    constructor () {
        this.ship = new Ship();
        this.asteroids = [];
        this.asteroids.push(new Asteroid(this.ship, 2));
    }

    update(left, right, forward, fire, teleport, delay) {
        this.ship.update(left, right, forward, fire, teleport, delay);
    }

    draw() {
        this.ship.draw();
        for (var i = 0; i < this.asteroids.length; i++)
            this.asteroids[i].draw();
    }

}