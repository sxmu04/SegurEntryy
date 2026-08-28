#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_Fingerprint.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "secrets.h"

// ============================================================
//                    SEGURENTRY IoT
// ============================================================
//
// ESP32 + WiFi + AS608/DY50 + OLED SSD1306
//
// COMANDOS MONITOR SERIE:
//
// E 1      Registrar huella ID 1
// E 2      Registrar huella ID 2
// E 3      Registrar huella ID 3
//
// D 1      Eliminar huella ID 1
//
// STATUS   Estado del sistema
// HELP     Mostrar comandos
//
// ============================================================


// ============================================================
// WIFI
// ============================================================

const char* WIFI_SSID = "HV-Yaneth Piratova";

// Coloca tu contraseña real directamente en Arduino IDE
const char* WIFI_PASSWORD = "Angie03012006";


// ============================================================
// API SEGURENTRY / DJANGO
// ============================================================
//
// El ESP32 y el computador deben estar en la misma red WiFi.
// Si la IP del computador cambia, actualiza esta URL.
//
// ============================================================

const char* API_IOT_URL =
  "http://192.168.1.34:8000/api/access/iot/";

// ============================================================
// API BIOMETRIA / DJANGO
// ============================================================

const char* DEVICE_NAME =
  "SEGURENTRY-ESP32";

const char* API_BIOMETRIC_NEXT_URL =
  "http://192.168.1.34:8000/api/biometrics/device/jobs/next/?device=SEGURENTRY-ESP32";

const char* API_BIOMETRIC_HEARTBEAT_URL =
  "http://192.168.1.34:8000/api/biometrics/device/heartbeat/";

const char* API_BIOMETRIC_JOB_BASE_URL =
  "http://192.168.1.34:8000/api/biometrics/device/jobs/";


// ============================================================
// SENSOR DE HUELLA
// ============================================================
//
// AS608 / DY50          ESP32
// --------------------------------
// GND       ----------> GND
// RX        ----------> GPIO 17
// TX        ----------> GPIO 16
// 3V3       ----------> 3.3V
// T-OUT     ----------> SIN CONECTAR
// T-3V3     ----------> SIN CONECTAR
//
// ============================================================

#define FINGER_RX 16
#define FINGER_TX 17

HardwareSerial fingerSerial(2);

Adafruit_Fingerprint finger(&fingerSerial);


// ============================================================
// OLED
// ============================================================
//
// OLED                  ESP32
// --------------------------------
// GND       ----------> GND
// VCC       ----------> 3.3V
// SDA       ----------> GPIO 21
// SCL       ----------> GPIO 22
//
// ============================================================

#define OLED_SDA 21
#define OLED_SCL 22

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

#define OLED_RESET -1

Adafruit_SSD1306 display(
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  &Wire,
  OLED_RESET
);


// ============================================================
// VARIABLES
// ============================================================

bool sensorDisponible = false;

bool oledDisponible = false;

uint8_t direccionOLED = 0;

unsigned long ultimoIntentoWiFi = 0;

const unsigned long INTERVALO_WIFI = 15000;

// ============================================================
// BIOMETRIA REMOTA
// ============================================================

unsigned long ultimoPollBiometria = 0;
unsigned long ultimoHeartbeatBiometria = 0;

const unsigned long INTERVALO_POLL_BIOMETRIA = 2000;
const unsigned long INTERVALO_HEARTBEAT_BIOMETRIA = 10000;

bool procesandoTrabajoBiometrico = false;


// ============================================================
// ESTADOS
// ============================================================

enum EstadoSistema {

  INICIANDO,
  LISTO,
  REGISTRANDO,
  ERROR_SENSOR

};

EstadoSistema estadoSistema = INICIANDO;


// ============================================================
// ENCABEZADO SERIAL
// ============================================================

void mostrarEncabezado() {

  Serial.println();
  Serial.println("==========================================");
  Serial.println("              SEGURENTRY IoT");
  Serial.println("==========================================");
  Serial.println();

}


// ============================================================
// MOSTRAR TEXTO SIMPLE EN OLED
// ============================================================

void mostrarOLED(
  String linea1,
  String linea2 = "",
  String linea3 = "",
  String linea4 = ""
) {

  if (!oledDisponible) {

    return;
  }

  display.clearDisplay();

  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(1);

  display.setCursor(0, 3);
  display.println(linea1);

  display.setCursor(0, 20);
  display.println(linea2);

  display.setCursor(0, 36);
  display.println(linea3);

  display.setCursor(0, 52);
  display.println(linea4);

  display.display();

}


// ============================================================
// PANTALLA PRINCIPAL
// ============================================================

void mostrarPantallaPrincipal() {

  if (!oledDisponible) {

    return;
  }

  display.clearDisplay();

  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(1);

  display.setCursor(28, 4);
  display.println("SEGURENTRY");

  display.drawLine(
    0,
    16,
    127,
    16,
    SSD1306_WHITE
  );

  display.setTextSize(1);

  display.setCursor(19, 28);
  display.println("Coloque su huella");

  if (WiFi.status() == WL_CONNECTED) {

    display.setCursor(35, 50);
    display.println("WiFi: ONLINE");

  } else {

    display.setCursor(35, 50);
    display.println("WiFi: OFFLINE");

  }

  display.display();

}


// ============================================================
// BUSCAR DIRECCION OLED
// ============================================================

uint8_t buscarDireccionOLED() {

  Serial.println();
  Serial.println("Buscando OLED por I2C...");

  for (
    uint8_t direccion = 1;
    direccion < 127;
    direccion++
  ) {

    Wire.beginTransmission(
      direccion
    );

    uint8_t error =
      Wire.endTransmission();

    if (error == 0) {

      Serial.print(
        "Dispositivo I2C encontrado en 0x"
      );

      if (direccion < 16) {

        Serial.print("0");

      }

      Serial.println(
        direccion,
        HEX
      );

      if (
        direccion == 0x3C ||
        direccion == 0x3D
      ) {

        return direccion;
      }
    }
  }

  return 0;
}


// ============================================================
// INICIAR OLED
// ============================================================

