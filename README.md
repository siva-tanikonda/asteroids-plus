# Asteroids+
## How to Use
### Play Game/View AI
You can play the game for yourself and see the observe an AI trained by the algorithm at [siva-tanikonda.github.io/asteroids-plus](https://siva-tanikonda.github.io/asteroids-plus/).

*Note: The amount of asteroids on-screen scales with the resolution of the game window, so your results may vary from the training results. In addition, the game-speed variable doesn't change the rate at which the AI updates its decision, which is intentional and is another way of stress-testing the AI.*
### Using the Trainer
#### Install Packages
You need to install C++, SDL2, and the nlohmann JSON library
#### Run Trainer
* First, you should alter any parameters you want to in *asteroids-plus/Training/config.json*.
* Then, to run the trainer, execute the following command (in the *Training* directory):
  ```
  $ make train
  ```
* To monitor the progress of the training, use the window that has now popped-up.

## AI Strategy & Training Methodology
A complete overview of the project (including the AI strategy and training methodology) can be found in the Wiki: https://github.com/siva-tanikonda/asteroids-plus/wiki.

## Tools/Libraries Used
### SDL
This is a JavaScript runtime environment you can learn more about at [libsdl.org](https://www.libsdl.org/).
### nlohmann/json
This is a library to parse JSON in C++ [github.com/nlohmann/json](https://github.com/nlohmann/json/).
