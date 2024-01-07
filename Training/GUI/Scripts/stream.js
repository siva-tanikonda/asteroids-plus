//Only mathematical class needed is vector class
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
        if (len == 0) {
            return;
        }
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
        while (angle < 0) {
            angle += Math.PI * 2;
        }
        return angle;
    }
    dist(v) {
        return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2);
    }
    comp(v) {
        if (this.mag() == 0) {
            return 0;
        }
        return this.dot(v);
    }
    proj(v) {
        if (this.mag() == 0) {
            return new Vector();
        }
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
        if (len == 0) {
            return v.copy();
        }
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
        while (angle < 0) {
            angle += Math.PI * 2;
        }
        return angle;
    }
    static dist(u, v) {
        return Math.sqrt((u.x - v.x) ** 2 + (u.y - v.y) ** 2);
    }
    static comp(u, v) {
        if (u.mag() == 0) {
            return 0;
        }
        return u.dot(v);
    }
    static proj(u, v) {
        if (u.mag() == 0) {
            return Vector();
        }
        return Vector.mul(Vector.div(u, u.mag()), u.comp(v));
    }
    static side(u, v, w) {
        const uv = Vector.sub(v, u);
        const vw = Vector.sub(w, v);
        if (uv.cross(vw) > 0) {
            return -1;
        } else if (uv.cross(vw) < 0) {
            return 1;
        } else {
            return 0;
        }
    }
}

//The code here is similar to the draw function in the playable game, but with circular bodies
function renderWrap(position, radius, action, offset_x = true, offset_y = true) {
    const horizontal = [ 0 ];
    const vertical = [ 0 ];
    if (position.x + radius >= stream.width) {
        horizontal.push(-stream.width);
    }
    if (position.x - radius <= 0) {
        horizontal.push(stream.width);
    }
    if (position.y + radius >= stream.height) {
        vertical.push(-stream.height);
    }
    if (position.y - radius <= 0) {
        vertical.push(stream.height);
    }
    for (let i = 0; i < horizontal.length; i++) {
        for (let j = 0; j < vertical.length; j++) {
            if ((horizontal[i] == 0 || offset_x) && (vertical[i] == 0 || offset_y)) {
                action(new Vector(horizontal[i], vertical[j]));
            }
        }
    }
}
class Debug {

    static drawBounds(item) {
        sctx.fillStyle = "#c86464";
        sctx.globalAlpha = 0.35;
        if (item.entity == "p") {
            sctx.beginPath();
            sctx.moveTo(item.bounds.points[item.bounds.points.length - 1].x, item.bounds.points[item.bounds.points.length - 1].y);
            for (let i = 0; i < item.bounds.points.length; i++) {
                sctx.lineTo(item.bounds.points[i].x, item.bounds.points[i].y);
            }
            sctx.fill();
        } else {
            sctx.beginPath();
            sctx.arc(item.bounds.position.x, item.bounds.position.y, item.bounds.radius, 0, 2 * Math.PI);
            sctx.fill();
            sctx.fillStyle = "rgb(20, 20, 20)";
            sctx.globalAlpha = 1.0;
            sctx.beginPath();
            sctx.arc(item.target.position.x, item.target.position.y, item.target.radius - 1, 0, 2 * Math.PI);
            sctx.fill();
            sctx.fillStyle = "#9cf0a3";
            sctx.globalAlpha = 0.35;
            sctx.beginPath();
            sctx.arc(item.target.position.x, item.target.position.y, item.target.radius, 0, 2 * Math.PI);
            sctx.fill();
        }
        sctx.globalAlpha = 1.0;
    }
    static drawPosition(item) {
        sctx.fillStyle = "#7dfa7d";
        sctx.globalAlpha = 0.75;
        sctx.beginPath();
        sctx.arc(item.position.x, item.position.y, 2.5, 0, 2 * Math.PI);
        sctx.fill();
        sctx.globalAlpha = 1.0;
    }
    static drawVelocity(item) {
        const angle = Vector.angle(item.velocity);
        sctx.translate(item.position.x, item.position.y);
        sctx.rotate(angle);
        sctx.translate(-item.position.x, -item.position.y);
        const scale_velocity = Vector.mag(item.velocity) * 10;
        sctx.strokeStyle = "#fafa64";
        sctx.lineWidth = 1.5;
        sctx.globalAlpha = 0.75;
        sctx.beginPath();
        sctx.moveTo(item.position.x, item.position.y);
        sctx.lineTo(item.position.x + scale_velocity, item.position.y);
        sctx.lineTo(item.position.x + scale_velocity - 5, item.position.y - 5);
        sctx.moveTo(item.position.x + scale_velocity, item.position.y);
        sctx.lineTo(item.position.x + scale_velocity - 5, item.position.y + 5);
        sctx.stroke();
        sctx.resetTransform();
        sctx.globalAlpha = 1.0;
    }
    static drawAcceleration(item) {
        if (!item.accelerating) {
            return;
        }
        sctx.translate(item.position.x, item.position.y);
        sctx.rotate(-item.angle);
        sctx.translate(-item.position.x, -item.position.y);
        const scale_acceleration = item.acceleration * 250;
        sctx.strokeStyle = "#a7b8fc";
        sctx.lineWidth = 1.5;
        sctx.globalAlpha = 0.5;
        sctx.beginPath();
        sctx.moveTo(item.position.x, item.position.y);
        sctx.lineTo(item.position.x + scale_acceleration, item.position.y);
        sctx.lineTo(item.position.x + scale_acceleration - 5, item.position.y - 5);
        sctx.moveTo(item.position.x + scale_acceleration, item.position.y);
        sctx.lineTo(item.position.x + scale_acceleration - 5, item.position.y + 5);
        sctx.stroke();
        sctx.resetTransform();
        sctx.globalAlpha = 1.0;
    }

}
class ShipRenderer {

