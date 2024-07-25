#include "math_helper.h"

Vector::Vector(double x, double y) : x(x), y(y) { }

Vector& Vector::operator+=(const Vector &v) {
    this->x += v.x;
    this->y += v.y;
    return *this;
}

Vector& Vector::operator-=(const Vector &v) {
    this->x -= v.x;
    this->y -= v.y;
    return *this;
}

Vector& Vector::operator*=(double k) {
    this->x *= k;
    this->y *= k;
    return *this;
}

Vector& Vector::operator/=(double k) {
    this->x /= k;
    this->y /= k;
    return *this;
}

Vector Vector::operator+(const Vector &v) const {
    return Vector(this->x + v.x, this->y + v.y);
}

Vector Vector::operator-(const Vector &v) const {
    return Vector(this->x - v.x, this->y - v.y);
}

Vector Vector::operator*(double k) const {
    return Vector(this->x * k, this->y * k);
}

Vector Vector::operator/(double k) const {
    return Vector(this->x / k, this->y / k);
}

double Vector::mag() const {
    return sqrt(this->x * this->x + this->y * this->y);
}

void Vector::normalize() {
    double len = this->mag();
    if (len == 0) {
        return;
    }
    this->x /= len;
    this->y /= len;
}

void Vector::rotate(double a, const Vector& d) {
    double nx = ((this->x - d.x) * cos(a) + (this->y - d.y) * sin(a)) + d.x;
    this->y = ((d.x - this->x) * sin(a) + (this->y - d.y) * cos(a)) + d.y;
    this->x = nx;
}

double Vector::dot(const Vector &v) const {
    return this->x * v.x + this->y * v.y;
}

double Vector::cross(const Vector &v) const {
    return this->x * v.y - this->y * v.x;
}

double Vector::angle() const {
    double angle = atan2(this->y, this->x);
    while (angle < 0) {
        angle += M_PI * 2;
    }
    return angle;
}

double Vector::dist(const Vector &v) const {
    return sqrt((this->x - v.x) * (this->x - v.x) + (this->y - v.y) * (this->y - v.y));
}

double Vector::comp(const Vector &v) const {
    if (this->mag() == 0) {
        return 0;
    }
    return this->dot(v);
}

Vector Vector::proj(const Vector &v) const {
    if (this->mag() == 0) {
        return Vector();
    }
    return ((*this) / this->mag()) * this->comp(v);
}

double Vector::mag(const Vector &v) {
    return sqrt(v.x * v.x + v.y * v.y);
}

Vector Vector::normalize(const Vector &v) {
    double len = v.mag();
    if (len == 0) {
        return v;
    }
    return Vector(v.x, v.y) / len;
}

Vector Vector::rotate(const Vector &v, double a, const Vector &d) {
    double nx = ((v.x - d.x) * cos(a) + (v.y - d.y) * sin(a)) + d.x;
    double ny = ((d.x - v.x) * sin(a) + (v.y - d.y) * cos(a)) + d.y;
    return Vector(nx, ny);
}

double Vector::dot(const Vector &u, const Vector &v) {
    return u.x * v.x + u.y * v.y;
}

double Vector::cross(const Vector &u, const Vector &v) {
    return u.x * v.y - u.y * v.x;
}

double Vector::angle(const Vector &v) {
    double angle = atan2(v.y, v.x);
    while (angle < 0) {
        angle += M_PI * 2;
    }
    return angle;
}

double Vector::dist(const Vector &u, const Vector &v) {
    return sqrt((u.x - v.x) * (u.x - v.x) + (u.y - v.y) * (u.y - v.y));
}

double Vector::comp(const Vector &u, const Vector &v) {
    if (u.mag() == 0) {
        return 0;
    }
    return u.dot(v);
}

Vector Vector::proj(const Vector &u, const Vector &v) {
    if (u.mag() == 0) {
        return Vector();
    }
    return (u / u.mag()) * u.comp(v);
}

int Vector::side(const Vector &u, const Vector &v, const Vector &w) {
    Vector uv = v - u;
    Vector vw = w - v;
    double crs = uv.cross(vw);
    if (crs > 0) {
        return -1;
    } else if (crs < 0) {
        return 1;
    } else {
        return 0;
    }
}

Rect::Rect(double left, double top, double right, double bottom) : left(left), x(left), right(right), top(top), y(top), bottom(bottom), width(right - left), height(bottom - top) { }

bool Rect::intersects(const Rect &r) const {
    return !(this->right < r.left || this->left > r.right || this->top > r.bottom || this->bottom < r.top);
}

LineSegment::LineSegment(const Vector &a, const Vector &b) {
    this->a = a;
    this->b = b;
}

bool LineSegment::containsPoint(const Vector &v) const {
    int side = Vector::side(this->a, this->b, v);
    if (side != 0) {
        return false;
    }
    double min_x = min(this->a.x, this->b.x);
    double max_x = max(this->a.x, this->b.x);
    return (v.x >= min_x && v.x <= max_x);
}

