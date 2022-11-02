Asteroids AI
========

This program is an implementation of asteroids and an AI that can play the game. You can find the application here: http://siva-tanikonda.github.io/asteroids-ai
\
\
The AI is a heuristic that looks at each of the following:
- All asteroids, saucers, and saucer bullets (including their velocities, positions, hitboxes, etc.)
- All aspects of the player ship (velocity, position, angle, etc.)

Strategy:
--------
```
for each iteration of the AI:
  calculate the danger level of each danger on the screen
  if one of the danger levels is >=0.5:
    take action to flee the danger
  else:
    aim towards the most dangerous target
  decide if we should fire or not, and if we want to, then fire
```

Danger Calculation:
--------
This is an outline of the calculation used to determine the danger of each danger on the first line of the code:\
\
**Formula**\
$D_i=2\sigma(\frac{C_1}{|\vec{r}|^2}+C_2|\text{proj}(-\vec{r},\vec{v}_s)|+C_3|\text{proj}(\vec{r},\vec{v}_i)|)+1$\
$\sigma(x)$ represents the sigmoid function, which is $\sigma(x)=\frac{1}{1+e^{-x}}$\
$\text{proj}(\vec{u},\vec{v})$ is the projection of $\vec{v}$ onto $\vec{u}$\
\
**Variables/Constants**\
$C_1,C_2,C_3$ are constants that are used in this heuristic\
$D_i$ is the danger of the $i$-th danger\
$\vec{v}_i$ is the velocity of the $i$-th danger\
$\vec{v}_s$ is the velocity of the player ship\
$\vec{r}_i$ is the position of the $i$-th danger\
$\vec{r}_s$ is the position of the player ship\
$s_i$ is the radius of the $i$-th danger\
$\vec{r}_i=\vec{r}_s-\vec{r}_i-s_i$ (so $\vec{r}$ is the vector from the ship to the edge of the $i$-th danger)

Flee System:
---------
This system includes the following steps:
```
calculate the directional pushes in 4 directions (forward, reverse, left, right)
We move forward, left, or right based on the directional pushes
```

**Push Calculation**\
For each danger $i$, its push is simly $\vec{p}_i=D_i(\frac{\vec{r}}{|\vec{r}|})$ ( $\vec{r}$ is defined in the danger calculation). We then get the dot product of $\vec{p}_i$ with the four directions of movement on the ship and add up each side. We are now left with $f$, $r$, $l$, and $r$, which represent the need to go in each respective direction (forward, rear, left, and right).\
\
**Movement**\
If any of $f$, $l$, or $r$ are $\geq 0.5$, then you will either go forward, left, or right, respectively. If $r\geq 0.5$, then you turn left or right, depending on which side has the most pressure.

Aim System
--------
The steps to aiming includes the following:
```
pick the most dangerous target on the screen
for each possible angle we can go to:
  calculate how long it would take to destroy this target
  see if turning this way allows us to destroy the target the quickest
depending on which direction we chose to turn (no turn, left, or right), turn that direction
```
\
**Calculating Destroying Time**\
We know that if we launch a bullet, we can use the following system to calculate the collision time $t$ of a bullet $b$ and danger $d$:\
$\vec r_d=\vec r_{d,0}+\vec v_dt$\
$\vec r_s=\vec r_{s,0}+\vec v_st$\
$s_d=\sqrt {|\vec r_d - \vec r_s|}$\
\
Constants:\
$\vec r_d$ and $\vec r_s$ are the positions of danger and ship, respectively after time $t$.\
$\vec r_{d,0}$ and $\vec r_{s,0}$ are the initial positions of the danger and the ship, respectively.\
$\vec v_d$ and $\vec v_s$ are the constant velocities of the danger and the ship, respectively.\
$s_d$ is the radius of the danger.\
\
We can solve for $t$ in the above system with the quadratic formula, and $t$ is the destroying time given a certain angle and position of the ship.\
\
**Calculating Fastest Destruction Time**\
We can calculate this by simply adding the amount of time it takes for the ship to rotate from its current angle to each possible angle and the destroying time (calculation outlined above).

Firing Choice System
--------
We can calculate whether or not to shoot with the following pseudocode:\
```
calculate which target we would hit if we fired with the ship at the current position and angle (can use the same formula in the aiming code)
see if this target is too close to shoot safely
if it is safe, then shoot
```
