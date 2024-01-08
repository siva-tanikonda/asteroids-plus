# Asteroids AI
## How to Use
### Play Game/View AI
You can play the game for yourself and see the observe an AI trained by the algorithm at [siva-tanikonda.github.io/asteroids-ai](https://siva-tanikonda.github.io/asteroids-ai/)

*Note: The amount of asteroids on-screen scales with the resolution of the game window, so your results may vary from the training results. In addition, the game-speed variable doesn't change the rate at which the AI updates its decision, which is intentional and is another way of stress-testing the AI.*
### Using the Trainer
#### Dependencies
* **Node.js** - This is a JavaScript runtime environment that you can install at [nodejs.org](https://nodejs.org/)
* **seedrandom** - This is an NPM package for a seeded random number generator. You can install it with:
  ```
  $ cd /INSERT_PROJECTS_DIRECTORY_HERE/asteroids-ai/Training
  $ npm install seedrandom
  ```
  *You can only install seedrandom after installing Node.js*
* **Socket.io** - This is a WebSockets library that you can learn about at [socket.io](https://socket.io/). You can install it with:
  ```
  $ cd /INSERT_PROJECTS_DIRECTORY_HERE/asteroids-ai/Training
  $ npm install socket.io
  ```
  *You can only install socket.io after installing Node.js*
#### Trainer
* First, you should alter any parameters you want to in *asteroids-ai/Training/trainer.js*
* Then, to run the trainer, execute the following command (in the *Training* directory):
  ```
  $ node trainer.js
  ```
* To monitor the progress of the training, go to [localhost:2000](http://localhost:2000) in your browser
#### Evaluator
* First, you should alter any parameters in *asteroids-ai/Training/evaluator.js*
* Then, to run the evaluator, execute the following command (in the *Training* directory)
  ```
  $ node evaluator.js
  ```

## AI Strategy & Training Methodology
A complete overview of the project (including the AI strategy and training methodology) can be found in the Wiki: https://github.com/siva-tanikonda/asteroids-ai/wiki
