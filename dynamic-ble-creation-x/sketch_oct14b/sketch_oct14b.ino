#include <Arduino.h>
#include "X402ble.h"

X402ble ble("X402 Autodiscovery");

void setup() {
  Serial.begin(9600);
  delay(300);

  ble.init();

  // Optional: request -> response logic
  ble.setRequestHandler([](const std::string& req){
    return std::string("ACK: ") + req;
  });

  ble.start();
}

void loop() {}
