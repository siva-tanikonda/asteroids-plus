# Asteroids AI
## How to Use
### Play Game/View AI
You can play the game for yourself or see the AI in action at https://siva-tanikonda.github.io/asteroids-ai/
### Using the Trainer
#### Dependencies
* **Node.js** - This is a JavaScript runtime environment that you can install at https://nodejs.org/
* **seedrandom** - This is an NPM package for a seeded random number generator. You can install it with:
  ```
  $ cd /INSERT_PROJECTS_DIRECTORY_HERE/asteroids-ai/Training
  $ npm install seedrandom
  ```
  *You have to install seedrandom after installing Node.js*
#### Trainer
* First, you should alter any parameters in *asteroids-ai/Training/trainer.js*
* Then, to run the trainer, execute the following command (in the *Training* directory)
  ```
  $ node trainer.js
  ```
* To view the results of the training, you can look through the training history in the *Training/Saves* directory
#### Evaluator
* First, you should alter any parameters in *asteroids-ai/Training/evaluator.js*
* Then, to run the evaluator, execute the following command (in the *Training* directory)
  ```
  $ node evaluator.js
  ```
## Project
### Game
#### Description
* The Player: The player is a triangular spaceship with a limited number of lives and the following controls:
  * A or Left Arrow - Turn Left
  * D or Right Arrow - Turn Right
  * W or Up Arrow - Accelerate
  * SpaceBar - Shoot a bullet
  * S or Down Arrow - Teleport (AI doesn't have access to this ability, as it is too unpredictable)
* Objective: Destroy as many asteroids as possible before running out of lives
* Dangers:
  * Asteroids: If the player gets hit by an asteroid they lose a life
  * Saucers: At any moment in the game, there can be at most one enemy saucer that can shoot bullets at the player and collide with the palyer (both which will make the player lose a life)
    * The saucer also sometimes changes directions
  * Wave Progression: You start the game at wave 1, but every time you destroy all the asteroids on the screen, the wave increases by 1, and this causes the following changes:
    * More asteroids appear on the screen
    * All dangers move faster
    * Saucers change directions faster, shoot faster, and the saucer bullets are faster
* Extra:
  * At every 10,000 points, the player gets an extra life
#### Challenges for AI
* Acceleration: The player accelerates very quickly, and there are no breaks on the ship
* Rotation Speed: The player ship rotation speed is not fast
* Obstacles: Obstacles on the screen move at a constant velocity (with the saucers sometimes changing directions) and require maneuverability to escape
* Saucer: This entity is likely the most dangerous danger on the screen, as it can change directions and shoots bullets directly at the player
### Strategy