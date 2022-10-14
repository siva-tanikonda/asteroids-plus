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
}