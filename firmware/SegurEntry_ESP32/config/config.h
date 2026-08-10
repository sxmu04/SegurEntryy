#ifndef CONFIG_H
#define CONFIG_H

/**************************************************
 * PROYECTO
 **************************************************/
#define PROJECT_NAME "SegurEntry"
#define PROJECT_VERSION "1.0.0"

/**************************************************
 * MODO DE TRABAJO
 **************************************************/

// true = No usa sensores reales
// false = Usa todos los sensores físicos
#define SIMULATION_MODE true

/**************************************************
 * TIEMPOS
 **************************************************/

// Tiempo que la puerta permanecerá abierta (ms)
#define DOOR_OPEN_TIME 5000

// Tiempo entre cada lectura del sistema (ms)
#define SYSTEM_DELAY 500

/**************************************************
 * PINES DEL ESP32
 **************************************************/

// Servo MG996R
#define SERVO_PIN 13

// Relé
#define RELAY_PIN 27

// LEDs
#define GREEN_LED_PIN 26
#define RED_LED_PIN 25

// Buzzer
#define BUZZER_PIN 33

// Pantalla OLED I2C
#define OLED_SDA 21
#define OLED_SCL 22

// RC522 RFID
#define RFID_SS 5
#define RFID_RST 4

// Sensor de Huella AS608
#define FINGER_RX 16
#define FINGER_TX 17

#endif