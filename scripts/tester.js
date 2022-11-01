class Tester {

    constructor(iterations, console_updates = false) {
        this.iterations = iterations;
        this.running = false;
        this.remaining_iterations = 0;
        this.console_updates = console_updates;
        this.controls = {
            start: false
        };
        this.scores = [];
    }

    test() {
        this.running = true;
        this.remaining_iterations = this.iterations;
    }

    optimizationTest() {
        this.running = true;
        this.remaining_iterations = this.iterations;
        while (this.running)
            update(1);
    }

    calculateScoreStatistics() {
        var mean = 0;
        var min = Infinity;
        var max = -Infinity;
        for (var i = 0; i < this.scores.length; i++) {
            mean += this.scores[i];
            min = Math.min(min, this.scores[i]);
            max = Math.max(max, this.scores[i]);
        }
        mean /= this.scores.length;
        var std = 0;
        for (var i = 0; i < this.scores.length; i++)
            std += (this.scores[i] - mean) ** 2;
        std /= this.scores.length;
        std = Math.sqrt(std);
        return [ mean, std, min, max ];
    }

    update() {
        if (!this.running) return;
        this.start = false;
        if (game.title_screen)
            this.controls.start = true;
        if (game.ship.lives <= 0) {
            if (this.console_updates)
                console.log("TEST COMPLETE: " + game.score);
            this.scores.push(game.score);
            this.remaining_iterations--;
            if (this.remaining_iterations <= 0) {
                var calculations = this.calculateScoreStatistics();
                if (this.console_updates)
                    console.log("BATCH COMPLETE:\n" + calculations[0] + " (mean)\n" + calculations[1] + " (std)\n" + calculations[2] + " (min)\n" + calculations[3] + " (max)");
                this.running = false;
                return calculations;
            }
            this.controls.start = true;
        }
    }

}