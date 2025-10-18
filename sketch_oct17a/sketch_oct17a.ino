#include <WiFi.h>
#include <Arduino.h>

#include "X402Aurdino.h"
#include "X402Ble.h"

const String DEVICE_NAME = "X402-Test-X402";                        
const String NETWORK = "base-sepolia";                              
const String PRICE = "1000000";                                     
const String PAY_TO = "0xa78eD39F695615315458Bb066ac9a5F28Dfd65FE"; 
const String LOGO = "https://www.shutterstock.com/image-vector/aave-crypto-currency-themed-banner-260nw-2083945819.jpg";
const String BANNER = "https://www.shutterstock.com/image-illustration/ethereum-eth-tokens-pattern-forming-260nw-2607772913.jpg";
const String DESCRIPTION = "This is the first device using x402-Aurdino-Ble";
const String colors[] = { "red", "green", "blue", "orange", "neon" };

X402Ble* x402ble;

const char* ssid = "Krishna cottage B block 2nd";
const char* password = "India@123";

void setup() {
  Serial.begin(9600);
  delay(300);
  connectWiFi();

  x402ble = new X402Ble(
    DEVICE_NAME,  // Device name
    PRICE,        // Price
    PAY_TO,       // Payment address
    NETWORK,      // Network
    LOGO,
    DESCRIPTION,
    BANNER);

  x402ble->setDynamicPriceCallback(dynamicprice);
  x402ble->setOnPay(onPaymentReceived);
  x402ble->enableRecuring(60);
  x402ble->enableOptions(colors, 5);
  x402ble->allowCustomised();

  x402ble->begin();
}

void loop() {
  delay(1000);
  bool status = x402ble->getStatusAndReset();

  unsigned long elapsed = x402ble->getMicrosSinceLastPayment();
  if (elapsed == 0) {
  } else {
    // Or convert to seconds
    Serial.print("That's ");
    Serial.print(elapsed / 1000000.0);
    Serial.println(" seconds ago");

    Serial.println(x402ble->getLastPaid());
    Serial.println(x402ble->getLastTransactionhash());
    Serial.println(x402ble->getLastPayer());
    Serial.println(x402ble->getUserCustomContext());

    const std::vector<String>& options = x402ble->getUserSelectedOptions();
    if (options.empty()) {
      Serial.println("No options selected");
    } else {
      Serial.println("Selected options:");
      for (const String& opt : options) {
        Serial.print("  - ");
        Serial.println(opt);
      }
    }
  }
}

String dynamicprice  (const std::vector<String>& options, const String& customContext) {
  int price = 1000;
  Serial.println(customContext);
  Serial.println("Dynamic pricing...");
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
