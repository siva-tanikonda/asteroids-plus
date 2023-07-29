const canvas_bounds = {
    width: 1475,
    height: 931
};
const game_precision = 25;
const game_speed = 1;
const delay = 1;

//Math stuff
class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    copy() {
        return new Vector(this.x, this.y);
    }
    mag() {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }
    normalize() {
        const len = this.mag();
        if (len == 0) return;
        this.x /= len;
        this.y /= len;
    }
    add(v) {
        this.x += v.x;
        this.y += v.y;
    }
    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
    }
    mul(k) {
        this.x *= k;
        this.y *= k;
    }
    div(k) {
        this.x /= k;
        this.y /= k;
    }
    rotate(a, d) {
        const nx = ((this.x - d.x) * Math.cos(a) + (this.y - d.y) * Math.sin(a)) + d.x;
        this.y = ((d.x - this.x) * Math.sin(a) + (this.y - d.y) * Math.cos(a)) + d.y;
        this.x = nx;
    }
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
    cross(v) {
        return this.x * v.y - this.y * v.x;
    }
    angle() {
        let angle = Math.atan2(this.y, this.x);
        while (angle < 0) angle += Math.PI * 2;
        return angle;
    }
    dist(v) {
        return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2);
    }
    comp(v) {
        if (this.mag() == 0) return 0;
        return this.dot(v);
    }
    proj(v) {
        if (this.mag() == 0) return new Vector();
        return Vector.mul(Vector.div(this, this.mag()), this.comp(v));
    }
    static copy(v) {
        return new Vector(v.x, v.y);
    }
    static mag(v) {
        return Math.sqrt(v.x ** 2 + v.y ** 2);
    }
    static normalize(v) {
        const len = v.mag();
        if (len == 0) return v.copy();
        return new Vector(v.x / len, v.y / len);
    }
    static add(u, v) {
        return new Vector(u.x + v.x, u.y + v.y);
    }
    static sub(u, v) {
        return new Vector(u.x - v.x, u.y - v.y);
    }
    static mul(v, k) {
        return new Vector(v.x * k, v.y * k);
    }
    static div(v, k) {
        return new Vector(v.x / k, v.y / k);
    }
    static rotate(v, a, d) {
        const nx = ((v.x - d.x) * Math.cos(a), (v.y - d.y) * Math.sin(a)) + d.x;
        const ny = ((v.x - d.x) * Math.sin(a), (v.y - d.y) * Math.cos(a)) + d.y;
        return new Vector(nx, ny);
    }
    static dot(u, v) {
        return u.x * v.x + u.y * v.y;
    }
    static cross(u, v) {
        return u.x * v.y - u.y * v.x;
    }
    static angle(v) {
        let angle = Math.atan2(v.y, v.x);
        while (angle < 0) angle += Math.PI * 2;
        return angle;
    }
    static dist(u, v) {
        return Math.sqrt((u.x - v.x) ** 2 + (u.y - v.y) ** 2);
    }
    static comp(u, v) {
        if (u.mag() == 0) return 0;
        return u.dot(v);
    }
    static proj(u, v) {
        if (u.mag() == 0) return Vector();
        return Vector.mul(Vector.div(u, u.mag()), u.comp(v));
    }
    static side(u, v, w) {
        const uv = Vector.sub(v, u);
        const vw = Vector.sub(w, v);
        if (uv.cross(vw) > 0)
            return -1;
        else if (uv.cross(vw) < 0)
            return 1;
        else
            return 0;
    }
}

class Rect {
    constructor(left, top, right, bottom) {
        this.left = this.x = left;
        this.right = right;
        this.top = this.y = top;
        this.bottom = bottom;
        this.width = right - left;
        this.height = bottom - top;
    }
    intersects(r) {
        return !(this.right < r.left || this.left > r.right || this.top > r.bottom || this.bottom < r.top);
    }
}

