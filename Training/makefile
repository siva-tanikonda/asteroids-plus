SHELL=cmd

.PHONY: play
play: Build/application.exe
	Build/application.exe --play

Build/application.exe: Build Build/main.o Build/renderer.o Build/renderer_helper.o Build/event_manager.o
	g++ Build/main.o Build/renderer.o Build/renderer_helper.o Build/event_manager.o -O3 -w -lmingw32 -lSDL2main -lSDL2 -lSDL2_ttf -ljsoncpp -o Build/application.exe

Build:
	mkdir Build

Build/main.o: main.cpp Renderer/renderer.h
	g++ -c main.cpp -O3 -w -o Build/main.o

Build/renderer.o: Renderer/renderer.cpp Renderer/renderer.h Renderer/renderer_helper.h
	g++ -c Renderer/renderer.cpp -O3 -w -o Build/renderer.o

Build/renderer_helper.o: Renderer/renderer_helper.cpp Renderer/renderer_helper.h
	g++ -c Renderer/renderer_helper.cpp -O3 -w -o Build/renderer_helper.o

Build/event_manager.o: event_manager.cpp event_manager.h
	g++ -c event_manager.cpp -O3 -w -o Build/event_manager.o

.PHONY: clean
clean:
	if exist Build del /f /s /q Build
	if exist Build rmdir /s /q Build
