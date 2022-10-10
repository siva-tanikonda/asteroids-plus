class UserInput {
    constructor() {
        this.left = this.right = this.forward = false;
        document.body.onkeydown = (evt) => {
            if (evt.key == "a" || evt.key == "ArrowLeft")
                this.left = true;
            if (evt.key == "d" || evt.key == "ArrowRight")
                this.right = true;
            if (evt.key == "w" || evt.key == "Space")
                this.forward = true;
        };
        document.body.onkeyup = (evt) => {
            if (evt.key == "a" || evt.key == "ArrowLeft")
                this.left = false;
            if (evt.key == "d" || evt.key == "ArrowRight")
                this.right = false;
            if (evt.key == "w" || evt.key == "Space")
                this.forward = false;
        };
    }
}