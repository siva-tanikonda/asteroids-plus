//Canvas bounds variable
const canvas_bounds = {
    width: 900,
    height: 900
};

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
        if (side != 0) {
            return false;
        }
        const min_x = Math.min(this.a.x, this.b.x);
        const max_x = Math.max(this.a.x, this.b.x);
        return (v.x >= min_x && v.x <= max_x);
    }
    intersects(l) {
        if (l.containsPoint(this.a) || l.containsPoint(this.b) || this.containsPoint(l.a) || this.containsPoint(l.b)) {
            return true;
        }
        const s1 = Vector.side(this.a, this.b, l.a);
        const s2 = Vector.side(this.a, this.b, l.b);
        const s3 = Vector.side(l.a, l.b, this.a);
        const s4 = Vector.side(l.a, l.b, this.b);
        if (s1 == 0 || s2 == 0 || s3 == 0 || s4 == 0) {
            return false;
        }
        return (s1 != s2 && s3 != s4);
    }
}
class Circle {
    
    constructor(p, radius) {
        this.position = p;
        this.radius = radius;
    }
    
    translate(v) {
        this.position.add(v);
    }

    getRect() {
        return new Rect(this.position.x - this.radius, this.position.y - this.radius, this.position.x + this.radius, this.position.y + this.radius);
    }

    containsPoint(v) {
        const rect = this.getRect();
        if (v.x < rect.left || v.x > rect.right || v.y < rect.top || v.y > rect.bottom) {
            return false;
        }
        const dist = Vector.sub(this.position, v);
        return (dist.mag() <= this.radius);
    }

    intersectsLineSegment(l) {
        const v1 = Vector.sub(l.a, this.position);
        const v2 = Vector.sub(l.b, this.position);
        const diff = Vector.sub(v1, v2);
        const pr = diff.proj(v1);
        const dist2 = v1.mag() ** 2 - pr.mag() ** 2;
        if (dist2 ** 2 + v1.mag() ** 2 > diff.mag() ** 2 || dist2 ** 2 + v2.mag() ** 2 > diff.mag() ** 2) {
            return false;
        }
        return (dist2 <= this.radius ** 2);
    }

    intersectsPolygon(p) {
        const rect1 = p.getRect();
        const rect2 = this.getRect();
        if (!rect1.intersects(rect2)) {
            return false;
        }
        for (let i = 0; i < p.points.length; i++) {
            if (this.containsPoint(p.points[i])) {
                return true;
            }
        }
        for (let i = 0; i < p.points.length; i++) {
            const j = (i + 1) % p.points.length;
            const segment = new LineSegment(p.points[i], p.points[j]);
            if (this.intersectsLineSegment(segment)) {
                return true;
            }
        }
        return false;
    }

}
class Polygon {
    constructor(points) {
        this.points = [];
        for (let i = 0; i < points.length; i++) {
            this.points.push(new Vector(points[i][0], points[i][1]));
        }
    }
    copy() {
        const c_points = [];
        for (let i = 0; i < this.points.length; i++) {
            c_points.push([this.points[i].x, this.points[i].y]);
        }
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
        for (let i = 0; i < this.points.length; i++) {
            this.points[i].mul(k);
        }
    }
    rotate(a, d) {
        for (let i = 0; i < this.points.length; i++) {
            this.points[i].rotate(a, d);
        }
    }
    translate(v) {
        for (let i = 0; i < this.points.length; i++) {
            this.points[i].add(v);
        }
    }
    containsPoint(v) {
        const rect = this.getRect();
        if (v.x < rect.left || v.x > rect.right || v.y < rect.top || v.y > rect.bottom) {
            return false;
        }
        let result = false;
        for (let i = 0; i < this.points.length; i++) {
            const j = (i + 1) % this.points.length;
            const side = Vector.side(this.points[i], this.points[j], v);
            if (side == 0) {
                const min_x = Math.min(this.points[i].x, this.points[j].x);
                const max_x = Math.max(this.points[i].x, this.points[j].x);
                if (v.x >= min_x && v.x <= max_x) {
                    return true;
                } else {
                    continue;
                }    
            }
            if (this.points[i].y == this.points[j].y) {
                continue;
            }
            if (this.points[i].y < this.points[j].y) {
                const side = Vector.side(this.points[i], this.points[j], v);
                if (side == 1 && v.y >= this.points[i].y && v.y < this.points[j].y) {
                    result = !result;
                }
            }
            else {
                const side = Vector.side(this.points[j], this.points[i], v);
                if (side == 1 && v.y > this.points[j].y && v.y <= this.points[i].y) {
                    result = !result;
                }
            }
        }
        return result;
    }
}
function randomInRange(random, range) {
    return range[0] + random() * (range[1] - range[0]);
}
function wrap(v, wrap_x = true, wrap_y = true) {
    while (v.x >= canvas_bounds.width && wrap_x) {
        v.x -= canvas_bounds.width;
    }
    while (v.x < 0 && wrap_x) {
        v.x += canvas_bounds.width;
    }
    while (v.y >= canvas_bounds.height && wrap_y) {
        v.y -= canvas_bounds.height;
    }
    while (v.y < 0 && wrap_y) {
        v.y += canvas_bounds.height;
    }
}
function solveQuadratic(a, b, c) {
    var dsc = b ** 2 - 4 * a * c;
    if (dsc < 0) {
        return [];
    } else if (dsc == 0) {
        return [-b / (2 * a)];
    } else {
        var result = [(-b + Math.sqrt(dsc)) / (2 * a), (-b - Math.sqrt(dsc)) / (2 * a)];
        if (result[1] < result[0]) {
            [result[0], result[1]] = [result[1], result[0]];
        }
        return result;
    }
}

//Exports necessary classes and function to other files
module.exports = { Vector, Rect, Circle, Polygon, randomInRange, wrap, solveQuadratic };