bool iniciarOLED() {

  Serial.println();
  Serial.println("==========================================");
  Serial.println("                OLED");
  Serial.println("==========================================");

  Wire.begin(
    OLED_SDA,
    OLED_SCL
  );

  delay(500);

  direccionOLED =
    buscarDireccionOLED();

  if (direccionOLED == 0) {

    Serial.println();
    Serial.println(
      "OLED NO DETECTADA."
    );

    Serial.println(
      "SegurEntry continuara sin pantalla."
    );

    oledDisponible = false;

    return false;
  }

  Serial.println();

  Serial.print(
    "OLED encontrada en direccion 0x"
  );

  Serial.println(
    direccionOLED,
    HEX
  );

  if (
    !display.begin(
      SSD1306_SWITCHCAPVCC,
      direccionOLED
    )
  ) {

    Serial.println(
      "ERROR iniciando OLED."
    );

    oledDisponible = false;

    return false;
  }

  oledDisponible = true;

  display.clearDisplay();

  display.setTextColor(
    SSD1306_WHITE
  );

  display.setTextSize(2);

  display.setCursor(
    4,
    10
  );

  display.println(
    "SEGURENTRY"
  );

  display.setTextSize(1);

  display.setCursor(
    32,
    42
  );

  display.println(
    "Iniciando..."
  );

  display.display();

  Serial.println(
    "OLED funcionando correctamente."
  );

  delay(1500);

  return true;
}


// ============================================================
// WIFI
// ============================================================

void conectarWiFi() {

  Serial.println();
  Serial.println("==========================================");
  Serial.println("              CONEXION WIFI");
  Serial.println("==========================================");
  Serial.println();

  if (oledDisponible) {

    mostrarOLED(
      "SEGURENTRY",
      "Conectando WiFi...",
      WIFI_SSID
    );

  }

  WiFi.mode(
    WIFI_STA
  );

  Serial.print(
    "Conectando a: "
  );

  Serial.println(
    WIFI_SSID
  );

  WiFi.begin(
    WIFI_SSID,
    WIFI_PASSWORD
  );

  int intentos = 0;

  while (
    WiFi.status() != WL_CONNECTED &&
    intentos < 20
  ) {

    delay(500);

    Serial.print(".");

    intentos++;
  }

  Serial.println();
  Serial.println();

  if (
    WiFi.status() ==
    WL_CONNECTED
  ) {

    Serial.println(
      "WIFI CONECTADO"
    );

    Serial.print(
      "IP: "
    );

    Serial.println(
      WiFi.localIP()
    );

    Serial.print(
      "RSSI: "
    );

    Serial.print(
      WiFi.RSSI()
    );

    Serial.println(
      " dBm"
    );

    if (oledDisponible) {

      mostrarOLED(
        "SEGURENTRY",
        "WiFi conectado",
        "Sistema online"
      );

    }

  } else {

    Serial.println(
      "WIFI NO DISPONIBLE"
    );

    Serial.println(
      "SegurEntry continuara localmente."
    );

    if (oledDisponible) {

      mostrarOLED(
        "SEGURENTRY",
        "WiFi offline",
        "Modo local"
      );

    }

  }

  Serial.println();

  delay(1000);
}


// ============================================================
// MANTENER WIFI
// ============================================================

void mantenerWiFi() {

  if (
    WiFi.status() ==
    WL_CONNECTED
  ) {

    return;
  }

  unsigned long ahora =
    millis();

  if (
    ahora - ultimoIntentoWiFi <
    INTERVALO_WIFI
  ) {

    return;
  }

  ultimoIntentoWiFi =
    ahora;

  WiFi.disconnect();

  WiFi.begin(
    WIFI_SSID,
    WIFI_PASSWORD
  );
}


// ============================================================
// INICIAR SENSOR
// ============================================================

bool iniciarSensor() {

  Serial.println();
  Serial.println("==========================================");
  Serial.println("           SENSOR DE HUELLA");
  Serial.println("==========================================");
  Serial.println();

  if (oledDisponible) {

    mostrarOLED(
      "SEGURENTRY",
      "Iniciando sensor",
      "de huella..."
    );

  }

  fingerSerial.end();

  delay(300);

  fingerSerial.begin(
    57600,
    SERIAL_8N1,
    FINGER_RX,
    FINGER_TX
  );

  finger.begin(
    57600
  );

  delay(2000);

  Serial.println(
    "Buscando sensor..."
  );

  for (
    int intento = 1;
    intento <= 5;
    intento++
  ) {

    Serial.print(
      "Intento "
    );

    Serial.print(
      intento
    );

    Serial.print(
      "/5... "
    );

    if (
      finger.verifyPassword()
    ) {

      Serial.println(
        "OK"
      );

      sensorDisponible =
        true;

      finger.getParameters();

      finger.getTemplateCount();

      Serial.println();

      Serial.println(
        "Sensor detectado correctamente."
      );

      Serial.print(
        "Capacidad: "
      );

      Serial.println(
        finger.capacity
      );

      Serial.print(
        "Nivel de seguridad: "
      );

      Serial.println(
        finger.security_level
      );

      Serial.print(
        "Baud rate: "
      );

      Serial.println(
        finger.baud_rate
      );

      Serial.print(
        "Huellas almacenadas: "
      );

      Serial.println(
        finger.templateCount
      );

      return true;
    }

    Serial.println(
      "sin respuesta"
    );

    delay(800);
  }

  sensorDisponible =
    false;

  estadoSistema =
    ERROR_SENSOR;

  Serial.println();

  Serial.println(
    "ERROR: sensor no encontrado."
  );

  if (oledDisponible) {

    mostrarOLED(
      "ERROR",
      "Sensor de huella",
      "no detectado"
    );

  }

  return false;
}


// ============================================================
// MOSTRAR ERROR DEL SENSOR
// ============================================================

void mostrarErrorHuella(
  uint8_t resultado
) {

  switch (resultado) {

    case FINGERPRINT_PACKETRECIEVEERR:

      Serial.println(
        "Error temporal de comunicacion UART."
      );

      break;


    case FINGERPRINT_IMAGEFAIL:

      Serial.println(
        "Error capturando imagen."
      );

      break;


    case FINGERPRINT_IMAGEMESS:

      Serial.println(
        "Imagen demasiado borrosa."
      );

      break;


    case FINGERPRINT_FEATUREFAIL:

      Serial.println(
        "No se detectaron suficientes caracteristicas."
      );

      break;


    case FINGERPRINT_INVALIDIMAGE:

      Serial.println(
        "Imagen de huella invalida."
      );

      break;


    default:

      Serial.print(
        "Codigo de error: "
      );

      Serial.println(
        resultado
      );

      break;

  }
}


// ============================================================
// ESPERAR SIN DEDO
// ============================================================

bool esperarSinDedo(
  unsigned long timeout = 10000
) {

  unsigned long inicio =
    millis();

  while (
    millis() - inicio <
    timeout
  ) {

    uint8_t resultado =
      finger.getImage();

    if (
      resultado ==
      FINGERPRINT_NOFINGER
    ) {

      return true;
    }

    if (
      resultado ==
      FINGERPRINT_PACKETRECIEVEERR
    ) {

      delay(150);

      continue;
    }

    delay(100);
  }

  return false;
}


// ============================================================
// CAPTURAR DEDO
// ============================================================

