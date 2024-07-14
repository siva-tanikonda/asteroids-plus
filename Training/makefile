.PHONY: train
train: Build/main
	Build/main --train

.PHONY: play
play: Build/main
	Build/main --play

.PHONY: ai
ai: Build/main
	Build/main --ai

.PHONY: valgrind
valgrind: Build/main
	valgrind valgrind --leak-check=full --show-leak-kinds=all --track-origins=yes --verbose --log-file=Build/valgrind-out.txt Build/main --train

.PHONY: clean
clean:
	rm -rf Build

Build/main: Build Build/math_helper.o Build/renderer.o Build/event_manager.o Build/game.o Build/ai.o Build/evaluation_manager.o Build/evaluator.o Build/main.o
	g++ Build/math_helper.o Build/renderer.o Build/event_manager.o Build/game.o Build/ai.o Build/evaluation_manager.o Build/evaluator.o Build/main.o -O2 -w -lSDL2main -lSDL2 -lSDL2_ttf -o Build/main

Build:
	mkdir Build

Build/main.o: main.cpp Evaluator/evaluator.h
	g++ -c main.cpp -O2 -w -o Build/main.o

Build/evaluator.o: Evaluator/evaluator.cpp Evaluator/evaluator.h Shared/evaluation_manager.h
	g++ -c Evaluator/evaluator.cpp -O2 -w -o Build/evaluator.o

Build/evaluation_manager.o: Shared/evaluation_manager.cpp Shared/evaluation_manager.h Evaluator/ai.h
	g++ -c Shared/evaluation_manager.cpp -O2 -w -o Build/evaluation_manager.o

Build/ai.o: Evaluator/ai.cpp Evaluator/ai.h Evaluator/game.h
	g++ -c Evaluator/ai.cpp -O2 -w -o Build/ai.o

Build/game.o: Evaluator/game.cpp Evaluator/game.h Shared/renderer.h
	g++ -c Evaluator/game.cpp -O2 -w -o Build/game.o

Build/renderer.o: Shared/renderer.cpp Shared/renderer.h Shared/event_manager.h
	g++ -c Shared/renderer.cpp -O2 -w -o Build/renderer.o

Build/event_manager.o: Shared/event_manager.cpp Shared/event_manager.h
	g++ -c Shared/event_manager.cpp -O2 -w -o Build/event_manager.o

Build/math_helper.o: math_helper.cpp math_helper.h
	g++ -c math_helper.cpp -O2 -w -o Build/math_helper.o
