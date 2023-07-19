class AI {

    constructor(C) {
        //Control choices of the AI
        this.controls = {
            left: false,
            right: false,
            forward: false,
            fire: false
        };
        //These are constants (that are meant to be optimized through machine learning)
        this.C = C;
    }

    //AI makes decision and applies controls
    update() {

    }

    //AI draws debug info if it wants to
    drawDebug() {
        if (!settings.ai_settings.show_strategy) return;

    }

    //Applies the AI controls to the actual player
    applyControls() {
        controls.left = this.controls.left;
        controls.right = this.controls.right;
        controls.forward = this.controls.forward;
        controls.fire = this.controls.fire;
    }

}