bool capturarDedo(
  uint8_t bufferID
) {

  int erroresComunicacion = 0;

  while (true) {

    uint8_t resultado =
      finger.getImage();

    if (
      resultado ==
      FINGERPRINT_NOFINGER
    ) {

      delay(100);

      continue;
    }

    if (
      resultado ==
      FINGERPRINT_OK
    ) {

      Serial.println(
        "Imagen capturada correctamente."
      );

      break;
    }

    if (
      resultado ==
      FINGERPRINT_PACKETRECIEVEERR
    ) {

      erroresComunicacion++;

      Serial.print(
        "Error UART. Reintentando "
      );

      Serial.print(
        erroresComunicacion
      );

      Serial.println(
        "/10..."
      );

      if (
        erroresComunicacion >= 10
      ) {

        return false;
      }

      delay(300);

      continue;
    }

    mostrarErrorHuella(
      resultado
    );

    delay(500);
  }

  uint8_t conversion =
    finger.image2Tz(
      bufferID
    );

  if (
    conversion ==
    FINGERPRINT_OK
  ) {

    Serial.println(
      "Huella procesada correctamente."
    );

    return true;
  }

  mostrarErrorHuella(
    conversion
  );

  return false;
}

// ============================================================
// VERIFICAR SI UN ID YA ESTA OCUPADO
// ============================================================

int verificarIDOcupado(uint16_t id) {

  if (!sensorDisponible) {
    return -1;
  }

  uint8_t resultado = finger.loadModel(id);

  if (resultado == FINGERPRINT_OK) {
    return 1;
  }

  if (resultado == FINGERPRINT_PACKETRECIEVEERR) {
    return -1;
  }

  return 0;
}


// ============================================================
// REGISTRAR HUELLA
// ============================================================

bool registrarHuella(
  uint16_t id
) {

  if (!sensorDisponible) {
    Serial.println("Sensor de huella no disponible.");
    return false;
  }

  if (
    id < 1 ||
    id > finger.capacity
  ) {

    Serial.println("ID fuera de rango.");
    return false;
  }

  // ==========================================================
  // EVITAR SOBREESCRIBIR UN ID YA UTILIZADO
  // ==========================================================

  int estadoID = verificarIDOcupado(id);

  if (estadoID == 1) {

    Serial.println();
    Serial.println("==========================================");
    Serial.println("              ID YA OCUPADO");
    Serial.println("==========================================");
    Serial.print("El ID ");
    Serial.print(id);
    Serial.println(" ya contiene una huella.");
    Serial.println("Usa otro ID o elimina primero esa huella.");

    if (oledDisponible) {
      mostrarOLED(
        "ID YA OCUPADO",
        "ID: " + String(id),
        "Use otro ID"
      );
      delay(2200);
      mostrarPantallaPrincipal();
    }

    return false;
  }

  if (estadoID == -1) {

    Serial.println("No se pudo verificar si el ID esta ocupado.");

    if (oledDisponible) {
      mostrarOLED(
        "ERROR",
        "No se pudo",
        "verificar el ID"
      );
      delay(1800);
      mostrarPantallaPrincipal();
    }

    return false;
  }

  estadoSistema = REGISTRANDO;

  Serial.println();
  Serial.println("==========================================");
  Serial.println("          REGISTRO DE HUELLA");
  Serial.println("==========================================");
  Serial.print("ID asignado: ");
  Serial.println(id);

  if (oledDisponible) {
    mostrarOLED(
      "REGISTRO",
      "Nueva huella",
      "ID: " + String(id),
      "Prepare el dedo"
    );
  }

  // Asegurar que no haya un dedo apoyado antes de iniciar.
  if (!esperarSinDedo()) {

    Serial.println("Retira el dedo antes de iniciar el registro.");

    estadoSistema = LISTO;
    mostrarPantallaPrincipal();

    return false;
  }

  delay(500);

  // ==========================================================
  // PRIMERA LECTURA
  // ==========================================================

  Serial.println();
  Serial.println("PRIMERA LECTURA");
  Serial.println("Coloca el dedo...");

  if (oledDisponible) {
    mostrarOLED(
      "REGISTRO ID " + String(id),
      "Coloque dedo",
      "Primera lectura"
    );
  }

  if (!capturarDedo(1)) {

    estadoSistema = LISTO;
    mostrarPantallaPrincipal();

    return false;
  }

  // ==========================================================
  // VERIFICAR SI ESA HUELLA YA EXISTE
  //
  // La primera lectura ya esta en el buffer 1, asi que podemos
  // buscarla en la memoria antes de continuar el registro.
  // ==========================================================

  Serial.println();
  Serial.println("Verificando si la huella ya esta registrada...");

  uint8_t busqueda = finger.fingerSearch();

  if (busqueda == FINGERPRINT_OK) {

    uint16_t idExistente = finger.fingerID;

    Serial.println();
    Serial.println("==========================================");
    Serial.println("          HUELLA YA REGISTRADA");
    Serial.println("==========================================");
    Serial.print("Esta huella ya pertenece al ID: ");
    Serial.println(idExistente);
    Serial.println("REGISTRO CANCELADO.");

    if (oledDisponible) {
      mostrarOLED(
        "HUELLA EXISTENTE",
        "Ya registrada",
        "ID: " + String(idExistente),
        "Registro cancelado"
      );
    }

    esperarSinDedo();
    delay(2200);

    estadoSistema = LISTO;
    mostrarPantallaPrincipal();

    return false;
  }

  if (busqueda != FINGERPRINT_NOTFOUND) {

    Serial.println("Error verificando si la huella ya existe.");
    mostrarErrorHuella(busqueda);

    if (oledDisponible) {
      mostrarOLED(
        "ERROR",
        "No se pudo",
        "verificar huella"
      );
    }

    esperarSinDedo();
    delay(1500);

    estadoSistema = LISTO;
    mostrarPantallaPrincipal();

    return false;
  }

  Serial.println("Huella nueva. Puede continuar el registro.");

  if (oledDisponible) {
    mostrarOLED(
      "HUELLA NUEVA",
      "Primera lectura OK",
      "Retire el dedo"
    );
  }

  Serial.println();
  Serial.println("Retira el dedo...");

  if (!esperarSinDedo()) {

    Serial.println("No se retiro el dedo a tiempo.");

    estadoSistema = LISTO;
    mostrarPantallaPrincipal();

    return false;
  }

  delay(1000);

  // ==========================================================
  // SEGUNDA LECTURA
  // ==========================================================

  Serial.println();
  Serial.println("SEGUNDA LECTURA");
  Serial.println("Coloca EL MISMO dedo...");

  if (oledDisponible) {
    mostrarOLED(
      "REGISTRO ID " + String(id),
      "Mismo dedo",
      "Segunda lectura"
    );
  }

  if (!capturarDedo(2)) {

    estadoSistema = LISTO;
    mostrarPantallaPrincipal();

    return false;
  }

  // ==========================================================
  // CREAR MODELO
  // ==========================================================

  Serial.println();
  Serial.println("Comparando lecturas...");

  if (oledDisponible) {
    mostrarOLED(
      "SEGURENTRY",
      "Comparando",
      "huellas..."
    );
  }

  uint8_t resultado = finger.createModel();

  if (resultado == FINGERPRINT_ENROLLMISMATCH) {

    Serial.println("Las huellas no coinciden.");

    if (oledDisponible) {
      mostrarOLED(
        "ERROR",
        "Las huellas",
        "no coinciden"
      );
    }

    esperarSinDedo();
    delay(2000);

    estadoSistema = LISTO;
    mostrarPantallaPrincipal();

    return false;
  }

  if (resultado != FINGERPRINT_OK) {

    Serial.println("Error creando el modelo de huella.");
    mostrarErrorHuella(resultado);

    esperarSinDedo();

    estadoSistema = LISTO;
    mostrarPantallaPrincipal();

    return false;
  }

  // ==========================================================
  // GUARDAR MODELO
  // ==========================================================

  resultado = finger.storeModel(id);

  if (resultado != FINGERPRINT_OK) {

    Serial.println("ERROR guardando huella.");
    mostrarErrorHuella(resultado);

    if (oledDisponible) {
      mostrarOLED(
        "ERROR",
        "No se pudo",
        "guardar huella"
      );
    }

    esperarSinDedo();
    delay(2000);

    estadoSistema = LISTO;
    mostrarPantallaPrincipal();

    return false;
  }

  finger.getTemplateCount();

  Serial.println();
  Serial.println("==========================================");
  Serial.println("       HUELLA GUARDADA CORRECTAMENTE");
  Serial.println("==========================================");
  Serial.print("ID: ");
  Serial.println(id);
  Serial.print("Total: ");
  Serial.println(finger.templateCount);

  if (oledDisponible) {
    mostrarOLED(
      "HUELLA GUARDADA",
      "ID: " + String(id),
      "Total: " + String(finger.templateCount)
    );
  }

  esperarSinDedo();
  delay(2200);

  estadoSistema = LISTO;
  mostrarPantallaPrincipal();

  return true;
}



