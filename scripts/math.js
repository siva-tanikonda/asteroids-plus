class Vector{
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
        var magnitude = this.mag();
        if (magnitude == 0) return;
        this.x /= magnitude;
        this.y /= magnitude;
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
    static copy(v) {
        return new Vector(v.x, v.y);
    }
    static mag(v) {
        return Math.sqrt(v.x ** 2 + v.y ** 2);
    }
    static norm(v) {
        var magnitude = v.mag();
        if (magnitude == 0) return v.copy();
        return new Vector(v.x / magnitude, v.y / magnitude);
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
}