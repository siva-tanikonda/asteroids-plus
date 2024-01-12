# Asteroids AI
## How to Use
### Play Game/View AI
You can play the game for yourself and see the observe an AI trained by the algorithm at [siva-tanikonda.github.io/asteroids-ai](https://siva-tanikonda.github.io/asteroids-ai/)

*Note: The amount of asteroids on-screen scales with the resolution of the game window, so your results may vary from the training results. In addition, the game-speed variable doesn't change the rate at which the AI updates its decision, which is intentional and is another way of stress-testing the AI.*
### Using the Trainer
#### Install Node.js
You can install this at [nodejs.org](https://nodejs.org/)
#### Install NPM Packages
To install the packages necessary for the trainer, run:
```
$ npm install
```
*You need to install Node.js first and make sure to execute this command in the project directory*
#### Run Trainer
* First, you should alter any parameters you want to in *asteroids-ai/Training/trainer.js*
* Then, to run the trainer, execute the following command (in the *Training* directory):
  ```
  $ node trainer.js
  ```
* To monitor the progress of the training, go to [localhost:2000](http://localhost:2000) in your browser
#### Run Evaluator
* First, you should alter any parameters in *asteroids-ai/Training/evaluator.js*
* Then, to run the evaluator, execute the following command (in the *Training* directory)
  ```
  $ node evaluator.js
  ```

## AI Strategy & Training Methodology
A complete overview of the project (including the AI strategy and training methodology) can be found in the Wiki: https://github.com/siva-tanikonda/asteroids-ai/wiki