// ============================================================
// HTTP GET SIMPLE
// ============================================================

bool httpGetSimple(
  const String& url,
  String& respuesta,
  int& codigoHTTP
) {

  respuesta = "";
  codigoHTTP = -1;

  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  WiFiClient client;
  HTTPClient http;

  http.setTimeout(5000);

  if (!http.begin(client, url)) {
    return false;
  }

  codigoHTTP = http.GET();

  if (codigoHTTP > 0) {
    respuesta = http.getString();
  }

  http.end();

  return (
    codigoHTTP >= 200 &&
    codigoHTTP < 300
  );
}


// ============================================================
// HTTP POST JSON SIMPLE
// ============================================================

bool httpPostJsonSimple(
  const String& url,
  const String& payload,
  String& respuesta,
  int& codigoHTTP
) {

  respuesta = "";
  codigoHTTP = -1;

  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  WiFiClient client;
  HTTPClient http;

  http.setTimeout(6000);

  if (!http.begin(client, url)) {
    return false;
  }

  http.addHeader(
    "Content-Type",
    "application/json"
  );

  codigoHTTP = http.POST(payload);

  if (codigoHTTP > 0) {
    respuesta = http.getString();
  }

  http.end();

  return (
    codigoHTTP >= 200 &&
    codigoHTTP < 300
  );
}


// ============================================================
// EXTRAER STRING DE JSON PLANO
// ============================================================

String extraerStringJson(
  const String& json,
  const String& clave
) {

  String patron =
    "\"" + clave + "\"";

  int posicionClave =
    json.indexOf(patron);

  if (posicionClave < 0) {
    return "";
  }

  int posicionDosPuntos =
    json.indexOf(
      ':',
      posicionClave + patron.length()
    );

  if (posicionDosPuntos < 0) {
    return "";
  }

  int inicio =
    posicionDosPuntos + 1;

  while (
    inicio < json.length() &&
    (
      json[inicio] == ' ' ||
      json[inicio] == '\r' ||
      json[inicio] == '\n' ||
      json[inicio] == '\t'
    )
  ) {
    inicio++;
  }

  if (
    inicio >= json.length() ||
    json[inicio] != '"'
  ) {
    return "";
  }

  inicio++;

  String valor = "";
  bool escapado = false;

  for (
    int i = inicio;
    i < json.length();
    i++
  ) {

    char c = json[i];

    if (escapado) {
      valor += c;
      escapado = false;
      continue;
    }

    if (c == '\\') {
      escapado = true;
      continue;
    }

    if (c == '"') {
      break;
    }

    valor += c;
  }

  return valor;
}


// ============================================================
// EXTRAER BOOL DE JSON PLANO
// ============================================================

bool extraerBoolJson(
  String json,
  const String& clave,
  bool valorPorDefecto = false
) {

  json.replace(" ", "");
  json.replace("\r", "");
  json.replace("\n", "");
  json.replace("\t", "");

  json.toLowerCase();

  String patronTrue =
    "\"" + clave + "\":true";

  String patronFalse =
    "\"" + clave + "\":false";

  if (json.indexOf(patronTrue) >= 0) {
    return true;
  }

  if (json.indexOf(patronFalse) >= 0) {
    return false;
  }

  return valorPorDefecto;
}


// ============================================================
// EXTRAER ENTERO DE JSON PLANO
// ============================================================

int extraerIntJson(
  String json,
  const String& clave,
  int valorPorDefecto = -1
) {

  json.replace(" ", "");
  json.replace("\r", "");
  json.replace("\n", "");
  json.replace("\t", "");

  String patron =
    "\"" + clave + "\":";

  int posicion =
    json.indexOf(
      patron
    );

  if (posicion < 0) {
    return valorPorDefecto;
  }

  int inicio =
    posicion +
    patron.length();

  if (inicio >= json.length()) {
    return valorPorDefecto;
  }

  bool negativo = false;

  if (json[inicio] == '-') {
    negativo = true;
    inicio++;
  }

  long valor = 0;
  bool encontroDigito = false;

  for (
    int i = inicio;
    i < json.length();
    i++
  ) {

    char c = json[i];

    if (
      c < '0' ||
      c > '9'
    ) {
      break;
    }

    encontroDigito = true;

    valor =
      (valor * 10) +
      (c - '0');
  }

  if (!encontroDigito) {
    return valorPorDefecto;
  }

  if (negativo) {
    valor = -valor;
  }

  return (int) valor;
}


