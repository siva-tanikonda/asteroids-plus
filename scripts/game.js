class Ship {

    constructor() {
        this.position = new Vector(canvas_bounds.width / 2, canvas_bounds.height / 2);
        this.width = 30;
        this.height = 16;
        this.rear_offset = 6;
        this.angle = 0;
    }

    update(left, right) {
        if (left) this.angle += Math.PI * 5 / 180;
        if (right) this.angle -= Math.PI * 5 / 180;
        while (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;
        while (this.angle < 0) this.angle += Math.PI * 2;
    }

    draw() {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1.5;
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(-this.angle);
        ctx.translate(-this.position.x, -this.position.y);
        ctx.beginPath();
        ctx.moveTo(this.position.x - this.width / 2, this.position.y - this.height / 2);
        ctx.lineTo(this.position.x + this.width / 2, this.position.y);
        ctx.moveTo(this.position.x - this.width / 2, this.position.y + this.height / 2);
        ctx.lineTo(this.position.x + this.width / 2, this.position.y);
        ctx.moveTo(this.position.x - this.width / 2 + this.rear_offset, this.position.y - this.height / 2 + (this.height / this.width) * this.rear_offset - 1);
        ctx.lineTo(this.position.x - this.width / 2 + this.rear_offset, this.position.y + this.height / 2 - (this.height / this.width) * this.rear_offset + 1);
        ctx.stroke();
        ctx.resetTransform();
    }

}

class Game {
    
    constructor () {
        this.ship = new Ship();
    }

    update(left, right, forward) {
        this.ship.update(left, right, forward);
    }

    draw() {
        this.ship.draw();
    }

}