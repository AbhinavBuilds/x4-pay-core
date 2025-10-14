#include "customized_cpp.h"

// WiFi credentials - modify these for your network
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

X402Client client;

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("ESP32 X402 Client Starting...");
    
    // Initialize WiFi
    if (!client.initWiFi(ssid, password)) {
        Serial.println("Failed to connect to WiFi. Check your credentials.");
        return;
    }
    
    // Example signed payload (empty for testing)
    std::string decodedSignedPayload = "";
    
    // Run the X402 client
    client.run(decodedSignedPayload);
}

void loop() {
    // Keep the program running
    delay(10000);
    
    // Optional: You can add periodic payment checks here
    // client.run();
}