// ============================================================
// ESCAPAR STRING PARA JSON
// ============================================================

String escaparJson(
  String valor
) {

  valor.replace("\\", "\\\\");
  valor.replace("\"", "\\\"");
  valor.replace("\r", " ");
  valor.replace("\n", " ");

  return valor;
}


// ============================================================
// BUSCAR PRIMER ID LIBRE EN EL AS608
// ============================================================

int buscarPrimerIDLibre() {

  if (!sensorDisponible) {
    return -1;
  }

  uint16_t capacidad =
    finger.capacity;

  if (capacidad == 0) {
    finger.getParameters();
    capacidad = finger.capacity;
  }

  for (
    uint16_t id = 1;
    id <= capacidad;
    id++
  ) {

    uint8_t resultado =
      finger.loadModel(id);

    if (resultado == FINGERPRINT_OK) {
      continue;
    }

    if (
      resultado ==
      FINGERPRINT_PACKETRECIEVEERR
    ) {

      delay(100);

      resultado =
        finger.loadModel(id);

      if (
        resultado ==
        FINGERPRINT_PACKETRECIEVEERR
      ) {

        Serial.println(
          "Error UART buscando un ID libre."
        );

        return -1;
      }

      if (
        resultado ==
        FINGERPRINT_OK
      ) {
        continue;
      }
    }

    return id;
  }

  return -1;
}


// ============================================================
// REPORTAR FALLO BIOMETRICO
// ============================================================

bool reportarFalloBiometrico(
  const String& jobID,
  const String& mensaje
) {

  if (jobID.length() == 0) {
    return false;
  }

  String url =
    String(API_BIOMETRIC_JOB_BASE_URL) +
    jobID +
    "/fail/";

  String payload = "{";
  payload +=
    "\"device\":\"" +
    String(DEVICE_NAME) +
    "\",";
  payload +=
    "\"message\":\"" +
    escaparJson(mensaje) +
    "\"";
  payload += "}";

  String respuesta;
  int codigoHTTP;

  bool ok =
    httpPostJsonSimple(
      url,
      payload,
      respuesta,
      codigoHTTP
    );

  Serial.print(
    "Biometria FAIL HTTP: "
  );
  Serial.println(codigoHTTP);

  return ok;
}


// ============================================================
// CONFIRMAR REGISTRO BIOMETRICO
// ============================================================

bool confirmarRegistroBiometrico(
  const String& jobID,
  uint16_t fingerprintID
) {

  String url =
    String(API_BIOMETRIC_JOB_BASE_URL) +
    jobID +
    "/complete/";

  String payload = "{";
  payload +=
    "\"device\":\"" +
    String(DEVICE_NAME) +
    "\",";
  payload +=
    "\"fingerprint_id\":" +
    String(fingerprintID);
  payload += "}";

  String respuesta;
  int codigoHTTP;

  bool ok =
    httpPostJsonSimple(
      url,
      payload,
      respuesta,
      codigoHTTP
    );

  Serial.print(
    "Biometria COMPLETE HTTP: "
  );
  Serial.println(codigoHTTP);

  if (respuesta.length() > 0) {
    Serial.println(respuesta);
  }

  return ok;
}


// ============================================================
// PROCESAR REGISTRO BIOMETRICO DESDE WEB
// ============================================================

void procesarRegistroBiometricoWeb(
  const String& jobID,
  String nombreUsuario
) {

  if (procesandoTrabajoBiometrico) {
    return;
  }

  procesandoTrabajoBiometrico = true;

  Serial.println();
  Serial.println("==========================================");
  Serial.println("      REGISTRO BIOMETRICO DESDE WEB");
  Serial.println("==========================================");

  Serial.print("Job: ");
  Serial.println(jobID);

  Serial.print("Usuario: ");
  Serial.println(nombreUsuario);

  if (!sensorDisponible) {

    reportarFalloBiometrico(
      jobID,
      "Sensor de huella no disponible."
    );

    procesandoTrabajoBiometrico = false;
    return;
  }

  int idLibre =
    buscarPrimerIDLibre();

  if (idLibre <= 0) {

    reportarFalloBiometrico(
      jobID,
      "No fue posible encontrar un ID libre en el sensor."
    );

    if (oledDisponible) {
      mostrarOLED(
        "BIOMETRIA",
        "Sin espacio",
        "o error sensor"
      );
      delay(1800);
      mostrarPantallaPrincipal();
    }

    procesandoTrabajoBiometrico = false;
    return;
  }

  if (nombreUsuario.length() > 18) {
    nombreUsuario =
      nombreUsuario.substring(0, 18);
  }

  if (oledDisponible) {
    mostrarOLED(
      "REGISTRO WEB",
      nombreUsuario,
      "ID: " + String(idLibre),
      "Prepare el dedo"
    );

    delay(1200);
  }

  bool registrada =
    registrarHuella(idLibre);

  if (!registrada) {

    reportarFalloBiometrico(
      jobID,
      "El sensor no pudo completar el registro de la huella."
    );

    procesandoTrabajoBiometrico = false;
    return;
  }

  bool backendConfirmado =
    confirmarRegistroBiometrico(
      jobID,
      idLibre
    );

  if (!backendConfirmado) {

    Serial.println(
      "El backend no confirmo el registro."
    );

    Serial.println(
      "Se elimina la huella local para evitar una asociacion inconsistente."
    );

    finger.deleteModel(idLibre);
    finger.getTemplateCount();

    reportarFalloBiometrico(
      jobID,
      "La huella se capturo, pero el backend no pudo asociarla al usuario."
    );

    if (oledDisponible) {
      mostrarOLED(
        "ERROR WEB",
        "No se asocio",
        "la huella",
        "Intente de nuevo"
      );

      delay(2200);
      mostrarPantallaPrincipal();
    }

    procesandoTrabajoBiometrico = false;
    return;
  }

  Serial.println();
  Serial.println("==========================================");
  Serial.println("      BIOMETRIA SINCRONIZADA CON WEB");
  Serial.println("==========================================");

  if (oledDisponible) {
    mostrarOLED(
      "BIOMETRIA OK",
      nombreUsuario,
      "Huella ID: " +
      String(idLibre),
      "Sincronizada"
    );

    delay(2200);
    mostrarPantallaPrincipal();
  }

  procesandoTrabajoBiometrico = false;
}


// ============================================================
// PROCESAR ELIMINACIÓN DE HUELLA DESDE WEB
// ============================================================

