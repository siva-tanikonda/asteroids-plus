var ai_constants = {
    
};

class AI {

    constructor() {
        this.controls = {
            left: false,
            right: false,
            forward: false,
            teleport: false,
            fire: false
        };
    }

    update(delay) {
        this.controls.left = this.controls.right = this.controls.forward = this.controls.teleport = this.controls.fire = false;

    }

    drawDebug(game) {
        
    }

}