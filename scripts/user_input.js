class UserInput {
    constructor() {
        this.left = this.right = this.forward = this.fire = this.teleport = this.start = false;
        document.body.onkeydown = (evt) => {
            if (evt.key == "a" || evt.key == "ArrowLeft")
                this.left = true;
            if (evt.key == "d" || evt.key == "ArrowRight")
                this.right = true;
            if (evt.key == "w" || evt.key == "ArrowUp")
                this.forward = true;
            if (evt.key == "s" || evt.key == "ArrowDown")
                this.teleport = true;
            if (evt.key == " ")
                this.fire = true;
            if (evt.key == "Enter")
                this.start = true;
        };
        document.body.onkeyup = (evt) => {
            if (evt.key == "a" || evt.key == "ArrowLeft")
                this.left = false;
            if (evt.key == "d" || evt.key == "ArrowRight")
                this.right = false;
            if (evt.key == "w" || evt.key == "ArrowUp")
                this.forward = false;
            if (evt.key == "s" || evt.key == "ArrowDown")
                this.teleport = false;
            if (evt.key == " ")
                this.fire = false;
            if (evt.key == "Enter")
                this.start = false;
        };
    }
}