void procesarEliminacionBiometricaWeb(
  const String& jobID,
  int fingerprintID,
  String nombreUsuario
) {

  if (procesandoTrabajoBiometrico) {
    return;
  }

  procesandoTrabajoBiometrico = true;

  Serial.println();
  Serial.println("==========================================");
  Serial.println("       LIBERAR HUELLA DESDE WEB");
  Serial.println("==========================================");

  Serial.print("Job: ");
  Serial.println(jobID);

  Serial.print("Usuario: ");
  Serial.println(nombreUsuario);

  Serial.print("Huella ID: ");
  Serial.println(fingerprintID);

  if (!sensorDisponible) {

    reportarFalloBiometrico(
      jobID,
      "Sensor de huella no disponible."
    );

    procesandoTrabajoBiometrico = false;
    return;
  }

  if (fingerprintID <= 0) {

    reportarFalloBiometrico(
      jobID,
      "ID de huella inválido para eliminación."
    );

    procesandoTrabajoBiometrico = false;
    return;
  }

  if (oledDisponible) {

    mostrarOLED(
      "LIBERANDO HUELLA",
      nombreUsuario,
      "ID: " +
      String(fingerprintID),
      "Espere..."
    );

  }

  // Primero comprobamos si la posición realmente contiene
  // una plantilla. Si ya está libre, la operación también
  // se considera exitosa para hacerla idempotente.
  uint8_t carga =
    finger.loadModel(
      fingerprintID
    );

  bool idLiberado = false;

  if (
    carga ==
    FINGERPRINT_PACKETRECIEVEERR
  ) {

    reportarFalloBiometrico(
      jobID,
      "Error de comunicación con el AS608."
    );

    if (oledDisponible) {

      mostrarOLED(
        "ERROR AS608",
        "No se pudo",
        "liberar ID " +
        String(fingerprintID)
      );

      delay(1800);
      mostrarPantallaPrincipal();
    }

    procesandoTrabajoBiometrico = false;
    return;
  }

  if (
    carga !=
    FINGERPRINT_OK
  ) {

    // No existe un modelo cargable en esa posición:
    // el ID ya está libre.
    idLiberado = true;

  } else {

    uint8_t borrado =
      finger.deleteModel(
        fingerprintID
      );

    if (
      borrado ==
      FINGERPRINT_OK
    ) {

      idLiberado = true;

    } else {

      mostrarErrorHuella(
        borrado
      );

      reportarFalloBiometrico(
        jobID,
        "El AS608 no pudo eliminar la plantilla."
      );

      if (oledDisponible) {

        mostrarOLED(
          "ERROR",
          "No se libero",
          "Huella ID: " +
          String(fingerprintID)
        );

        delay(1800);
        mostrarPantallaPrincipal();
      }

      procesandoTrabajoBiometrico = false;
      return;
    }
  }

  if (!idLiberado) {

    procesandoTrabajoBiometrico = false;
    return;
  }

  finger.getTemplateCount();

  // El endpoint /complete/ es genérico. Django revisa
  // action="delete" y marca el ID como liberado.
  bool backendConfirmado = false;

  for (
    int intento = 1;
    intento <= 3;
    intento++
  ) {

    backendConfirmado =
      confirmarRegistroBiometrico(
        jobID,
        fingerprintID
      );

    if (backendConfirmado) {
      break;
    }

    delay(700);
  }

  if (!backendConfirmado) {

    Serial.println(
      "ADVERTENCIA: el ID ya fue liberado del sensor, "
      "pero Django no confirmó el job."
    );

    if (oledDisponible) {

      mostrarOLED(
        "ID LIBERADO",
        "Django pendiente",
        "ID: " +
        String(fingerprintID)
      );

      delay(1800);
      mostrarPantallaPrincipal();
    }

    procesandoTrabajoBiometrico = false;
    return;
  }

  Serial.println();
  Serial.println("==========================================");
  Serial.println("          HUELLA LIBERADA");
  Serial.println("==========================================");
  Serial.print("ID disponible nuevamente: ");
  Serial.println(fingerprintID);

  if (oledDisponible) {

    mostrarOLED(
      "HUELLA LIBERADA",
      "ID disponible",
      String(fingerprintID)
    );

    delay(1800);
    mostrarPantallaPrincipal();
  }

  procesandoTrabajoBiometrico = false;
}


// ============================================================
// CONSULTAR TRABAJO PENDIENTE
// ============================================================

void consultarTrabajoBiometrico() {

  if (
    procesandoTrabajoBiometrico ||
    estadoSistema != LISTO
  ) {
    return;
  }

  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  unsigned long ahora = millis();

  if (
    ahora - ultimoPollBiometria <
    INTERVALO_POLL_BIOMETRIA
  ) {
    return;
  }

  ultimoPollBiometria = ahora;

  String respuesta;
  int codigoHTTP;

  bool ok =
    httpGetSimple(
      API_BIOMETRIC_NEXT_URL,
      respuesta,
      codigoHTTP
    );

  if (!ok) {
    return;
  }

  bool hayTrabajo =
    extraerBoolJson(
      respuesta,
      "has_job",
      false
    );

  if (!hayTrabajo) {
    return;
  }

  String jobID =
    extraerStringJson(
      respuesta,
      "job_id"
    );

  String action =
    extraerStringJson(
      respuesta,
      "action"
    );

  String nombreUsuario =
    extraerStringJson(
      respuesta,
      "user_name"
    );

  int fingerprintID =
    extraerIntJson(
      respuesta,
      "fingerprint_id",
      -1
    );

  action.toLowerCase();

  if (jobID.length() == 0) {
    Serial.println(
      "Trabajo biometrico sin job_id."
    );
    return;
  }

  if (action == "enroll") {

    procesarRegistroBiometricoWeb(
      jobID,
      nombreUsuario
    );

    return;
  }

  if (action == "delete") {

    procesarEliminacionBiometricaWeb(
      jobID,
      fingerprintID,
      nombreUsuario
    );

    return;
  }

  reportarFalloBiometrico(
    jobID,
    "Accion biometrica no soportada por el firmware."
  );
}


// ============================================================
// HEARTBEAT BIOMETRICO
// ============================================================

void enviarHeartbeatBiometrico() {

  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  unsigned long ahora = millis();

  if (
    ahora - ultimoHeartbeatBiometria <
    INTERVALO_HEARTBEAT_BIOMETRIA
  ) {
    return;
  }

  ultimoHeartbeatBiometria = ahora;

  int cantidadHuellas = -1;

  if (sensorDisponible) {

    uint8_t resultado =
      finger.getTemplateCount();

    if (resultado == FINGERPRINT_OK) {
      cantidadHuellas =
        finger.templateCount;
    }
  }

  String payload = "{";
  payload +=
    "\"device\":\"" +
    String(DEVICE_NAME) +
    "\",";
  payload +=
    "\"ip\":\"" +
    WiFi.localIP().toString() +
    "\",";
  payload +=
    "\"wifi_connected\":true,";
  payload +=
    "\"sensor_available\":" +
    String(
      sensorDisponible
      ? "true"
      : "false"
    ) +
    ",";

  if (cantidadHuellas >= 0) {
    payload +=
      "\"template_count\":" +
      String(cantidadHuellas);
  } else {
    payload +=
      "\"template_count\":null";
  }

  payload += "}";

  String respuesta;
  int codigoHTTP;

  httpPostJsonSimple(
    API_BIOMETRIC_HEARTBEAT_URL,
    payload,
    respuesta,
    codigoHTTP
  );
}



