class Vector{
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    copy() {
        return new Vector(x, y);
    }
    mag() {
        return Math.sqrt(x ** 2 + y ** 2);
    }
    norm() {
        var magnitude = mag();
        if (magnitude == 0) return;
        x = x / magnitude;
        y = y / magnitude;
    }
    add(v) {
        x += v.x;
        y += v.y;
    }
    sub(v) {
        x -= v.x;
        y -= v.y;
    }
    mul(k) {
        x *= k;
        y *= k;
    }
    div(k) {
        x /= k;
        y /= k;
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

/*function Vector(x = 0, y = 0) {
    this.x = x;
    this.y = y;
}
function copy(v) {
    return new Vector(v.x, v.y);
}
function length(v) {
    return Math.sqrt(v.x ** 2 + v.y ** 2);
}
function normalize(v) {
    var magnitude = length(v);
    if (magnitude == 0) return v;
    return new Vector(v.x / magnitude, v.y / magnitude);
}
function multiply(v, k) {
    return new Vector(v.x * k, v.y * k);
}
function add(a, b) {
    return new Vector(a.x + b.x, a.y + b.y);
}
function subtract(a, b) {
    return new Vector(a.x - b.x, a.y - b.y);
}
function divide(v, k) {
    return new Vector(v.x / k, v.y / k);
}*/