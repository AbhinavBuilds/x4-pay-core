#include <WiFi.h>
#include <Arduino.h>
#include <ESP32Servo.h>

#include "X402Aurdino.h"
#include "X402Ble.h"

// x4Pay Configs
const String DEVICE_NAME = "X402 AbhinavBuilds.eth";
const String NETWORK = "base-sepolia";
const String PRICE = "1000000";
const String PAY_TO = "0x65B7d5f0108DfE6fc6548bdC818b392588496c11";
const String LOGO = "https://pbs.twimg.com/profile_images/1974193106758115328/I62W5om4_400x400.jpg";
const String BANNER = "https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?_gl=1*1ovh7xl*_ga*MTQ1MDEzNjQzMS4xNzU5NDc3MTk1*_ga_8JE65Q40S6*czE3NjExNTc4NDckbzQkZzEkdDE3NjExNTc4ODUkajIyJGwwJGgw";
const String DESCRIPTION = "This is the first device using x402 using Ble on a Microcontroller, Have some fun, to catch up visit x : @AbhinavBuilds";
const String options[] = { "Switch 1", "Switch 2" };
int FREQUENCY = 15;  // Seconds

X402Ble* x402ble;

const char* ssid = "Krishna cottage B block 2nd";
const char* password = "India@123";


// Servo Configs
// s1           s2
// --------------------
// m1 (13)      m3 (14)
// m2 (27)      m4 (12)
Servo servo_s1_m1;
Servo servo_s1_m2;

Servo servo_s2_m3;
Servo servo_s2_m4;


int s1_m1 = 13;
int s1_m2 = 27;

int s2_m3 = 14;
int s2_m4 = 12;

void setup() {
  Serial.begin(9600);
  delay(300);
  connectWiFi();

  x402ble = new X402Ble(
    DEVICE_NAME,
    PRICE,
    PAY_TO,
    NETWORK,
    LOGO,
    DESCRIPTION,
    BANNER);

  x402ble->setDynamicPriceCallback(dynamicprice);
  x402ble->setOnPay(onPaymentReceived);
  x402ble->enableRecuring(15);
  x402ble->enableOptions(options, 2);
  x402ble->allowCustomised();

  x402ble->begin();

  turn_S1_OFF();
  turn_S2_OFF();
}

void loop() {
  bool newPayment = x402ble->getStatusAndReset();
  if (newPayment) {
    while (true) {
      unsigned long elapsed = x402ble->getMicrosSinceLastPayment();
      // convert to seconds
      if (elapsed / 1000000.0 <= 25.0) {
        // If its a new payment then the options and user context might have changes else its same so save some computational power

        Serial.println("Transaction hash:");
        Serial.println(x402ble->getLastTransactionhash());
        Serial.println("Address:");
        Serial.println(x402ble->getLastPayer());
        Serial.println("User mesage:");
        Serial.println(x402ble->getUserCustomContext());
        const std::vector<String>& userOptions = x402ble->getUserSelectedOptions();
        for (const auto& item : userOptions) {
          if (item == "Switch 1") {
            turn_S1_ON();
          } else if (item == "Switch 2") {
            turn_S2_ON();
          }
        }
      } else {
        turn_S1_OFF();
        turn_S2_OFF();
      }
    }
  }
}

String dynamicprice(const std::vector<String>& options, const String& customContext) {
  int price = 0;
  Serial.println(customContext);
  Serial.println("Dynamic pricing...");

  for (const auto& item : options) {
    if (item == "Switch 1") {
      price += 20000;
    } else if (item == "Switch 2") {
      price += 10000;
    }
  }

  return String(price);
}

void onPaymentReceived(const std::vector<String>& options, const String& customContext) {
  Serial.println("💰 Payment received!");

  Serial.print("Custom context: ");
  Serial.println(customContext);

  Serial.print("Options selected: ");
  Serial.println(options.size());
  for (size_t i = 0; i < options.size(); i++) {
    Serial.print("  - ");
    Serial.println(options[i]);
  }
}

// TESTED OK
void turn_S1_ON() {
  servo_s1_m2.attach(s1_m2);
  delay(1000);
  servo_s1_m2.write(20);
  delay(1000);
  servo_s1_m2.write(180);
  delay(1000);
  servo_s1_m2.write(20);
  delay(2000);
  servo_s1_m2.detach();
}

// TESTED OK
void turn_S1_OFF() {
  servo_s1_m1.attach(s1_m1);
  delay(1000);
  servo_s1_m1.write(180);
  delay(1000);
  servo_s1_m1.write(0);
  delay(1000);
  servo_s1_m1.write(130);
  delay(2000);
  servo_s1_m1.detach();
}

// TESTED OK
void turn_S2_ON() {
  servo_s2_m3.attach(s2_m3);
  delay(1000);
  servo_s2_m3.write(360);
  delay(000);
  servo_s2_m3.write(0);
  delay(1000);
  servo_s2_m3.write(360);
  delay(1000);
  servo_s2_m3.detach();
}

// TESTED OK
void turn_S2_OFF() {
  servo_s2_m4.attach(s2_m4);
  delay(1000);
  servo_s2_m4.write(0);
  delay(1000);
  servo_s2_m4.write(180);
  delay(1000);
  servo_s2_m4.write(0);
  delay(2000);
  servo_s2_m4.detach();
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println(" Connected!");
  Serial.println("IP: " + WiFi.localIP().toString());
  Serial.println();
}