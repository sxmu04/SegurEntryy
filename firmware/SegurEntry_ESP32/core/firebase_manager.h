#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <WiFi.h>

class WiFiManager {

public:

    void begin();

    void reconnect();

    bool isConnected();

};

#endif