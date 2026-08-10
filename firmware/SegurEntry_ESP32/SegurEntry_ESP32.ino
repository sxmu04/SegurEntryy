/**************************************************
 * SEGURENTRY
 * Firmware Principal
 **************************************************/

#include "config/config.h"

#include "core/wifi_manager.h"

// Crear instancia del WiFi
WiFiManager wifi;

void setup() {

    Serial.begin(115200);

    Serial.println();
    Serial.println("====================================");
    Serial.println(PROJECT_NAME);
    Serial.print("Version: ");
    Serial.println(PROJECT_VERSION);
    Serial.println("====================================");

    // Conectar WiFi
    wifi.begin();

}

void loop() {

    // Verificar conexión WiFi
    wifi.reconnect();

    delay(SYSTEM_DELAY);

}