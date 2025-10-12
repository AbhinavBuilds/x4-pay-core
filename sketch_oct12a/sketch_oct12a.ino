// File: ESP32_BLE_Echo_NimBLE.ino
#include <NimBLEDevice.h>

#define DEVICE_NAME   "ESP32 BLE Echo"
#define SERVICE_UUID  "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define RX_UUID       "6e400002-b5a3-f393-e0a9-e50e24dcca9e" // Write / WriteNR
#define TX_UUID       "6e400003-b5a3-f393-e0a9-e50e24dcca9e" // Notify

NimBLECharacteristic* gTxChar = nullptr;

void sendNotify(const std::string& s) {
  if (!gTxChar) return;
  gTxChar->setValue((const uint8_t*)s.data(), s.size());
  gTxChar->notify();
}

class RxCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c) {
    std::string v = c->getValue();
    if (v.empty()) return;
    sendNotify(std::string("pong: ") + v);
  }
};

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* s) {
    NimBLEDevice::startAdvertising();
  }
  void onMTUChange(uint16_t MTU, ble_gap_conn_desc* desc) {
    Serial.print("MTU="); Serial.println(MTU);
  }
};

void setup() {
  Serial.begin(115200);

  NimBLEDevice::init(DEVICE_NAME);
  NimBLEDevice::setPower(ESP_PWR_LVL_P9);

  // Open/no-security (either omit this line, or use the 3-arg form below)
  NimBLEDevice::setSecurityAuth(false, false, false); // bonding=false, MITM=false, secure-connections=false
  // Optional: explicitly set no I/O for pairing flows if you later enable security
  // NimBLEDevice::setSecurityIOCap(BLE_HS_IO_NO_INPUT_OUTPUT);

  auto server = NimBLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  auto svc = server->createService(SERVICE_UUID);

  gTxChar = svc->createCharacteristic(TX_UUID, NIMBLE_PROPERTY::NOTIFY);

  auto rx = svc->createCharacteristic(
      RX_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
  rx->setCallbacks(new RxCallbacks());

  svc->start();

  auto adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->start();

  Serial.println("BLE Echo ready: write to RX, watch TX notifications.");
}

void loop() {
  static uint32_t last = 0;
  if (millis() - last > 5000) {
    last = millis();
    sendNotify("heartbeat");
  }
  delay(10);
}
