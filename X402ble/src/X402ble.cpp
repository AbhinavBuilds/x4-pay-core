#include "X402ble.h"
#include <cstring>

// ---- Static UUIDs ----
const char* X402ble::SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const char* X402ble::TX_CHAR_UUID  = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
const char* X402ble::RX_CHAR_UUID  = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

// ---- Lifecycle ----
X402ble::X402ble(const String& name) : _device_name(name) {}

void X402ble::init() {
    NimBLEDevice::init(_device_name.c_str());
    NimBLEDevice::setDeviceName(_device_name.c_str());
    NimBLEDevice::setPower(ESP_PWR_LVL_P7);
    NimBLEDevice::setSecurityAuth(false, false, false);
    NimBLEDevice::setMTU(247);

    pServer = NimBLEDevice::createServer();

    static ServerCallbacks s_serverCb(this);
    pServer->setCallbacks(&s_serverCb);

    pService = pServer->createService(SERVICE_UUID);

    // TX (Notify + Read)
    pTxCharacteristic = pService->createCharacteristic(
        TX_CHAR_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );
    pTxCharacteristic->setValue((uint8_t*)"", 0);

    // RX (Write/WriteNR)
    pRxCharacteristic = pService->createCharacteristic(
        RX_CHAR_UUID,
        NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
    );
    static RxCallbacks s_rxCb(this);
    pRxCharacteristic->setCallbacks(&s_rxCb);
}

void X402ble::start() {
    if (!pService) {
        Serial.println("X402ble::start() called before init(); aborting.");
        return;
    }
    // If already advertising, do nothing
    if (pAdvertising && pAdvertising->isAdvertising()) return;

    pService->start();

    pAdvertising = NimBLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanFilter(false, false);
    // Optional: add name to scan response (works on all versions)
    // NimBLEAdvertisementData scanData; scanData.setName(_device_name.c_str());
    // pAdvertising->setScanResponseData(scanData);

    pAdvertising->start();
    Serial.println("BLE advertising started. Waiting for a client to connect...");
}

void X402ble::stop() {
    // Older NimBLE has no NimBLEService::stop(); just stop advertising.
    if (pAdvertising && pAdvertising->isAdvertising()) pAdvertising->stop();
}

bool X402ble::notify(const std::string& data) {
    if (!pTxCharacteristic) return false;
    // Some NimBLE versions don’t expose getSubscribedCount(); notify is safe regardless.
    pTxCharacteristic->setValue(reinterpret_cast<const uint8_t*>(data.data()), data.size());
    return pTxCharacteristic->notify();
}

void X402ble::handleRxWrite(const std::string& incoming) {
    if (incoming.empty()) return;
    std::string resp = onRequest_ ? onRequest_(incoming)
                                  : (std::string("echo: ") + incoming);
    if (!resp.empty()) notify(resp);
}

// ---- Accessors ----
NimBLEService*        X402ble::service()        const { return pService; }
NimBLECharacteristic* X402ble::tx()             const { return pTxCharacteristic; }
NimBLEAdvertising*    X402ble::getAdvertising() const { return pAdvertising; }

// ---- Server callbacks ----
void X402ble::ServerCallbacks::onConnect(NimBLEServer* /*srv*/) {
    Serial.println("Client connected");
    // Keep advertising to allow multiple centrals
    NimBLEDevice::startAdvertising();
}

void X402ble::ServerCallbacks::onDisconnect(NimBLEServer* /*srv*/) {
    Serial.println("Client disconnected — restarting advertising");
    if (_owner && _owner->pAdvertising) {
        delay(500);
        _owner->pAdvertising->start();
        Serial.println("Advertising restarted");
    }
}

// ---- RX callbacks ----
void X402ble::RxCallbacks::onWrite(NimBLECharacteristic* ch) {
    if (!_owner || !ch) return;
    std::string incoming = ch->getValue();
    _owner->handleRxWrite(incoming);
}
