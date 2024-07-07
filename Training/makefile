SHELL=cmd

.PHONY: test
test: Build/trainer.exe
	Build/trainer.exe --test

.PHONY: train
train: Build/trainer.exe
	Build/trainer.exe --train

Build:
	mkdir Build

Build/event_manager.o: event_manager.h event_manager.cpp
	g++ -c event_manager.cpp -O3 -w -o Build/event_manager.o

Build/math.o: math.h math.cpp
	g++ -c math.cpp -O3 -w -o Build/math.o

Build/game.o: game.h game.cpp
	g++ -c game.cpp -O3 -w -o Build/game.o

Build/ai.o: ai.h ai.cpp
	g++ -c ai.cpp -O3 -w -o Build/ai.o

Build/main.o: main.cpp
	g++ -c main.cpp -O3 -w -o Build/main.o

Build/trainer.exe: Build Build/event_manager.o Build/math.o Build/game.o Build/ai.o Build/main.o
	g++ Build/event_manager.o Build/math.o Build/game.o Build/ai.o Build/main.o -O3 -w -lmingw32 -lSDL2main -lSDL2 -lSDL2_gfx -lSDL2_ttf -ljsoncpp -o Build/trainer.exe

.PHONY: clean
clean:
	if exist Build del /f /s /q Build
	if exist Build rmdir /s /q Build