class LineSegment {
    constructor(a, b) {
        this.a = a;
        this.b = b;
    }
    containsPoint(v) {
        const side = Vector.side(this.a, this.b, v);
        if (side != 0) return false;
        const min_x = Math.min(this.a.x, this.b.x);
        const max_x = Math.max(this.a.x, this.b.x);
        return (v.x >= min_x && v.x <= max_x);
    }
    intersects(l) {
        if (l.containsPoint(this.a) || l.containsPoint(this.b) || this.containsPoint(l.a) || this.containsPoint(l.b))
            return true;
        const s1 = Vector.side(this.a, this.b, l.a);
        const s2 = Vector.side(this.a, this.b, l.b);
        const s3 = Vector.side(l.a, l.b, this.a);
        const s4 = Vector.side(l.a, l.b, this.b);
        if (s1 == 0 || s2 == 0 || s3 == 0 || s4 == 0)
            return false;
        return (s1 != s2 && s3 != s4);
    }
}

class Polygon {
    constructor(points) {
        this.points = [];
        for (let i = 0; i < points.length; i++)
            this.points.push(new Vector(points[i][0], points[i][1]));
    }
    copy() {
        const c_points = [];
        for (let i = 0; i < this.points.length; i++)
            c_points.push([this.points[i].x, this.points[i].y]);
        return new Polygon(c_points);
    }
    getRect() {
        let min_x, min_y, max_x, max_y;
        min_x = min_y = Infinity;
        max_x = max_y = -Infinity;
        for (let i = 0; i < this.points.length; i++) {
            min_x = Math.min(min_x, this.points[i].x);
            min_y = Math.min(min_y, this.points[i].y);
            max_x = Math.max(max_x, this.points[i].x);
            max_y = Math.max(max_y, this.points[i].y);
        }
        return new Rect(min_x, min_y, max_x, max_y);
    }
    scale(k) {
        for (let i = 0; i < this.points.length; i++)
            this.points[i].mul(k);
    }
    rotate(a, d) {
        for (let i = 0; i < this.points.length; i++)
            this.points[i].rotate(a, d);
    }
    translate(v) {
        for (let i = 0; i < this.points.length; i++)
            this.points[i].add(v);
    }
    containsPoint(v) {
        const rect = this.getRect();
        if (v.x < rect.left || v.x > rect.right || v.y < rect.top || v.y > rect.bottom)
            return false;
        let result = false;
        for (let i = 0; i < this.points.length; i++) {
            const j = (i + 1) % this.points.length;
            const side = Vector.side(this.points[i], this.points[j], v);
            if (side == 0) {
                const min_x = Math.min(this.points[i].x, this.points[j].x);
                const max_x = Math.max(this.points[i].x, this.points[j].x);
                if (v.x >= min_x && v.x <= max_x)
                    return true;
                else
                    continue;    
            }
            if (this.points[i].y == this.points[j].y)
                continue;
            if (this.points[i].y < this.points[j].y) {
                const side = Vector.side(this.points[i], this.points[j], v);
                if (side == 1 && v.y >= this.points[i].y && v.y < this.points[j].y)
                    result = !result;
            }
            else {
                const side = Vector.side(this.points[j], this.points[i], v);
                if (side == 1 && v.y > this.points[j].y && v.y <= this.points[i].y)
                    result = !result;
            }
        }
        return result;
    }
    intersectsLineSegment(l) {
        for (let i = 0; i < this.points.length; i++) {
            const j = (i + 1) % this.points.length;
            const segment = new LineSegment(this.points[i], this.points[j]);
            if (segment.intersects(l))
                return true;
        }
        return false;
    }
    intersectsPolygon(p) {
        const rect1 = p.getRect();
        const rect2 = this.getRect();
        if (!rect1.intersects(rect2)) return false;
        let inside = true;
        for (var i = 0; i < p.points.length; i++)
            inside &= this.containsPoint(p.points[i]);
        if (inside) return true;
        for (var i = 0; i < p.points.length; i++) {
            const j = (i + 1) % p.points.length;
            const segment = new LineSegment(p.points[i], p.points[j]);
            if (this.intersectsLineSegment(segment))
                return true;
        }
        return false;
    }
}

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

