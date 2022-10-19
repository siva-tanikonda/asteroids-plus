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

    update(ship, saucers, saucer_bullets, asteroids, delay) {
        
    }

}

/*
Steering:
- Comes in three phases:
    - Observation
    - Ideal Velocity
    - Steer Towards Ideal Velocity
- Observation
    - Each asteroid will have a circular no-zone depending on:
        - Size of the asteroid
        - Velocity of the asteroid
            - Also take into account how close to the ship the path is
    - Saucer
        - Size of the saucer
        - Velocity of the saucer
            - Also take into account how close to the ship the path is
            - Take into account the chance that the saucer moves
    - Saucer bullets
        - Velocity of the bullet
            - Take into account how close to the ship the path is
            - Take into account the life of the bullet
    - Current Ship Velocity
- Ideal Velocity
    - This is merely just a calculation
    - Stuff to care about
        - Every hazard has a vector away from it towards the player, and its magnitude signifies the level of danger
        - The current velocity of the ship
    - Tip: keep the velocity low by default
    - Add all velocity changers together along with current velocity
- Steering
    - Stop accelerating if target velocity is lower than current velocity
    - Just rotate the ship if needed
    - Slowly accelerate to implement an acceleration change

Shooting:
- We can easily calculate the aim with a mathematical formula (it will essentially be 100% correct)
- We include the distance and size of the incoming asteroid when choosing whether or not to shoot
- Shoot saucers on sight

Teleport:
- Calculate the change in velocity needed to overcome an asteroid
- See if there is no good approach angle (look at the deviations and see how many cancel)
- Teleport as a last resort
*/