#include <WiFi.h>
#include <Arduino.h>

#include "X402Aurdino.h"
#include "X402Ble.h"

const int ledPin = 5;
const int buzzerPin = 13;

const String DEVICE_NAME = "X402 AbhinavBuilds.eth";
const String NETWORK = "base-sepolia";
const String PRICE = "1000000";
const String PAY_TO = "0x65B7d5f0108DfE6fc6548bdC818b392588496c11";
const String LOGO = "https://pbs.twimg.com/profile_images/1974193106758115328/I62W5om4_400x400.jpg";
const String BANNER = "https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?_gl=1*1ovh7xl*_ga*MTQ1MDEzNjQzMS4xNzU5NDc3MTk1*_ga_8JE65Q40S6*czE3NjExNTc4NDckbzQkZzEkdDE3NjExNTc4ODUkajIyJGwwJGgw";
const String DESCRIPTION = "This is the first device using x402 using Ble on a Microcontroller, Have some fun, to catch up visit x : @AbhinavBuilds";
const String options[] = { "LED", "Buzzer" };
int FREQUENCY = 15;  // Seconds

X402Ble* x402ble;

bool firstTransactionMade = false;

const char* ssid = "Krishna cottage B block 2nd";
const char* password = "India@123";

// const char* ssid = "Krishna cottage B Top";
// const char* password = "India@12345";

void setup() {
  pinMode(ledPin, OUTPUT);
  pinMode(buzzerPin, OUTPUT);

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
}

void loop() {
  unsigned long elapsed = x402ble->getMicrosSinceLastPayment();
  // convert to seconds
  if (elapsed / 1000000.0 <= 20.0) {  // 5 second will be auto added as it takes around 5 second to complete a payment
    bool newPayment = x402ble->getStatusAndReset();
    // If its a new payment then the options and user context might have changes else its same so save some computational power
    if (newPayment) {
      // Printing some User and Transaction info.
      Serial.println("Transaction hash:");
      Serial.println(x402ble->getLastTransactionhash());
      Serial.println("Address:");
      Serial.println(x402ble->getLastPayer());
      Serial.println("User mesage:");
      Serial.println(x402ble->getUserCustomContext());

      const std::vector<String>& userOptions = x402ble->getUserSelectedOptions();

      for (const auto& item : userOptions) {
        if (item == "Buzzer") {
          digitalWrite(buzzerPin, HIGH);
        } else if (item == "LED") {
          digitalWrite(ledPin, HIGH);
        }
      }
    }
  } else {
    digitalWrite(ledPin, LOW);
    digitalWrite(buzzerPin, LOW);
  }
  delay(100);
}

String dynamicprice(const std::vector<String>& options, const String& customContext) {
  int price = 0;
  Serial.println(customContext);
  Serial.println("Dynamic pricing...");

  for (const auto& item : options) {
    if (item == "Buzzer") {
      price += 20000;
    } else if (item == "LED") {
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