function solveQuadratic(a, b, c) {
    var dsc = b ** 2 - 4 * a * c;
    if (dsc < 0) return [];
    else if (dsc == 0)
        return [-b / (2 * a)];
    else {
        var result = [(-b + Math.sqrt(dsc)) / (2 * a), (-b - Math.sqrt(dsc)) / (2 * a)];
        if (result[1] < result[0])
            [result[0], result[1]] = [result[1], result[0]];
        return result;
    }
}

//Game stuff
let seed = 1;
function random() {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}
function randomInRange(range) {
    return range[0] + random() * (range[1] - range[0]);
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
    checkCollision(item) {
        if (item.dead || this.dead)
            return false;
        const horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        const vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const hit = item.bounds.containsPoint(Vector.add(this.position, new Vector(horizontal[i], vertical[j])));
                if (hit) {
                    this.dead = item.dead = true;
                    return true;
                }
            }    
        }
        return false;
    }

    //Checks collision with asteroid, but also splits asteroid if there's a collision
    checkAsteroidCollision(split_asteroids, wave, asteroid) {
        const hit = this.checkCollision(asteroid)
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
    checkBulletCollision(bullet) {
        if (bullet.dead || this.dead || this.invincibility > 0 || this.teleport_buffer != 0)
            return false;
        const horizontal = [ 0, canvas_bounds.width, -canvas_bounds.width ];
        const vertical = [ 0, canvas_bounds.height, -canvas_bounds.height ];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const hit = this.bounds.containsPoint(Vector.add(bullet.position, new Vector(horizontal[i], vertical[j])));
                if (hit) {
                    this.dead = bullet.dead = true;
                    return true;
                }
            }    
        }
        return false;
    }

    //Checks if the ship has collided with a polygon
    checkPolygonCollision(item) {
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
                    return true;
                }
            }    
        }
        return false;
    }

    //Checks if the ship has collided with an asteroid (applies split to asteroid)
    checkAsteroidCollision(split_asteroids, wave, asteroid) {
        if (this.checkPolygonCollision(asteroid))
            asteroid.destroy(split_asteroids, wave);
    }

    //Checks if the ship has collided with a saucer
    checkSaucerCollision(saucer) {
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
    checkCollision(item) {
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
                    return true;
                }
            }    
        }
        return false;
    }

}

//Game class
class Game {
    
    constructor (controls, generator, title_screen = false) {
        seed = generator;
        this.ship = new Ship(controls);
        this.ship_bullets = [];
        this.wave = 8;
        this.asteroids = [];
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
                this.ship.checkBulletCollision(this.saucer_bullets[i]);
            for (let i = 0; i < this.saucers.length; i++)
                this.ship.checkSaucerCollision(this.saucers[i]);
            for (let i = 0; i < this.asteroids.length; i++)
                this.ship.checkAsteroidCollision(split_asteroids, this.wave, this.asteroids[i]);
        }

        //Check if a player bullet hit an asteroid or saucer
        const new_ship_bullets = [];
        for (let i = 0; i < this.ship_bullets.length; i++) {
            for (let j = 0; j < this.asteroids.length; j++) {
                const hit = this.ship_bullets[i].checkAsteroidCollision(split_asteroids, this.wave, this.asteroids[j]);
                if (hit && this.ship.lives != 0)
                    this.score += point_values.asteroids;
            }
            for (let j = 0; j < this.saucers.length; j++) {
                const hit = this.ship_bullets[i].checkCollision(this.saucers[j]);
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

        this.time += delay / 60;

        return false;

    }

}

//AI stuff
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

    constructor(item, ai) {
        if (item.entity == "b") this.size = 0;
        else if (item.entity == "p") this.size = 1;
        else if (item.entity == "a") this.size = 2 + item.size;
        else this.size = 5 + item.size;
        this.size = AI.danger_radius[this.size];
        this.position = item.position.copy();
        this.velocity = item.velocity.copy();
        this.danger_level = ai.calculateDanger(this);
        this.entity = "d";
        if (this.danger_level >= 1)
            ai.in_danger = true;
    }

}

