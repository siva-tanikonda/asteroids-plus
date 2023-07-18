class Debug {

    //Draws the bounds/hitbox of an entity
    static drawBounds(item) {
        ctx.fillStyle = "rgb(200, 100, 100)";
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(item.bounds.points[item.bounds.points.length - 1].x, item.bounds.points[item.bounds.points.length - 1].y);
        for (let i = 0; i < item.bounds.points.length; i++)
            ctx.lineTo(item.bounds.points[i].x, item.bounds.points[i].y);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
    
    //Draws the position of an entity
    static drawPosition(item) {
        ctx.fillStyle = "rgb(125, 250, 125)";
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(item.position.x, item.position.y, 2.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
    
    //Draws the velocity of an entity
    static drawVelocity(item) {
        const angle = item.velocity.angle();
        ctx.translate(item.position.x, item.position.y);
        ctx.rotate(angle);
        ctx.translate(-item.position.x, -item.position.y);
        const scale_velocity = item.velocity.mag() * 10;
        ctx.strokeStyle = "rgb(250, 250, 100)";
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.75;
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
        const scale_acceleration = item.acceleration * 10;
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

    //Draws the game data on the overlay
    static drawGameData(game) {
        ctx.font = "14px Roboto Mono Bold";
        ctx.fillStyle = "rgb(242, 86, 75)";
        const wave_text = "Wave: " + game.wave.toFixed(2);
        const wave_size = ctx.measureText(wave_text);
        ctx.fillText(wave_text, canvas_bounds.width - wave_size.width - 10, 20);
        const saucer_text = "Saucer Count: " + game.saucers.length;
        const saucer_size = ctx.measureText(saucer_text);
        ctx.fillText(saucer_text, canvas_bounds.width - saucer_size.width - 10, 40);
        const asteroid_counts = [ 0, 0, 0 ];
        for (let i = 0; i < game.asteroids.length; i++)
            asteroid_counts[game.asteroids[i].size]++;
        let asteroid_text = "Large Asteroid Count: " + asteroid_counts[2];
        let asteroid_size = ctx.measureText(asteroid_text);
        ctx.fillText(asteroid_text, canvas_bounds.width - asteroid_size.width - 10, 60);
        asteroid_text = "Medium Asteroid Count: " + asteroid_counts[1];
        asteroid_size = ctx.measureText(asteroid_text);
        ctx.fillText(asteroid_text, canvas_bounds.width - asteroid_size.width - 10, 80);
        asteroid_text = "Small Asteroid Count: " + asteroid_counts[0];
        asteroid_size = ctx.measureText(asteroid_text);
        ctx.fillText(asteroid_text, canvas_bounds.width - asteroid_size.width - 10, 100);
        const fps_text = "FPS: " + fps.toFixed(2);
        const fps_size = ctx.measureText(fps_text);
        ctx.fillText(fps_text, canvas_bounds.width - fps_size.width - 10, 120);
    }

}