// ============================================================
// VALIDAR ACCESO EN DJANGO / FIRESTORE
// ============================================================

bool validarAccesoServidor(
  uint16_t fingerprintID
) {

  Serial.println();
  Serial.println("==========================================");
  Serial.println("        VALIDACION SEGURENTRY WEB");
  Serial.println("==========================================");

  Serial.print("Fingerprint ID: ");
  Serial.println(fingerprintID);

  if (
    WiFi.status() !=
    WL_CONNECTED
  ) {

    Serial.println("ERROR: WiFi no disponible.");
    Serial.println("Acceso denegado por seguridad.");

    if (oledDisponible) {
      mostrarOLED(
        "SIN CONEXION",
        "WiFi no disponible",
        "Acceso denegado"
      );
    }

    return false;
  }

  if (oledDisponible) {
    mostrarOLED(
      "SEGURENTRY",
      "Huella ID: " + String(fingerprintID),
      "Consultando web..."
    );
  }

  WiFiClient client;
  HTTPClient http;

  http.setTimeout(5000);

  if (
    !http.begin(
      client,
      API_IOT_URL
    )
  ) {

    Serial.println("ERROR iniciando solicitud HTTP.");

    if (oledDisponible) {
      mostrarOLED(
        "ERROR SERVIDOR",
        "No se pudo iniciar",
        "conexion HTTP"
      );
    }

    return false;
  }

  http.addHeader(
    "Content-Type",
    "application/json"
  );

  String payload = "{";
  payload += "\"fingerprint_id\":";
  payload += String(fingerprintID);
  payload += ",";
  payload += "\"door\":\"Entrada principal\",";
  payload += "\"device\":\"SEGURENTRY-ESP32\"";
  payload += "}";

  Serial.println();
  Serial.println("Enviando al backend:");
  Serial.println(payload);

  int codigoHTTP =
    http.POST(payload);

  Serial.print("HTTP Code: ");
  Serial.println(codigoHTTP);

  if (
    codigoHTTP <= 0
  ) {

    Serial.print("ERROR HTTP: ");
    Serial.println(
      http.errorToString(codigoHTTP)
    );

    http.end();

    if (oledDisponible) {
      mostrarOLED(
        "SERVIDOR OFFLINE",
        "Sin respuesta",
        "Acceso denegado"
      );
    }

    return false;
  }

  String respuesta =
    http.getString();

  http.end();

  Serial.println();
  Serial.println("Respuesta Django:");
  Serial.println(respuesta);

  // JsonResponse de Django puede incluir espacios y saltos.
  // Normalizamos para localizar de forma sencilla:
  // "authorized":true
  String respuestaNormalizada =
    respuesta;

  respuestaNormalizada.replace(
    " ",
    ""
  );

  respuestaNormalizada.replace(
    "\r",
    ""
  );

  respuestaNormalizada.replace(
    "\n",
    ""
  );

  respuestaNormalizada.replace(
    "\t",
    ""
  );

  respuestaNormalizada.toLowerCase();

  bool codigoValido =
    codigoHTTP >= 200 &&
    codigoHTTP < 300;

  bool autorizado =
    codigoValido &&
    respuestaNormalizada.indexOf(
      "\"authorized\":true"
    ) >= 0;

  Serial.println();

  if (autorizado) {

    Serial.println(
      "SERVIDOR: ACCESO AUTORIZADO"
    );

  } else {

    Serial.println(
      "SERVIDOR: ACCESO DENEGADO"
    );

  }

  return autorizado;
}


// ============================================================
// ACCESO PERMITIDO
// ============================================================

void accesoPermitido(
  uint16_t id,
  uint16_t confianza
) {

  Serial.println();
  Serial.println("==========================================");
  Serial.println("             ACCESO PERMITIDO");
  Serial.println("==========================================");

  Serial.print(
    "ID huella: "
  );

  Serial.println(
    id
  );

  Serial.print(
    "Confianza: "
  );

  Serial.println(
    confianza
  );

  Serial.println();

  if (oledDisponible) {

    display.clearDisplay();

    display.setTextColor(
      SSD1306_WHITE
    );

    display.setTextSize(2);

    display.setCursor(
      20,
      5
    );

    display.println(
      "ACCESO"
    );

    display.setCursor(
      8,
      26
    );

    display.println(
      "PERMITIDO"
    );

    display.setTextSize(1);

    display.setCursor(
      40,
      52
    );

    display.print(
      "ID: "
    );

    display.println(
      id
    );

    display.display();
  }

  delay(2000);

  mostrarPantallaPrincipal();
}


// ============================================================
// ACCESO DENEGADO
// ============================================================

void accesoDenegado(
  String motivo = "Huella no registrada."
) {

  Serial.println();
  Serial.println("==========================================");
  Serial.println("              ACCESO DENEGADO");
  Serial.println("==========================================");

  Serial.println(
    motivo
  );

  Serial.println();

  if (oledDisponible) {

    display.clearDisplay();

    display.setTextColor(
      SSD1306_WHITE
    );

    display.setTextSize(2);

    display.setCursor(
      20,
      10
    );

    display.println(
      "ACCESO"
    );

    display.setCursor(
      10,
      34
    );

    display.println(
      "DENEGADO"
    );

    display.display();
  }

  delay(2000);

  mostrarPantallaPrincipal();
}


// ============================================================
// BUSCAR HUELLA
// ============================================================