class Target {

    constructor(item, ai) {
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

    constructor(item, angle, ai) {
        this.reference = item;
        this.angle = angle;
        this.life = Math.PI / ai.ship.rotation_speed;
    }

}

//Allows us to find the min/max of a function within the border wrapping system
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

    static danger_radius = [ 0, 18, 14, 34, 53, 52, 66 ];
    static pessimistic_radius = [ 14, 34, 53, 27, 32 ];
    static target_radius = [ 5, 17.5, 25, 11, 15 ];
    static rotation_precision = 1;

    constructor(C, game) {
        //Control choices of the AI
        this.controls = {
            left: false,
            right: false,
            forward: false,
            fire: false
        };
        //These are constants (that are meant to be optimized through machine learning)
        this.C = C;
        //Variables for the AI
        this.game = game;
        this.in_danger = false;
        this.dangers = [];
        this.targets = [];
        this.markers = [];
        this.crosshair = null;
        this.ship = null;
        this.flee_values = [ 0, 0, 0, 0 ];
        this.size_groups = [ 0, 0 ];
        this.random_aiming_movement_cooldown = this.C[23];
    }

    calculateDanger(danger) {
        return optimizeInWrap((offset) => {
            const p = Vector.sub(Vector.add(danger.position, offset), this.ship.position);
            let result = 0;
            //Add danger velocity term
            const danger_velocity_term = Math.max(0, -p.comp(danger.velocity));
            result += this.C[2] * (danger_velocity_term ** this.C[3]);
            //Add ship velocity term
            const ship_velocity_term = Math.max(0, p.comp(this.ship.velocity));
            result += this.C[4] * (ship_velocity_term ** this.C[5]);
            //Add ship direction term
            let ship_direction_term = new Vector(Math.cos(this.ship.angle), Math.sin(-this.ship.angle));
            ship_direction_term = Math.max(0, p.comp(ship_direction_term));
            result += this.C[6] * (ship_direction_term ** this.C[7]);
            //Add distance term
            let distance_term = 1 / Math.max(1, p.mag() - this.ship.size - danger.size);
            result += this.C[1];
            result *= (distance_term ** this.C[0]);
            return result;
        }, (best, next) => {
            return (best == null || next > best);
        });
    }

    //Generates all virtual entities to use for the game
    generateVirtualEntities() {
        if (!this.game.ship.dead)
            this.ship = new VirtualShip(this.game.ship);
        this.dangers = [];
        this.targets = [];
        this.in_danger = false;
        this.flee_values = [ 0, 0, 0, 0 ];
        this.size_groups = [ 0, 0 ];
        for (let i = 0; i < this.game.asteroids.length; i++) {
            this.dangers.push(new Danger(this.game.asteroids[i], this));
            this.targets.push(new Target(this.game.asteroids[i], this));
        }
        for (let i = 0; i < this.game.saucers.length; i++) {
            this.dangers.push(new Danger(this.game.saucers[i], this));
            this.targets.push(new Target(this.game.saucers[i], this));
        }
        for (let i = 0; i < this.game.saucer_bullets.length; i++)
            this.dangers.push(new Danger(this.game.saucer_bullets[i], this));
        this.getFleeValues();
    }

