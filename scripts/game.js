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

    drawPortion(offset) {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1.5;
        ctx.translate(offset.x, offset.y);
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.resetTransform();
    }

    draw() {
        this.drawPortion(new Vector());
        var offset = new Vector();
        if (this.position.x + this.radius > canvas_bounds.width)
            offset.x = -canvas_bounds.width;
        else if (this.position.x - this.radius < 0)
            offset.x = canvas_bounds.width;
        if (this.position.y + this.radius > canvas_bounds.height)
            offset.y = -canvas_bounds.height;
        else if (this.position.y - this.radius < 0)
            offset.y = canvas_bounds.height;
        if (offset.x != 0 || offset.y != 0)
            this.drawPortion(offset);
    }

}

class Ship {

    constructor() {
        this.position = new Vector(canvas_bounds.width / 2, canvas_bounds.height / 2);
        this.velocity = new Vector();
        this.width = 30
        this.height = 16;
        this.rear_offset = 6;
        this.angle = 0;
        this.rotation_speed = 5;
        this.acceleration = 0.25;
        this.drag_coefficient = 0.025;
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

    }

    update(left, right, forward, fire, teleport, delay) {
        if (left) this.angle += delay * Math.PI * this.rotation_speed / 180;
        if (right) this.angle -= delay * Math.PI * this.rotation_speed / 180;
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
                //deal with self-destruct here
            }
        }
        this.teleport_cooldown = Math.min(this.teleport_cooldown + this.teleport_recharge_rate * delay, 1);
        var new_bullets = [];
        for (var i = 0; i < this.bullets.length; i++) {
            var dead = this.bullets[i].update(delay);
            if (!dead)
                new_bullets.push(this.bullets[i]);
        }
        this.bullets = new_bullets;
        return true;
    }

    drawShip(offset, position, alpha = 1) {
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
    }

    draw() {
        if (this.teleport_buffer == 0)
            this.drawShip(new Vector(), this.position);
        else {
            this.drawShip(new Vector(), this.position, 1 - this.teleport_buffer);
        }
        var offset = new Vector();
        if (this.position.x + this.width > canvas_bounds.width)
            offset.x = -canvas_bounds.width;
        else if (this.position.x - this.width < 0)
            offset.x = canvas_bounds.width;
        if (this.position.y + this.height > canvas_bounds.height)
            offset.y = -canvas_bounds.height;
        else if (this.position.y - this.height < 0)
            offset.y = canvas_bounds.height;
        if (offset.x != 0 || offset.y != 0) {
            if (this.teleport_buffer == 0)
                this.drawShip(offset, this.position);
            else
                this.drawShip(offset, this.position, 1 - this.teleport_buffer);
        }
        if (this.teleport_buffer != 0) {
            if (this.teleport_buffer != 0)
                this.drawShip(new Vector(), this.teleport_location, this.teleport_buffer);
            offset = new Vector();
            if (this.teleport_location.x + this.width > canvas_bounds.width)
                offset.x = -canvas_bounds.width;
            else if (this.teleport_location.x - this.width < 0)
                offset.x = canvas_bounds.width;
            if (this.teleport_location.y + this.height > canvas_bounds.height)
                offset.y = -canvas_bounds.height;
            else if (this.teleport_location.y - this.height < 0)
                offset.y = canvas_bounds.height;
            if (offset.x != 0 || offset.y != 0) {
                if (this.teleport_buffer == 0)
                    this.drawShip(offset, this.position);
                else
                    this.drawShip(offset, this.teleport_location, this.teleport_buffer);
            }
        }
        for (var i = 0; i < this.bullets.length; i++)
            this.bullets[i].draw();
    }

}

class Game {
    
    constructor () {
        this.ship = new Ship();
    }

    update(left, right, forward, fire, teleport, delay) {
        this.ship.update(left, right, forward, fire, teleport, delay);
    }

    draw() {
        this.ship.draw();
    }

}