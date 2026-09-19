/*
 * AIoT Smart Classroom — ESP32 Physical LED Indicator Client
 *
 * Connects to WiFi, subscribes to MQTT topic `classroom/{CLASSROOM_ID}/led`,
 * and drives an RGB LED (or individual Present/Late/Unknown LEDs):
 *   - Green flash: Present (on time)
 *   - Yellow flash: Late
 *   - Red flash: Unknown / Rejected / Spoof
 *
 * Hardware:
 *   - ESP32 NodeMCU / DevKit V1
 *   - Common Cathode RGB LED (or 3 distinct LEDs with 220-330 ohm resistors)
 *     - Pin 18: Green
 *     - Pin 19: Red
 *     - Pin 21: Blue (used for Yellow = Red + Green)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ── Configuration ─────────────────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* MQTT_BROKER   = "192.168.1.100";  // Backend IP
const int   MQTT_PORT     = 1883;
const int   CLASSROOM_ID  = 1;                 // Target classroom ID

const char* MQTT_TOPIC    = "classroom/1/led"; // Subscribed topic

// Pin Definitions
const int PIN_RED   = 19;
const int PIN_GREEN = 18;
const int PIN_BLUE  = 21;

WiFiClient espClient;
PubSubClient client(espClient);

void setLED(bool r, bool g, bool b) {
  digitalWrite(PIN_RED, r ? HIGH : LOW);
  digitalWrite(PIN_GREEN, g ? HIGH : LOW);
  digitalWrite(PIN_BLUE, b ? HIGH : LOW);
}

void flashColor(const char* state) {
  if (strcmp(state, "present") == 0) {
    // Green flash
    setLED(false, true, false);
    delay(1200);
  } else if (strcmp(state, "late") == 0) {
    // Yellow flash (Red + Green)
    setLED(true, true, false);
    delay(1200);
  } else if (strcmp(state, "unknown") == 0) {
    // Red flash
    setLED(true, false, false);
    delay(1200);
  }
  // Return to Idle (off)
  setLED(false, false, false);
}

void mqttCallback(char* topic, byte* message, unsigned int length) {
  String messageStr;
  for (int i = 0; i < length; i++) {
    messageStr += (char)message[i];
  }

  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, messageStr);
  if (error) {
    Serial.print("JSON parse error: ");
    Serial.println(error.c_str());
    return;
  }

  const char* state = doc["state"];
  const char* student = doc["student"];
  int classroom = doc["classroom_id"];

  Serial.printf("[LED Event] Classroom: %d, Student: %s, State: %s\n", classroom, student, state);
  flashColor(state);
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_RED, OUTPUT);
  pinMode(PIN_GREEN, OUTPUT);
  pinMode(PIN_BLUE, OUTPUT);
  setLED(false, false, false);

  // WiFi Connection
  Serial.printf("Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected! IP: " + WiFi.localIP().toString());

  // MQTT Connection
  client.setServer(MQTT_BROKER, MQTT_PORT);
  client.setCallback(mqttCallback);
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP32_Classroom_" + String(CLASSROOM_ID);
    if (client.connect(clientId.c_str())) {
      Serial.println("connected!");
      client.subscribe(MQTT_TOPIC);
      Serial.printf("Subscribed to %s\n", MQTT_TOPIC);
    } else {
      Serial.printf("failed, rc=%d. Retrying in 5 seconds...\n", client.state());
      delay(5000);
    }
  }
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
}
