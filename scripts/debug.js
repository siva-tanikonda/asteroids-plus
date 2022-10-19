class Debug {
    static drawBounds(item) {
        ctx.fillStyle = 'rgb(200, 100, 100)';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(item.bounds.points[item.bounds.points.length - 1].x, item.bounds.points[item.bounds.points.length - 1].y);
        for (var i = 0; i < item.bounds.points.length; i++)
            ctx.lineTo(item.bounds.points[i].x, item.bounds.points[i].y);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    static drawPosition(item) {
        ctx.fillStyle = "rgb(125, 250, 125)";
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(item.position.x, item.position.y, 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    static drawVelocity(item) {
        var angle = item.velocity.angle();
        ctx.translate(item.position.x, item.position.y);
        ctx.rotate(angle);
        ctx.translate(-item.position.x, -item.position.y);
        var scale_velocity = item.velocity.mag() * 10;
        ctx.strokeStyle = "rgb(250, 250, 100)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(item.position.x, item.position.y);
        ctx.lineTo(item.position.x + scale_velocity, item.position.y);
        ctx.lineTo(item.position.x + scale_velocity - 5, item.position.y - 5);
        ctx.moveTo(item.position.x + scale_velocity, item.position.y);
        ctx.lineTo(item.position.x + scale_velocity - 5, item.position.y + 5);
        ctx.stroke();
        ctx.resetTransform();
    }
    
    static drawAcceleration(item) {
        if (!item.accelerating) return;
        ctx.translate(item.position.x, item.position.y);
        ctx.rotate(-item.angle);
        ctx.translate(-item.position.x, -item.position.y);
        var scale_acceleration = item.acceleration * 250;
        ctx.strokeStyle = "rgb(125, 150, 250)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(item.position.x, item.position.y);
        ctx.lineTo(item.position.x + scale_acceleration, item.position.y);
        ctx.lineTo(item.position.x + scale_acceleration - 5, item.position.y - 5);
        ctx.moveTo(item.position.x + scale_acceleration, item.position.y);
        ctx.lineTo(item.position.x + scale_acceleration - 5, item.position.y + 5);
        ctx.stroke();
        ctx.resetTransform();
    }

    static drawDangerLevel() {
        
    }
}