    //Creates flee values
    getFleeValues() {
        this.flee_values = [ 0, 0, 0, 0 ];
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
                this.flee_values[0] += this.C[8] * ((-p.y) ** this.C[9]);
            else
                this.flee_values[1] += this.C[8] * (p.y ** this.C[9]);
            this.flee_values[2] += this.C[16] * (Math.abs(p.y) ** this.C[17]);
            if (p.x > 0) {
                this.flee_values[2] += this.C[10] * (p.x ** this.C[11]);
                this.flee_values[0] += this.C[18] * (p.x ** this.C[19]);
                this.flee_values[1] += this.C[18] * (p.x ** this.C[19]);
            }
            else {
                this.flee_values[3] += this.C[12] * ((-p.x) ** this.C[13]);
                this.flee_values[0] += this.C[14] * ((-p.x) ** this.C[15]);
                this.flee_values[1] += this.C[14] * ((-p.x) ** this.C[15]);
            }
        }
    }

    //Fleeing strategy
    manageFleeing() {
        if (this.flee_values[0] >= 1 && this.flee_values[0] < 1)
            this.controls.left = true;
        else if (this.flee_values[1] >= 1 && this.flee_values[0] < 1)
            this.controls.right = true;
        if (this.flee_values[2] >= 1 && this.flee_values[3] < 1)
            this.controls.forward = true;
        /*if (this.flee_values[0] >= 1 && this.flee_values[1] < this.flee_values[0])
            this.controls.left = true;
        else if (this.flee_values[1] >= 1 && this.flee_values[0] < this.flee_values[1])
            this.controls.right = true;
        if (this.flee_values[2] >= 1 && this.flee_values[3] < this.flee_values[2])
            this.controls.forward = true;*/
    }

    //Formula for calculating the time it takes for a circle and point to collide (each with a unique constant velocity)
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

    //Predict the future states of objects
    predictStates(step) {
        //Predict ship state
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
        //Progress target positions
        for (let i = 0; i < this.targets.length; i++) {
            this.targets[i].position.add(Vector.mul(this.targets[i].velocity, step));
            wrap(this.targets[i].position);
        }
    }

    //Checks if a target has already been marked
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

    //Finds shortest distance (while considering wrapping) between two vectors
    getShortestDistance(v1, v2) {
        return optimizeInWrap((offset) => {
            return Vector.sub(Vector.add(v1, offset), v2).mag();
        }, (best, next) => {
            return (best == null || next < best);
        });
    }

    //Checks if a bullet will hit a target in current ship state
    checkBulletCollisionTime(target, pessimistic_size = false) {
        return optimizeInWrap((offset) => {
            //Check if there is a bullet collision
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
            if (result >= this.ship.bullet_life - 1 || (target.size > 0 && target.size < 3 && Vector.add(p1, Vector.mul(v1, result)) - target.size < this.C[20])) return null;
            return result;
        }, (best, next) => {
            return (best == null || (next != null && best > next));
        });
    }

    //Checks if shooting an object will cause collateral damage
    checkCollateralDamage(target) {
        for (let i = 0; i < this.targets.length; i++) {
            const result = this.checkBulletCollisionTime(this.targets[i], true);
            if (result != null && Object.is(target, this.targets[i])) return false;
        }
        return true;
    }

    //Checks if destroying the target will violate the clutter optimization rules
    checkClutterViolation(target) {
        if (target.size_index >= 3 || target.size_index == 0) return false;
        if (target.size_index == 1) {
            if (this.size_groups[0] + 2 > this.C[21]) return true;
        } else if (target.size_index == 2) {
            if (this.size_groups[0] + this.size_groups[1] + 2 > this.C[22]) return true;
        }
        return false;
    }

    //Checks if you should shoot with current object position
    checkShootingOpportunity() {
        let destroyed = null;
        let min_time = Infinity;
        for (let i = 0; i < this.targets.length; i++) {
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

    //Shooting strategy
    manageShooting(delay) {
        if (this.ship.bullet_cooldown < 1) return;
        this.predictStates(delay / game_precision);
        const opportunity = this.checkShootingOpportunity();
        if (opportunity[0] != null) {
            this.controls.fire = true;
            this.markers.push(new Marker(opportunity[1] + 1, opportunity[0]));
        }
    }

    //Updates target markers
    updateMarkers(delay) {
        if (this.game.ship.dead && this.game.ship.lives <= 0) {
            this.markers = [];
            return;
        }
        const new_markers = [];
        for (let i = 0; i < this.markers.length; i++) {
            if (!this.game.paused)
                this.markers[i].life -= delay;
            if (this.markers[i].life > 0)
                new_markers.push(this.markers[i]);
        }
        this.markers = new_markers;
    }

    //Aiming strategy
    manageAim(delay) {
        //Iterate through different angles off from our current angle
        if (this.crosshair != null && (this.targetMarked(this.crosshair) || this.crosshair.life <= 0))
            this.crosshair = null;
        //Pick a new target if no current target
        if (this.crosshair == null) {
            let angle_offset = 0;
            let target = null;
            let aim_angle = null;
            let iterations = 0;
            this.predictStates(delay);
            while (angle_offset <= Math.PI) {
                //Check if we rotate left
                this.ship.angle += angle_offset;
                while (this.ship.angle >= Math.PI * 2) this.ship.angle -= Math.PI * 2;
                let result = this.checkShootingOpportunity();
                if (result[0] != null) {
                    target = result[0];
                    this.ship.angle -= angle_offset;
                    aim_angle = this.ship.angle + angle_offset;
                    break;
                }
                //Check if we rotate right
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
            if (target != null)
                this.crosshair = new Crosshair(target.reference, aim_angle, this);
            else this.random_aiming_movement_cooldown -= delay;
            if (this.random_aiming_movement_cooldown <= 0)
                this.controls.forward = true;
        }
        //Actually rotate towards the target
        if (this.crosshair == null) return;
        this.random_aiming_movement_cooldown = this.C[23];
        const goal_angle = this.crosshair.angle;
        let time_left;
        if (goal_angle >= this.ship.angle) time_left = goal_angle - this.ship.angle;
        else time_left = Math.PI * 2 - this.ship.angle + goal_angle;
        let time_right;
        if (goal_angle <= this.ship.angle) time_right = this.ship.angle - goal_angle;
        else time_right = this.ship.angle + Math.PI * 2 - goal_angle;
        if (time_left <= time_right) this.controls.left = true;
        else this.controls.right = true;
        //Update the crosshair
        if (this.crosshair != null && !this.game.paused) {
            this.crosshair.life -= delay;
            if (this.crosshair.life <= 0) this.crosshair = null;
        }
    }

    //AI makes decision and applies controls
    update(delay) {
        this.resetControls();
        this.generateVirtualEntities();
        if (this.in_danger) {
            this.crosshair = null;
            this.manageFleeing();
        } else this.manageAim(delay);
        this.generateVirtualEntities();
        this.manageShooting(delay);
        this.updateMarkers(delay);
    }

    //Resets AI controls
    resetControls() {
        for (let i in this.controls)
            this.controls[i] = false;
    }

    //Applies the AI controls to the actual player
    applyControls(controls) {
        controls.left = this.controls.left;
        controls.right = this.controls.right;
        controls.forward = this.controls.forward;
        controls.fire = this.controls.fire;
    }

}

//Actual training
function test(C, generation, id, trial, max_display_text_length, trial_seed) {
    const controls = {
        left: false,
        right: false,
        forward: false,
        fire: false,
        teleport: false,
        start: false,
        pause: false
    };
    const game = new Game(controls, trial_seed);
    const ai = new AI(C, game);
    let dead = false;
    while (!dead) {
        ai.update(delay);
        ai.applyControls(controls);
        const iteration_updates = game_precision * game_speed;
        for (let j = 0; j < iteration_updates; j++) {
            const done = game.update(delay / game_precision);
            if (done) {
                dead = true;
                break;
            }
        }
    }
    let text = "Generation " + generation + ": Species " + (id + 1) + ", Trial " + trial + ", Score " + game.score + ", Time Elapsed " + Math.floor(game.time);
    while (text.length < max_display_text_length)
        text += " ";
    process.stdout.write(text + "\r");
    return [ game.score, game.time ];
}

function sampleNormalDistribution(mean, std) {
    const a = 1 - Math.random();
    const b = Math.random();
    const c = Math.sqrt(-2.0 * Math.log(a)) * Math.cos(2.0 * Math.PI * b);
    return c * std + mean;
}

module.exports = { test, sampleNormalDistribution };