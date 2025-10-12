#include <NimBLEDevice.h>

#define DEV_NAME     "ESP32 BLE Echo"
#define SERVICE_UUID "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define RX_CHAR_UUID "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define TX_CHAR_UUID "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

NimBLECharacteristic* txChar = nullptr;
NimBLEAdvertising* pAdvertising = nullptr;

class RxCB : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c) {
    std::string v = c->getValue();
    if (v.empty()) return;
    Serial.print("Got: "); Serial.println(v.c_str());
    // Echo back on TX characteristic
    txChar->setValue((uint8_t*)v.data(), v.size());
    txChar->notify();
  }
};

class SrvCB : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* s) {
    Serial.println("Central connected");
    NimBLEDevice::startAdvertising();  // keeps adverts going for other centrals
  }
  void onDisconnect(NimBLEServer* s) {
    Serial.println("Central disconnected -> restarting advertising");
    if (pAdvertising != nullptr) {
      delay(500);  // Give BLE stack time to clean up
      pAdvertising->start();
      Serial.println("Advertising restarted");
    }
  }
  void onMTUChange(uint16_t mtu, ble_gap_conn_desc*) {
    Serial.print("MTU="); Serial.println(mtu);
  }
};

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  NimBLEDevice::init(DEV_NAME);
  NimBLEDevice::setPower(ESP_PWR_LVL_P9);
  NimBLEDevice::setSecurityAuth(false,false,false); // open
  NimBLEDevice::setMTU(512);  // Set MTU size

  auto server = NimBLEDevice::createServer();
  server->setCallbacks(new SrvCB());

  auto svc = server->createService(SERVICE_UUID);
  
  // RX characteristic (write from central)
  auto rxChar = svc->createCharacteristic(
        RX_CHAR_UUID,
        NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
  rxChar->setCallbacks(new RxCB());
  
  // TX characteristic (notify to central)
  txChar = svc->createCharacteristic(
        TX_CHAR_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  
  svc->start();

  pAdvertising = NimBLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanFilter(false, false);  // Don't filter scan requests
  pAdvertising->start();

  Serial.println("ESP32 BLE Echo ready: write -> immediate notify echo.");
}

void loop() { 
  // Check advertising status and restart if needed
  if (pAdvertising != nullptr && !pAdvertising->isAdvertising()) {
    Serial.println("Advertising stopped unexpectedly, restarting...");
    pAdvertising->start();
  }
  delay(1000);
}
