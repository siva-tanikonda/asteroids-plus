class AI {

    constructor() {
        this.controls = {
            left: false,
            right: false,
            forward: false,
            fire: false,
            teleport: false,
            start: false,
            pause: false
        };
    }

    //Just the update function for the ai
    update(delay) {
        
    }

    //Draws all debug info for the ai
    drawDebug() {
        
    }

    //Applies AI input choices to official game controls
    applyControls() {
        controls.left = this.controls.left;
        controls.right = this.controls.right;
        controls.forward = this.controls.forward;
        controls.fire = this.controls.fire;
        controls.teleport = this.controls.teleport;
        controls.start = this.controls.start;
        controls.pause = this.controls.pause;
    }

}