#include "wifi_manager.h"
#include "../config/secrets.h"

void WiFiManager::begin() {

    Serial.println("----------------------------------");
    Serial.println("Conectando al WiFi...");
    Serial.println("----------------------------------");

    WiFi.mode(WIFI_STA);

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    while (WiFi.status() != WL_CONNECTED) {

        delay(500);
        Serial.print(".");

    }

    Serial.println();
    Serial.println("WiFi conectado correctamente.");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());

}

void WiFiManager::reconnect() {

    if (WiFi.status() == WL_CONNECTED)
        return;

    Serial.println("WiFi desconectado. Reconectando...");

    WiFi.disconnect();

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

}

bool WiFiManager::isConnected() {

    return WiFi.status() == WL_CONNECTED;

}