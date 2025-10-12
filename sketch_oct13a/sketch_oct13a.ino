#include "BluetoothSerial.h"

BluetoothSerial SerialBT;

void setup() {
  Serial.begin(115200); // For debugging only (optional)
  SerialBT.begin("ESP32_BT"); // Bluetooth device name
  Serial.println("Bluetooth Started! Pair with ESP32_BT");
}

void loop() {
  if (SerialBT.available()) {
    String incoming = SerialBT.readStringUntil('\n'); // Read until newline
    String response = "Message received: " + incoming;
    SerialBT.println(response); // Send response
    Serial.print("Received: ");
    Serial.println(incoming);
    Serial.print("Sent: ");
    Serial.println(response);
  }
  delay(20);
}
