#include <WiFi.h>
#include <Arduino.h>

#include "X402Aurdino.h"
#include "X402Ble.h"

const String DEVICE_NAME = "X402-Test-X402";                         // BLE device name (will be visible to clients)
const String NETWORK = "base-sepolia";                               // Blockchain network (e.g., "base-sepolia", "ethereum-mainnet")
const String PRICE = "1000000";                                      // Price in smallest unit (e.g., 1 USDC = 1000000)
const String PAY_TO = "0xa78eD39F695615315458Bb066ac9a5F28Dfd65FE";  // Your payment address
const String LOGO = "https://www.shutterstock.com/image-vector/aave-crypto-currency-themed-banner-260nw-2083945819.jpg";
const String BANNER = "https://www.shutterstock.com/image-illustration/ethereum-eth-tokens-pattern-forming-260nw-2607772913.jpg";
const String DESCRIPTION = "This is the first device using x402-Aurdino-Ble";
const String colors[] = { "red", "green", "blue", "orange", "neon" };


// Create X402Ble instance
X402Ble* x402ble;

// WiFi credentials - UPDATE THESE!
const char* ssid = "Krishna cottage B block 2nd";
const char* password = "India@123";

// const char* ssid = "Azure";
// const char* password = "hello123";

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

  
  x402ble->enableRecuring(60);
  x402ble->enableOptions(colors, 5);
  x402ble->allowCustomised();

  Serial.println(x402ble->paymentRequirements);
  Serial.println("Starting BLE service...");
  x402ble->begin();

  Serial.println("BLE service started successfully!");
}

void loop() {}

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


void runPaymentExample() {
  // Step 1: Build payment requirements using manual JSON
  Serial.println("Step 1: Building payment requirements...");
  String requirements = buildDefaultPaymentRementsJson(
    "base-sepolia",                                // network
    "0x1234567890123456789012345678901234567890",  // payTo address
    "1000000",                                     // amount (1 USDC)
    "https://api.example.com/resource/123",        // resource URL
    "Payment for premium API access"               // description
  );

  Serial.println("Requirements JSON created:");
  Serial.println(requirements);
  Serial.println();
}


// #include "X402ble.h"
// X402ble ble("X402 Autodiscovery", "base-sepolia", "1000000");
// ble.init();
// ble.start();