    static drawShip(ship, offset, position, alpha = 1.0) {
        if (ship.invincibility > 0 && ship.invincibility_flash < 0.5) {
            return;
        }
        sctx.strokeStyle = "white";
        sctx.fillStyle = "rgb(20, 20, 20)";
        sctx.globalAlpha = alpha;
        sctx.lineWidth = 1.5;
        sctx.translate(offset.x, offset.y);
        sctx.translate(position.x, position.y);
        sctx.rotate(-ship.angle);
        sctx.translate(-position.x, -position.y);
        sctx.beginPath();
        sctx.moveTo(position.x - ship.width / 2, position.y - ship.height / 2);
        sctx.lineTo(position.x + ship.width / 2, position.y);
        sctx.moveTo(position.x - ship.width / 2, position.y + ship.height / 2);
        sctx.lineTo(position.x + ship.width / 2, position.y);
        sctx.moveTo(position.x - ship.width / 2, position.y - ship.height / 2);
        sctx.lineTo(position.x - ship.width / 2, position.y + ship.height / 2);
        sctx.fill();
        sctx.stroke();
        sctx.globalAlpha = 1.0;
        sctx.resetTransform();
        sctx.translate(offset.x, offset.y);
        Debug.drawBounds(ship);
        sctx.translate(-offset.x, -offset.y);
        Debug.drawPosition(ship);
        Debug.drawVelocity(ship);
        Debug.drawAcceleration(ship);
    }

    static drawWrapBeforeTeleportation(ship, offset) {
        if (ship.teleport_buffer == 0) {
            ShipRenderer.drawShip(ship, offset, ship.position);
        } else {
            ShipRenderer.drawShip(ship, offset, ship.position, 1.0 - ship.teleport_buffer);
        }
    }

    static drawWrapAfterTeleportation(ship, offset) {
        ShipRenderer.drawShip(ship, offset, ship.teleport_location, ship.teleport_buffer);
    }

    static draw(ship) {
        if (ship.dead) {
            return;
        }
        renderWrap(ship.position, ship.width / 2, (offset) => {
            ShipRenderer.drawWrapBeforeTeleportation(ship, offset);
        });
        if (ship.teleport_buffer != 0) {
            renderWrap(ship.position, ship.width / 2, (offset) => {
                ShipRenderer.drawWrapAfterTeleportation(ship, offset);
            });
        }
    }

}
class BulletRenderer {

    static drawBullet(bullet, offset) {
        sctx.strokeStyle = "white";
        sctx.lineWidth = 1.5;
        sctx.translate(offset.x, offset.y);
        sctx.beginPath();
        sctx.arc(bullet.position.x, bullet.position.y, bullet.radius, 0, 2 * Math.PI);
        sctx.stroke();
        sctx.resetTransform();
    }

