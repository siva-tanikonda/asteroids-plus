SHELL=cmd

all: Build/trainer.exe
	Build/trainer.exe

Build:
	mkdir Build

Build/event_manager.o: event_manager.h event_manager.cpp
	g++ -c event_manager.cpp -O2 -o Build/event_manager.o

Build/math.o: math.h math.cpp
	g++ -c math.cpp -O2 -o Build/math.o

Build/game.o: game.h game.cpp
	g++ -c game.cpp -O2 -o Build/game.o

Build/ai.o: ai.h ai.cpp
	g++ -c ai.cpp -O2 -o Build/ai.o

Build/main.o: main.cpp
	g++ -c main.cpp -O2 -o Build/main.o

Build/trainer.exe: Build Build/event_manager.o Build/main.o Build/math.o Build/game.o Build/ai.o
	g++ Build/main.o Build/event_manager.o Build/math.o Build/game.o Build/ai.o -O2 -w -lmingw32 -ljsoncpp -lSDL2main -lSDL2 -lSDL2_gfx -lSDL2_ttf -o Build/trainer.exe

.PHONY: clean
clean:
	if exist Build del /f /s /q Build
	if exist Build rmdir /s /q Build
