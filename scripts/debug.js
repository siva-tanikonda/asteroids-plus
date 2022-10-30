class Debug {

    //Draws the bounds/hitbox of an entity
    static drawBounds(item) {
        ctx.fillStyle = 'rgb(200, 100, 100)';
        ctx.globalAlpha = 0.5;
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
        ctx.lineWidth = 2;
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
        ctx.lineWidth = 2;
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

    //Draws danger level of an object
    static drawDangerLevel(item) {
        var danger = ai.calculateDangerLevel(game.ship, item).toFixed(2).toString();
        var textSize = ctx.measureText(danger);
        ctx.font = "15px Rubik Regular";
        ctx.fillStyle = "rgb(230, 140, 250)";
        ctx.globalAlpha = 0.75;
        ctx.fillText(danger, item.position.x - textSize.width / 2, item.position.y - 5);
        ctx.globalAlpha = 1.0;
    }

    //Draws the danger radius of an object
    static drawDangerRadius(item) {
        var radius = 0;
        if (item.hasOwnProperty("size"))
            radius = ai_constants.danger_radius[item.size];
        ctx.strokeStyle = "rgb(230, 140, 250)";
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(item.position.x, item.position.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    //Draws the targeting radius of an object
    static drawTargetRadius(item) {
        var radius = 0;
        if (item.hasOwnProperty("size"))
            radius = ai_constants.target_radius[item.size];
        ctx.strokeStyle = "rgb(250, 175, 60)";
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(item.position.x, item.position.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

}