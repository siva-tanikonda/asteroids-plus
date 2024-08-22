#include <vector>
#include <random>
#include <cmath>
#include <cfloat>
#define _USE_MATH_DEFINES

using namespace std;

class Vector {
    public:
        double x, y;
        Vector(double x = 0, double y = 0);
        Vector& operator+=(const Vector &v);
        Vector& operator-=(const Vector &v);
        Vector& operator*=(double k);
        Vector& operator/=(double k);
        Vector operator+(const Vector &v) const;
        Vector operator-(const Vector &v) const;
        Vector operator*(double k) const;
        Vector operator/(double k) const;
        double mag() const;
        void normalize();
        void rotate(double a, const Vector &d);
        double dot(const Vector &v) const;
        double cross(const Vector &v) const;
        double angle() const;
        double dist(const Vector &v) const;
        double comp(const Vector &v) const;
        Vector proj(const Vector &v) const;
        static double mag(const Vector &v);
        static Vector normalize(const Vector &v);
        static Vector rotate(const Vector &v, double a, const Vector &d);
        static double dot(const Vector &u, const Vector &v);
        static double cross(const Vector &u, const Vector &v);
        static double angle(const Vector &v);
        static double dist(const Vector &u, const Vector &v);
        static double comp(const Vector &u, const Vector &v);
        static Vector proj(const Vector &u, const Vector &v);
        static int side(const Vector &u, const Vector &v, const Vector &w);
};

class Rect {
    public:
        double x, y, width, height, left, right, top, bottom;
        Rect(double left, double top, double right, double bottom);
        bool intersects(const Rect &r) const;
};

class LineSegment {
    public:
        Vector a, b;
        LineSegment(const Vector &a, const Vector &b);
        bool containsPoint(const Vector &v) const;
        bool intersects(const LineSegment &l) const;
};

class Polygon {
    public:
        vector<Vector> points;
        Polygon(const vector<Vector> &points);
        void translate(const Vector &v);
        void scale(double k);
        Rect getRect() const;
        void rotate(double a, const Vector &d);
        bool containsPoint(const Vector &v) const;
        bool intersectsLineSegment(const LineSegment &l) const;
        bool intersectsPolygon(const Polygon &p) const;
};

double randomDouble(mt19937 &gen);

double randomInRange(mt19937 &gen, double left, double right);

double randomInNormal(mt19937 &gen, double mean, double std);

int randomInDistribution(mt19937 &gen, vector<double> distribution);

void wrap(Vector &v, int width, int height, bool wrap_x = true, bool wrap_y = true);

vector<double> solveQuadratic(double a, double b, double c);