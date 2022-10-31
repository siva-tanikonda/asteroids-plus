class Debug {

    //Draws the bounds/hitbox of an entity
    static drawBounds(item) {
        ctx.fillStyle = 'rgb(200, 100, 100)';
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(item.bounds.points[item.bounds.points.length - 1].x, item.bounds.points[item.bounds.points.length - 1].y);
        for (var i = 0; i < item.bounds.points.length; i++)
            ctx.lineTo(item.bounds.points[i].x, item.bounds.points[i].y);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
    
    //Draws the position of an entity
    static drawPosition(item) {
        ctx.fillStyle = "rgb(125, 250, 125)";
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(item.position.x, item.position.y, 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
    
    //Draws the velocity of an entity
    static drawVelocity(item) {
        var angle = item.velocity.angle();
        ctx.translate(item.position.x, item.position.y);
        ctx.rotate(angle);
        ctx.translate(-item.position.x, -item.position.y);
        var scale_velocity = item.velocity.mag() * 10;
        ctx.strokeStyle = "rgb(250, 250, 100)";
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(item.position.x, item.position.y);
        ctx.lineTo(item.position.x + scale_velocity, item.position.y);
        ctx.lineTo(item.position.x + scale_velocity - 5, item.position.y - 5);
        ctx.moveTo(item.position.x + scale_velocity, item.position.y);
        ctx.lineTo(item.position.x + scale_velocity - 5, item.position.y + 5);
        ctx.stroke();
        ctx.resetTransform();
        ctx.globalAlpha = 1.0;
    }
    
    //Draws the velocity of an entity
    static drawAcceleration(item) {
        if (!item.accelerating) return;
        ctx.translate(item.position.x, item.position.y);
        ctx.rotate(-item.angle);
        ctx.translate(-item.position.x, -item.position.y);
        var scale_acceleration = item.acceleration * 250;
        ctx.strokeStyle = "rgb(125, 150, 250)";
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(item.position.x, item.position.y);
        ctx.lineTo(item.position.x + scale_acceleration, item.position.y);
        ctx.lineTo(item.position.x + scale_acceleration - 5, item.position.y - 5);
        ctx.moveTo(item.position.x + scale_acceleration, item.position.y);
        ctx.lineTo(item.position.x + scale_acceleration - 5, item.position.y + 5);
        ctx.stroke();
        ctx.resetTransform();
        ctx.globalAlpha = 1.0;
    }

    //Draws the danger of an entity
    static drawDangerLevel(item) {
        if (item.hasOwnProperty("lives")) return;
        ctx.font = "12px Roboto Mono Bold"
        ctx.fillStyle = "rgb(210, 140, 240)";
        var danger = +ai.calculateDangerLevel(item).toFixed(2);
        var size = ctx.measureText(danger);
        ctx.fillText(danger, item.position.x - size.width / 2, item.position.y - 10);
    }

    //Draws the danger radius of an entity
    static drawDangerRadius(item) {
        if (!item.hasOwnProperty("size")) return;
        ctx.strokeStyle = "rgb(210, 140, 240)";
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(item.position.x, item.position.y, ai_constants.danger_radius[item.size], 0, 2 * Math.PI);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    static drawDangerFlee(item) {
        if (!item.hasOwnProperty("lives") || game.title_screen || game.paused || game.ship.lives <= 0) return;
        ctx.strokeStyle = "rgb(210, 140, 240)";
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5;
        ctx.translate(item.position.x, item.position.y);
        ctx.rotate(-item.angle);
        ctx.translate(-item.position.x, -item.position.y);
        for (var i = 0; i < 4; i++) {
            var scale_flee = ai.flee_values[i] * 75;
            ctx.beginPath();
            ctx.moveTo(item.position.x, item.position.y);
            ctx.lineTo(item.position.x + scale_flee, item.position.y);
            ctx.lineTo(item.position.x + scale_flee - 5, item.position.y - 5);
            ctx.moveTo(item.position.x + scale_flee, item.position.y);
            ctx.lineTo(item.position.x + scale_flee - 5, item.position.y + 5);
            ctx.stroke();
            ctx.translate(item.position.x, item.position.y);
            ctx.rotate(-Math.PI / 2);
            ctx.translate(-item.position.x, -item.position.y);
        }
        ctx.translate(item.position.x, item.position.y);
        ctx.rotate(item.angle);
        ctx.translate(-item.position.x, -item.position.y);
        ctx.globalAlpha = 1.0;
    }

    //Draws the target radius of an entity
    static drawTargetRadius(item) {
        if (!item.hasOwnProperty("size")) return;
        ctx.strokeStyle = "rgb(250, 140, 75)";
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(item.position.x, item.position.y, ai_constants.target_radius[item.size], 0, 2 * Math.PI);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    //Draws the minimum fire range of the ship
    static drawTargetMinDistance(item) {
        if (!item.hasOwnProperty("lives") || game.title_screen || item.lives <= 0) return;
        ctx.fillStyle = "rgb(250, 140, 75)";
        ctx.globalAlpha = 0.1;
        ctx.beginPath();
        ctx.arc(item.position.x, item.position.y, ai_constants.target_min_distance, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

}