    static draw(bullet) {
        renderWrap(bullet.position, bullet.radius, (offset) => {
            BulletRenderer.drawBullet(bullet, offset);
        });
    }

}
class AsteroidRenderer {
    
    static drawAsteroid(asteroid, offset) {
        sctx.translate(offset.x, offset.y);
        sctx.strokeStyle = "white";
        sctx.lineWidth = 1.5;
        if (asteroid.invincibility > 0) {
            sctx.globalAlpha = 0.25;
        }
        sctx.beginPath();
        sctx.arc(asteroid.bounds.position.x, asteroid.bounds.position.y, asteroid.bounds.radius, 0, 2 * Math.PI);
        sctx.stroke();
        sctx.beginPath();
        sctx.arc(asteroid.target.position.x, asteroid.target.position.y, asteroid.target.radius, 0, 2 * Math.PI);
        sctx.stroke();
        sctx.resetTransform();
        sctx.globalAlpha = 1;
        sctx.translate(offset.x, offset.y);
        Debug.drawBounds(asteroid);
        sctx.translate(-offset.x, -offset.y);
        Debug.drawPosition(asteroid);
        Debug.drawVelocity(asteroid);
    }
    static draw(asteroid) {
        renderWrap(asteroid.position, Math.max(asteroid.rect.width / 2, asteroid.rect.height / 2), (offset) => {
            AsteroidRenderer.drawAsteroid(asteroid, offset);
        });
    }
}
class SaucerRenderer {

    static drawSaucer(saucer, offset) {
        sctx.translate(offset.x, offset.y);
        sctx.strokeStyle = "white";
        sctx.fillStyle = "rgb(20, 20, 20)";
        sctx.lineWidth = 1.5;
        sctx.beginPath();
        sctx.arc(saucer.bounds.position.x, saucer.bounds.position.y, saucer.bounds.radius, 0, 2 * Math.PI);
        sctx.stroke();
        sctx.beginPath();
        sctx.arc(saucer.target.position.x, saucer.target.position.y, saucer.target.radius, 0, 2 * Math.PI);
        sctx.stroke();
        Debug.drawBounds(saucer);
        Debug.drawPosition(saucer);
        Debug.drawVelocity(saucer);
        sctx.resetTransform();
    }

    static draw(saucer) {
        renderWrap(saucer.position, Math.max(saucer.rect.width / 2, saucer.rect.height / 2), (offset) => {
            SaucerRenderer.drawSaucer(saucer, offset);
        }, saucer.entered_x, saucer.entered_y);
    }

}

//Draws the game stream
function drawGame() {
    sctx.fillStyle = "white";
    sctx.font = "20px Roboto Mono Regular";
    sctx.fillText(stream_data[0], 15, 25);
    if (stream_data[1] == undefined) {
        return;
    }
    ShipRenderer.draw(stream_data[1]);
    for (let i = 0; i < stream_data[2].length; i++) {
        BulletRenderer.draw(stream_data[2][i]);
    }
    for (let i = 0; i < stream_data[3].length; i++) {
        AsteroidRenderer.draw(stream_data[3][i]);
    }
    for (let i = 0; i < stream_data[4].length; i++) {
        SaucerRenderer.draw(stream_data[4][i]);
    }
    for (let i = 0; i < stream_data[5].length; i++) {
        BulletRenderer.draw(stream_data[5][i]);
    }
}

//Wrapper function for the stream rendering
function drawStream() {
    sctx.clearRect(0, 0, stream.width, stream.height);
    if (data.thread != -1 && streaming) {
        sctx.fillStyle = "yellow";
        sctx.font = "20px Roboto Mono Regular";
        const text_width = sctx.measureText("Thread " + (data.thread + 1)).width;
        sctx.fillText("Thread " + (data.thread + 1), stream.width - text_width - 10, 25);
        drawGame();
    } else {
        sctx.fillStyle = "yellow";
        sctx.font = "30px Roboto Mono Regular";
        const text_width = sctx.measureText("Stream Inactive").width;
        sctx.fillText("Stream Inactive", stream.width / 2 - text_width / 2, stream.height / 2 - 15);
    }
}