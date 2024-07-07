#include <fstream>
#include <json/json.h>
#include "Renderer/renderer.h"
#include "event_manager.h"

Json::Value config;
Renderer *renderer;

Json::Value loadConfig() {
    Json::Value config;
    std::ifstream config_file("config.json", std::ifstream::binary);
    config_file >> config;
    config_file.close();
    return config;
}

void play() {
    while (true) {
        EventManager::update();
        if (EventManager::quit) {
            break;
        }

    }
}

int main(int argv, char **args) {
    config = loadConfig();
    renderer = new Renderer(config);
    if (strcmp(args[1], "--play") == 0) {
        play();
    }
    delete renderer;
    return 0;
}