bool LineSegment::intersects(const LineSegment &l) const {
    if (l.containsPoint(this->a) || l.containsPoint(this->b) || this->containsPoint(l.a) || this->containsPoint(l.b)) {
        return true;
    }
    int s1 = Vector::side(this->a, this->b, l.a);
    int s2 = Vector::side(this->a, this->b, l.b);
    int s3 = Vector::side(l.a, l.b, this->a);
    int s4 = Vector::side(l.a, l.b, this->b);
    if (s1 == 0 || s2 == 0 || s3 == 0 || s4 == 0) {
        return false;
    }
    return (s1 != s2 && s3 != s4);
}

Polygon::Polygon(const vector<Vector> &points) : points(points) { }

void Polygon::translate(const Vector &v) {
    for (Vector &u : this->points) {
        u += v;
    }
}

void Polygon::scale(double k) {
    for (Vector &v : this->points) {
        v *= k;
    }
}

Rect Polygon::getRect() const {
    double min_x, min_y, max_x, max_y;
    min_x = min_y = DBL_MAX;
    max_x = max_y = DBL_MIN;
    for (const Vector &v : this->points) {
        min_x = min(min_x, v.x);
        min_y = min(min_y, v.y);
        max_x = max(max_x, v.x);
        max_y = max(max_y, v.y);
    }
    return Rect(min_x, min_y, max_x, max_y);
}

void Polygon::rotate(double a, const Vector &d) {
    for (Vector &v : this->points) {
        v.rotate(a, d);
    }
}

bool Polygon::containsPoint(const Vector &v) const {
    Rect rect = this->getRect();
    if (v.x < rect.left || v.x > rect.right || v.y < rect.top || v.y > rect.bottom) {
        return false;
    }
    bool result = false;
    for (int i = 0; i < this->points.size(); i++) {
        int j = (i + 1) % this->points.size();
        int side = Vector::side(this->points[i], this->points[j], v);
        if (side == 0) {
            double min_x = min(this->points[i].x, this->points[j].x);
            double max_x = max(this->points[i].x, this->points[j].x);
            if (v.x >= min_x && v.x <= max_x) {
                return true;
            } else {
                continue;
            }
        }
        if (this->points[i].y == this->points[j].y) {
            continue;
        }
        if (this->points[i].y < this->points[j].y) {
            if (side == 1 && v.y >= this->points[i].y && v.y < this->points[j].y) {
                result = !result;
            }
        } else {
            side = Vector::side(this->points[j], this->points[i], v);
            if (side == 1 && v.y > this->points[j].y && v.y <= this->points[i].y) {
                result = !result;
            }
        }
    }
    return result;
}

bool Polygon::intersectsLineSegment(const LineSegment &l) const {
    for (int i = 0; i < this->points.size(); i++) {
        int j = (i + 1) % this->points.size();
        LineSegment segment(this->points[i], this->points[j]);
        if (segment.intersects(l)) {
            return true;
        }
    }
    return false;
}

bool Polygon::intersectsPolygon(const Polygon &p) const {
    Rect rect1 = p.getRect();
    Rect rect2 = this->getRect();
    if (!rect1.intersects(rect2)) {
        return false;
    }
    for (const Vector &v : p.points) {
        if (this->containsPoint(v)) {
            return true;
        }
    }
    for (int i = 0; i < p.points.size(); i++) {
        int j = (i + 1) % p.points.size();
        LineSegment segment(p.points[i], p.points[j]);
        if (this->intersectsLineSegment(segment)) {
            return true;
        }
    }
    return false;
}

double randomDouble(mt19937 &gen) {
    return (double)gen() / mt19937::max();
}

double randomInRange(mt19937 &gen, double left, double right) {
    return left + randomDouble(gen) * (right - left);
}

double randomInNormal(mt19937 &gen, double mean, double std) {
    std::normal_distribution<double> distribution(mean, std);
    return distribution(gen);
}

void wrap(Vector &v, int width, int height, bool wrap_x, bool wrap_y) {
    while (v.x >= width && wrap_x) {
        v.x -= width;
    }
    while (v.x < 0 && wrap_x) {
        v.x += width;
    }
    while (v.y >= height && wrap_y) {
        v.y -= height;
    }
    while (v.y < 0 && wrap_y) {
        v.y += height;
    }
}

vector<double> solveQuadratic(double a, double b, double c) {
    double discriminant = b * b - 4 * a * c;
    vector<double> result;
    if (discriminant == 0) {
        result.push_back(-b / (2 * a));
    } else if (discriminant > 0) {
        result.push_back((-b + sqrt(discriminant)) / (2 * a));
        result.push_back((-b - sqrt(discriminant)) / (2 * a));
        if (result[1] < result[0]) {
            swap(result[0], result[1]);
        }
    }
    return result;
}