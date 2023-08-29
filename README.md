# Asteroids AI
## How to Use
### Play Game/View AI
You can play the game for yourself and see the AI in action at https://siva-tanikonda.github.io/asteroids-ai/

*Note: The amount of asteroids on-screen scales with the resolution of the game window, so your results may vary from the training results. In addition, the game-speed variable doesn't change the rate at which the AI updates its decision, which is intentional and another way of stress-testing the AI.*
### Using the Trainer
#### Dependencies
* **Node.js** - This is a JavaScript runtime environment that you can install at https://nodejs.org/
* **seedrandom** - This is an NPM package for a seeded random number generator. You can install it with:
  ```
  $ cd /INSERT_PROJECTS_DIRECTORY_HERE/asteroids-ai/Training
  $ npm install seedrandom
  ```
  *You can only install seedrandom after installing Node.js*
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
## Game
### Description
This game is meant to be a remake of the old Atari arcade game "Asteroids" with a few changes/improvements (a different level progression system, different entity movement/shooting parameters, polygon-perfect collision, and dynamic resolution)
* The Player: The player is a triangular spaceship with a limited number of lives and the following controls:
  * A or Left Arrow - Turn Left
  * D or Right Arrow - Turn Right
  * W or Up Arrow - Accelerate
  * SpaceBar - Shoot a bullet
  * S or Down Arrow - Teleport (AI doesn't have access to this ability, as it is too unpredictable)
  * Escape - Pause (AI doesn't have access to this ability)
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
### Challenges for AI
* Acceleration: The player accelerates very quickly, and there are no breaks on the ship
* Rotation Speed: The player ship rotation speed is not fast
* Obstacles: Obstacles on the screen move at a constant velocity (with the saucers sometimes changing directions) and require maneuverability to escape
* Saucer: This entity is likely the most dangerous danger on the screen, as it can change directions and shoots bullets directly at the player
* Wrapping: The objects in this game (including the player) wrap around the screen when going out-of-bounds
## Strategy
The AI is a heuristic that relies on 30 constants that are trained by a genetic algorithm.  

*Note: All distances calculated are based on the shortest distance among all possible wraps*
### Danger Calculation
This is the backbone of the AI, and it gives each danger (asteroid, saucer, or saucer bullet) a non-negative "danger value" that takes into account the following (we will define $\vec{r}$ as the vector from the player ship to the danger):
* Distance between danger and player 
* Projection of the danger velocity onto $\vec{r}$
* Projection of the player velocity onto $-\vec{r}$
* Projection of the player ship angle onto $-\vec{r}$

*To see the specifics of this calculations, go to lines 140-171 of the Scripts/ai.js file*
### Fleeing
If there is an object on the screen with danger value $\geq 1$, then we do the following actions:
#### Flee Values
We first calculate the flee values, which are vectors to the left, right, front, and back of the current direction of our ship that tell us how much we "need" to move in certain directions. To start, we first calculate a "directional danger" for each danger (this is just $\text{danger level}\times(-\vec{r})$). Then, we add this vector (multiplied and exponentiated by some constants) to scalars that represent how much danger is in each direction relative to the player. The behaviors covered are the following:
* If there is a danger to the sides, then turn the opposite direction
* If there is a danger from the back, then accelerate
* If there is a danger coming-up ahead, don't accelerate
#### Nudge Values
While the above will allow us to move left, move right, and accelerate in a useful way, there are some maneuvers we cannot program into the above system (ex. moving forward may be more advantageous instead of turning to the left when we have a danger coming in from the right). These will be distinguished from the flee-values because if we are told to move forward as a result of a nudge, it doesn't necessarily mean that there is a danger behind the player. The behaviors covered are the following:
* If there is a danger ahead, turn either to the left or the right
* If there is a danger from the back, turn either to the left or the right
* If there is a danger from the left or right, accelerate
#### Action
The decisions will be as follows:
* If the flee-left value + the nudge-left value is $\geq 1$ and the flee-right value is $<1$, then turn left
* If the flee-right value + the nudge-right value is $\geq 1$ and the flee-left value is $<1$, then turn left
* If the flee-forward value + the nudge-forward value is $\geq 1$ and the flee-back value is $<1$, then accelerate

*To see the specifics of the fleeing process, look at lines 197-227 of Scripts/ai.js for the flee-value calculation and look at lines 229-248 for the action itself*
### Aiming
If the largest danger has a danger-value $<1$, then the AI calculates the target (saucer or asteroid) that will require the minimum amount of rotation to destroy, and "marks" it for destruction, and the AI will turn towards that object until it is destroyed or out-of-range

*To see the specifics of this process, you can look to lines 410-474 of Scripts/ai.js*

### Firing
This part of the AI is not dependent on any constants, and we assume all targets are circular (as it is too computationally intesive for the AI to perform polygon-perfect collision). Whether we are fleeing or aiming, we still take the following actions to decide if we should shoot a target or not:
* Look at the first object we should hit if we shoot right now (and if we can't hit anything, then do nothing)
  * Check if attempting to shoot this object could inadvertently destroy another asteroid we didn't want to destroy
  * If we have shot an entity marked by aim, then unmark that target so we can pick a different target to aim later
* If we found a target that we can hit, then press the shoot button

*Note: We will assume targets move at a constant velocity (which is technically true, except for the fact that saucers sometimes change directions) and that targets are circular, so checking collisions is a simple use of the quadratic formula.*

*To find the quadratic formula part of the collision, you can look to lines 250-268 of Scripts/ai.js. To find the code to check if a bullet will hit a target, you can look to lines 314-336. To find the collateral damage code, you can look to lines 338-345. And, to find the general shooting logic code, look to lines 365-392.*
### Optimizations
#### Targeting Radius
There is a constant that states that we shouldn't shoot a medium-large asteroid if it will be destroyed close to our current position, because the splitting of the asteroid is unpredictable, and it is possible that the splitting will destroy our ship.  

*This is a small addition on line 331 of Scripts/ai.js*
#### Clutter Management
If many asteroids are on the screen, it naturally makes it harder for the AI to take evasive maneuvers, so there are two constants that will establish a limit on the number of asteroids we want on the screen at any given time, and the AI won't shoot an asteroid if the asteroid will split and violate this limit.

*This is a small function on lines 347-363 of Scripts/ai.js*
#### Saucer Evasion
This is a singular constant that says that the ship should move at a certain velocity at all times when a saucer is on the screen, and this is meant to exploit the fact that the saucer shoots in a direct line to the player's current position and that the bullet is very small.

*This is a small conditional statement on lines 416-417 of Scripts/ai.js*
## Genetic Algorithm
We have 30 constants to optimize with the above strategy, which is relatively low, meaning we can use a [genetic algorithm](https://en.wikipedia.org/wiki/Genetic_algorithm) to train the AI.
### Algorithm Setup
Important variables for the AI to function include the following:
- Constant Parameters: What values can the constants take, what are the default values for the constants, what are the separation points of different genes (which are just adjacent sets of constants)
- Thread Count: This algorithm is multithreaded, so define the number of threads to use in the algorithm
- Generation Size: What is the size of each generation of the algorithm?
- Carry-Over Count: What is the maximum number of best individuals we want to carry-over to the new generation of the algorithm
- Inclusion Threshold: What is the minimum STD above the mean do we want an individual to be to carry them over
- Inclusion Limit: What is the maximum STD we want an individual to dominate in the selection function?
- Mutation Rate: What is the rate at which we want the population to mutate
- Game Parameters: How many lives, how many FPS should we get in the game, what wave should we start in, what resolution should the game be?

*You can find the training parameters in lines 7-121 of Training/trainer.js and the parameters for each game in lines 11-31 of Training/tester.js.*

### Training Loop
The training loop is as follows:  
```
Create the first generation of individuals (with random/default values for the constants)
If we haven't reached our training goals:
  Test the current generation (calculate the fitness of each indvidual)
  Analyze the statistics of the results of the generation
  Select/create the new generation of individuals
```
*You can find the training loop on lines 432-491 of the Training/trainer.js file and the code for the creation of the random generation from lines 164-220.*
### Fitness Function
The fitness can be calculated from 3 separate variables:
- Score: The score achieved until the individual dies
- Time: The amount of time the individual survives
- Flee Time: The amount of time the individual spends fleeing
### Selection Function
The selection function goes through the following steps:
```
Create a blank list to store the next generation
Standardize all of the fitness scores
Sort the individuals by decreasing fitness scores
Carry-over individuals who pass the inclusion threshold up to a limit of the carry-over count
Calculate the partition_value of each individual with standardized fitness >= inclusion_threshold
Create the sampling distribution and include individuals who pass the inclusion_threshold
Create new entities by utilizing crossover
return the new generation
```
#### Partition Values
First, for each individual (who passes the inclusion threshold, otherwise, their partition value is $0$), we get their partition-value as such:
$$\text{partition value}=[\text{partition exponentiator}]^{\min(\text{fitness std}, \text{inclusion limit})}$$
We then create a probability distribution by assigning the following:
$$\mathbb{P}(\text{Selecting Individual }i)=\frac{\text{partition value of }i}{\sum_{j\in\text{all individuals}}\text{partition value of }j}$$
*Note: This is often referred-to as [Roulette-Wheel Selection](https://www.sciencedirect.com/topics/computer-science/wheel-selection)*
#### Crossover
The process of crossover is as such:
```
Pick 2 random individuals using the probability distribution created with the partition values
For each gene:
  Pick one of the two individuals' genes randomly using the partition values
  Copy over the gene
  Randomly check if we should mutate the gene:
    Mutate the gene by some random value
  Randomly check if we should do a shift mutation on the gene:
    Do a shift mutation on the gene by some random value
```
##### Gene Selection
We will pick either the first individual ($0$) or the second individual ($1$) according the following random variable:
$$X\sim\text{Bernoulli}(\frac{\text{partition value of individual }2}{\text{partition value of individual }1 + \text{partition value of individual 2}})$$

*Note: This is often referred-to as [Uniform Crossover](https://en.wikipedia.org/wiki/Crossover_(genetic_algorithm)#Uniform_crossover)*
##### Regular Mutation vs. Shift Mutation
The regular mutation does the following (where $C$ represents the vector of constants that characterize an individual):
$$C_i:=C_ie^X$$
$$X\sim\mathcal{N}(0,\text{mutation STD})$$
The shift mutation does the following (and is generally more rare):
$$C_i:=C_i+X(\text{maximum value of constant }i - \text{minimum value of constant }i)$$
$$X\sim\mathcal{N}(0, \text{shift STD})$$

*You can find the slection process on lines 284-384 of Training/trainer.js.*
### Optimizations
#### Mulithreading
This is utilized to achieve a large speed-up on the training, along with increased CPU utilization.

*Note: This is in fact the primary reason Node.js was used, as web JavaScript cannot achieve "true" multithreading.*

*Warning: This is very CPU-intensive depending on how many software threads you spin-up. This is governed by the thread count variable on line 98 of Training/trainer.js*
#### Dynamic Mutation
To prevent [premature convergence](https://en.wikipedia.org/wiki/Premature_convergence), the trainer will increase the mutation rate orand decrease it based on how wide the spread of the fitness scores of the previous generation is.

*This is governed by the variables on lines 118-119 of Training/trainer.js.*
#### Trial Halting
The trainer progresses to different seeds as we progress in generations. But, sometimes we may have the population perform exceptionally poorly in a specific generation, where this feature will force the next population to try the same seed again instead of progressing.

*This is governed by the variable on line 102 of Training/trainer.js.*
## Training & Results
### Training Progress
The game is run with the settings as described in the *Testing/tester.js* file
Here is how the training was carried-out (results and progress at each generation can be found in *Training/Saves/Save1*):
```
Phase 1 (Seed: 404): flee_weight = -1
                     trial_count = 1
                     generations = 85
Phase 2 (Seed: 2048): flee_weight = 0
                      trial_count = 1
                      generations = 65
Phase 3 (Seed: 7777): flee_weight = 0
                      trial_count = 3
                      generations = 10
```

*Note: All variables not included above are the same as the ones in Training/trainer.js and Training/tester.js. The reason for the flee_weight variable is because in earlier training attempts, the AI would prematurely converge to a strategy where it would keep spinning (this is viable early-game because the game starts-off easy). The seeds are just numbers I chose arbitrarily.*
### Results
The game is tested under the same tester conditions in the *Training/tester.js* file, but with 3 lives.  
The following results are produced by the individual characterized in *Training/Saves/Save1/best_fitness.json*:
```
Median Fitness - 7275
Mean Fitness - 7250
STD Fitness - 1937.0596273734063
Min Fitness - 3700
Max Fitness - 12600
```
*To find the code for the evaluator that calculated these results, look to Training/evaluator.js.*
### Conclusion
This AI performs quite well for just being a heuristic, and there are likely many improvements that can be made to both the training methodology and strategy. Please feel free to suggest improvements/features for the project if you have any.