void buscarHuella() {

  if (
    !sensorDisponible
  ) {

    return;
  }

  if (
    estadoSistema !=
    LISTO
  ) {

    return;
  }

  uint8_t resultado =
    finger.getImage();

  if (
    resultado ==
    FINGERPRINT_NOFINGER
  ) {

    return;
  }

  if (
    resultado ==
    FINGERPRINT_PACKETRECIEVEERR
  ) {

    return;
  }

  if (
    resultado !=
    FINGERPRINT_OK
  ) {

    return;
  }

  Serial.println();
  Serial.println(
    "Huella detectada..."
  );

  if (oledDisponible) {

    mostrarOLED(
      "SEGURENTRY",
      "Huella detectada",
      "Verificando..."
    );

  }

  resultado =
    finger.image2Tz();

  if (
    resultado !=
    FINGERPRINT_OK
  ) {

    Serial.println(
      "No se pudo procesar."
    );

    esperarSinDedo();

    mostrarPantallaPrincipal();

    return;
  }

  resultado =
    finger.fingerSearch();

  if (
    resultado ==
    FINGERPRINT_OK
  ) {

    uint16_t idEncontrado =
      finger.fingerID;

    uint16_t confianza =
      finger.confidence;

    Serial.println();
    Serial.print(
      "Huella reconocida localmente. ID: "
    );
    Serial.println(
      idEncontrado
    );

    Serial.println(
      "Consultando autorizacion en SegurEntry..."
    );

    bool autorizado =
      validarAccesoServidor(
        idEncontrado
      );

    if (autorizado) {

      accesoPermitido(
        idEncontrado,
        confianza
      );

    } else {

      accesoDenegado(
        "Usuario no autorizado por SegurEntry."
      );

    }

  } else if (
    resultado ==
    FINGERPRINT_NOTFOUND
  ) {

    accesoDenegado(
      "Huella no registrada."
    );

  } else {

    Serial.println(
      "Error buscando huella."
    );

  }

  esperarSinDedo();

  delay(300);
}


// ============================================================
// ELIMINAR HUELLA
// ============================================================

void eliminarHuella(
  uint16_t id
) {

  if (
    !sensorDisponible
  ) {

    return;
  }

  uint8_t resultado =
    finger.deleteModel(
      id
    );

  if (
    resultado ==
    FINGERPRINT_OK
  ) {

    Serial.print(
      "Huella eliminada. ID: "
    );

    Serial.println(
      id
    );

    if (oledDisponible) {

      mostrarOLED(
        "HUELLA ELIMINADA",
        "ID: " +
        String(id)
      );

      delay(1500);

      mostrarPantallaPrincipal();

    }

  } else {

    Serial.println(
      "No se pudo eliminar la huella."
    );

  }
}


// ============================================================
// STATUS
// ============================================================

void mostrarEstado() {

  Serial.println();
  Serial.println("==========================================");
  Serial.println("              SEGURENTRY");
  Serial.println("==========================================");

  Serial.print(
    "WiFi: "
  );

  if (
    WiFi.status() ==
    WL_CONNECTED
  ) {

    Serial.println(
      "ONLINE"
    );

    Serial.print(
      "IP: "
    );

    Serial.println(
      WiFi.localIP()
    );

  } else {

    Serial.println(
      "OFFLINE"
    );

  }

  Serial.print(
    "Sensor: "
  );

  if (
    sensorDisponible
  ) {

    Serial.println(
      "ONLINE"
    );

    finger.getTemplateCount();

    Serial.print(
      "Huellas registradas: "
    );

    Serial.println(
      finger.templateCount
    );

  } else {

    Serial.println(
      "OFFLINE"
    );

  }

  Serial.print(
    "OLED: "
  );

  if (
    oledDisponible
  ) {

    Serial.print(
      "ONLINE - 0x"
    );

    Serial.println(
      direccionOLED,
      HEX
    );

  } else {

    Serial.println(
      "OFFLINE"
    );

  }

  Serial.println();
}


// ============================================================
// AYUDA
// ============================================================

void mostrarAyuda() {

  Serial.println();
  Serial.println("==========================================");
  Serial.println("         COMANDOS SEGURENTRY");
  Serial.println("==========================================");

  Serial.println();

  Serial.println(
    "E 1      Registrar ID 1"
  );

  Serial.println(
    "E 2      Registrar ID 2"
  );

  Serial.println(
    "E 3      Registrar ID 3"
  );

  Serial.println();

  Serial.println(
    "D 1      Eliminar ID 1"
  );

  Serial.println();

  Serial.println(
    "STATUS   Estado del sistema"
  );

  Serial.println(
    "HELP     Mostrar ayuda"
  );

  Serial.println();
}


// ============================================================
// COMANDOS SERIAL
// ============================================================

void procesarComandos() {

  if (
    !Serial.available()
  ) {

    return;
  }

  String comando =
    Serial.readStringUntil('\n');

  comando.trim();

  comando.toUpperCase();

  if (
    comando.length() == 0
  ) {

    return;
  }

  if (
    comando.startsWith("E ")
  ) {

    int id =
      comando.substring(2).toInt();

    if (
      id <= 0
    ) {

      Serial.println(
        "ID invalido."
      );

      return;
    }

    registrarHuella(
      id
    );

    return;
  }

  if (
    comando.startsWith("D ")
  ) {

    int id =
      comando.substring(2).toInt();

    if (
      id <= 0
    ) {

      Serial.println(
        "ID invalido."
      );

      return;
    }

    eliminarHuella(
      id
    );

    return;
  }

  if (
    comando ==
    "STATUS"
  ) {

    mostrarEstado();

    return;
  }

  if (
    comando ==
    "HELP"
  ) {

    mostrarAyuda();

    return;
  }

  Serial.print(
    "Comando desconocido: "
  );

  Serial.println(
    comando
  );
}


// ============================================================
// SETUP
// ============================================================

void setup() {

  Serial.begin(
    115200
  );

  delay(
    2000
  );

  mostrarEncabezado();

  // ==========================================================
  // 1. OLED
  // ==========================================================

  iniciarOLED();


  // ==========================================================
  // 2. SENSOR DE HUELLA
  // ==========================================================

  if (
    !iniciarSensor()
  ) {

    Serial.println(
      "SegurEntry detenido por error de sensor."
    );

    return;
  }


  // ==========================================================
  // 3. WIFI
  // ==========================================================

  conectarWiFi();


  // ==========================================================
  // SISTEMA LISTO
  // ==========================================================

  estadoSistema =
    LISTO;

  Serial.println();
  Serial.println("==========================================");
  Serial.println("           SEGURENTRY LISTO");
  Serial.println("==========================================");

  Serial.println();

  Serial.println(
    "Esperando huella..."
  );

  Serial.println();

  Serial.println(
    "Escribe HELP para ver comandos."
  );

  Serial.println();

  mostrarPantallaPrincipal();
}


// ============================================================
// LOOP
// ============================================================

void loop() {

  mantenerWiFi();

  // Mantiene visible para Django que el ESP32 esta online.
  enviarHeartbeatBiometrico();

  // Consulta cada 2 segundos si la web solicito registrar una huella.
  consultarTrabajoBiometrico();

  // Se conservan los comandos manuales como respaldo.
  procesarComandos();

  // Lectura normal de huellas para control de acceso.
  buscarHuella();

  delay(
    20
  );
}