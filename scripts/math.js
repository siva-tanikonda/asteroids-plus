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
    norm() {
        var len = this.mag();
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
        var nx = ((this.x - d.x) * Math.cos(a) - (d.y - this.y) * Math.sin(a)) + d.x
        var ny = d.y - ((this.x - d.x) * Math.sin(a) + (d.y - this.y) * Math.cos(a));
        this.x = nx;
        this.y = ny;
    }
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
    cross(v) {
        return this.x * v.y - this.y * v.x;
    }
    angle() {
        return Math.atan2(this.y, this.x);
    }
    distance(v) {
        return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2);
    }
    proj_val(v) {
        if (this.mag() == 0) return 0;
        return this.dot(v) / this.mag();
    }
    proj(v) {
        if (this.mag() == 0) return new Vector();
        return Vector.mul(Vector.div(this, this.mag()), this.proj_val(v));
    }
    static copy(v) {
        return new Vector(v.x, v.y);
    }
    static mag(v) {
        return Math.sqrt(v.x ** 2 + v.y ** 2);
    }
    static norm(v) {
        var len = v.mag();
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
        var nx = ((v.x - d.x) * Math.cos(a), (v.y - d.y) * Math.sin(a)) + d.x;
        var ny = ((v.x - d.x) * Math.sin(a), (v.y - d.y) * Math.cos(a)) + d.y;
        return new Vector(nx, ny);
    }
    static dot(u, v) {
        return u.x * v.x + u.y * v.y;
    }
    static cross(u, v) {
        return u.x * v.y - u.y * v.x;
    }
    static angle(v) {
        return Math.atan2(v.y, v.x);
    }
    static distance(u, v) {
        return Math.sqrt((u.x - v.x) ** 2, (u.y - v.y) ** 2);
    }
    static proj_val(u, v) {
        if (u.mag() == 0) return 0;
        return u.dot(v) / u.mag();
    }
    static proj(u, v) {
        if (u.mag() == 0) return Vector();
        return Vector.mul(Vector.div(u, u.mag()), Vector.proj_val(u, v));
    }
    static side(u, v, w) {
        var uv = Vector.sub(v, u);
        var vw = Vector.sub(w, v);
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
        var side = Vector.side(this.a, this.b, v);
        if (side != 0) return false;
        var min_x = Math.min(this.a.x, this.b.x);
        var max_x = Math.max(this.a.x, this.b.x);
        return (v.x >= min_x && v.x <= max_x);
    }
    intersects(l) {
        if (l.containsPoint(this.a) || l.containsPoint(this.b) || this.containsPoint(l.a) || this.containsPoint(l.b))
            return true;
        var s1 = Vector.side(this.a, this.b, l.a);
        var s2 = Vector.side(this.a, this.b, l.b);
        var s3 = Vector.side(l.a, l.b, this.a);
        var s4 = Vector.side(l.a, l.b, this.b);
        if (s1 == 0 || s2 == 0 || s3 == 0 || s4 == 0)
            return false;
        return (s1 != s2 && s3 != s4);
    }
}

class Polygon {
    constructor(points) {
        this.points = [];
        for (var i = 0; i < points.length; i++)
            this.points.push(new Vector(points[i][0], points[i][1]));
    }
    copy() {
        var c_points = [];
        for (var i = 0; i < this.points.length; i++)
            c_points.push([this.points[i].x, this.points[i].y]);
        return new Polygon(c_points);
    }
    getRect() {
        var min_x, min_y, max_x, max_y;
        min_x = min_y = Infinity;
        max_x = max_y = -Infinity;
        for (var i = 0; i < this.points.length; i++) {
            min_x = Math.min(min_x, this.points[i].x);
            min_y = Math.min(min_y, this.points[i].y);
            max_x = Math.max(max_x, this.points[i].x);
            max_y = Math.max(max_y, this.points[i].y);
        }
        return new Rect(min_x, min_y, max_x, max_y);
    }
    scale(k) {
        for (var i = 0; i < this.points.length; i++)
            this.points[i].mul(k);
    }
    rotate(a, d) {
        for (var i = 0; i < this.points.length; i++)
            this.points[i].rotate(a, d);
    }
    translate(v) {
        for (var i = 0; i < this.points.length; i++)
            this.points[i].add(v);
    }
    containsPoint(v) {
        var rect = this.getRect();
        if (v.x < rect.left || v.x > rect.right || v.y < rect.top || v.y > rect.bottom)
            return false;
        var result = false;
        for (var i = 0; i < this.points.length; i++) {
            var j = (i + 1) % this.points.length;
            var side = Vector.side(this.points[i], this.points[j], v);
            if (side == 0) {
                var min_x = Math.min(this.points[i].x, this.points[j].x);
                var max_x = Math.max(this.points[i].x, this.points[j].x);
                if (v.x >= min_x && v.x <= max_x)
                    return true;
                else
                    continue;    
            }
            if (this.points[i].y == this.points[j].y)
                continue;
            if (this.points[i].y < this.points[j].y) {
                var side = Vector.side(this.points[i], this.points[j], v);
                if (side == 1 && v.y >= this.points[i].y && v.y < this.points[j].y)
                    result = !result;
            }
            else {
                var side = Vector.side(this.points[j], this.points[i], v);
                if (side == 1 && v.y > this.points[j].y && v.y <= this.points[i].y)
                    result = !result;
            }
        }
        return result;
    }
    intersectsLineSegment(l) {
        for (var i = 0; i < this.points.length; i++) {
            var j = (i + 1) % this.points.length;
            var segment = new LineSegment(this.points[i], this.points[j]);
            if (segment.intersects(l))
                return true;
        }
        return false;
    }
    intersectsPolygon(p) {
        var rect1 = p.getRect();
        var rect2 = this.getRect();
        if (!rect1.intersects(rect2)) return false;
        var inside = true;
        for (var i = 0; i < p.points.length; i++)
            inside &= this.containsPoint(p.points[i]);
        if (inside) return true;
        for (var i = 0; i < p.points.length; i++) {
            var j = (i + 1) % p.points.length;
            var segment = new LineSegment(p.points[i], p.points[j]);
            if (this.intersectsLineSegment(segment))
                return true;
        }
        return false;
    }
}

function randomInRange(range) {
    return range[0] + Math.random() * (range[1] - range[0]);
}

function randomInArray(array) {
    return array[Math.floor(randomInRange([0, array.length]))];
}