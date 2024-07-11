.PHONY: play
play: Build/main
	Build/main --play

.PHONY: ai
ai: Build/main
	Build/main --ai

.PHONY: clean
clean:
	rm -rf Build

Build/main: Build Build/math_helper.o Build/renderer.o Build/event_manager.o Build/game.o Build/ai.o Build/evaluation.o Build/main.o
	g++-14 Build/math_helper.o Build/renderer.o Build/event_manager.o Build/game.o Build/ai.o Build/evaluation.o Build/main.o -O3 -w -lSDL2main -lSDL2 -lSDL2_ttf -o Build/main

Build:
	mkdir Build

Build/main.o: main.cpp evaluation.h
	g++-14 -c main.cpp -O3 -w -o Build/main.o

Build/evaluation.o: evaluation.cpp evaluation.h ai.h
	g++-14 -c evaluation.cpp -O3 -w -o Build/evaluation.o

Build/ai.o: ai.cpp ai.h game.h
	g++-14 -c ai.cpp -O3 -w -o Build/ai.o

Build/game.o: game.cpp game.h renderer.h event_manager.h
	g++-14 -c game.cpp -O3 -w -o Build/game.o

Build/renderer.o: renderer.cpp renderer.h
	g++-14 -c renderer.cpp -O3 -w -o Build/renderer.o

Build/event_manager.o: event_manager.cpp event_manager.h
	g++-14 -c event_manager.cpp -O3 -w -o Build/event_manager.o

Build/math_helper.o: math_helper.cpp math_helper.h
	g++-14 -c math_helper.cpp -O3 -w -o Build/math_helper.o
