#include "X402Ble.h"
#include "ServerCallbacks.h"
#include "RxCallbacks.h"
#include <algorithm>
#include <cctype>

const char *X402Ble::SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const char *X402Ble::TX_CHAR_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const char *X402Ble::RX_CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

X402Ble::X402Ble(const String &device_name,
                 const String &price,
                 const String &payTo,
                 const String &network,
                 const String &logo,
                 const String &description,
                 const String &banner)
        : device_name_(device_name), network_(network), price_(price), payTo_(payTo),
            logo_(logo), description_(description), banner_(banner),
            frequency_(0), options_(), allowCustomContent_(false),
            pServer(nullptr), pService(nullptr), pTxCharacteristic(nullptr), pRxCharacteristic(nullptr)
{
    paymentRequirements = buildDefaultPaymentRementsJson(
        network_,             // network
        payTo_,               // payTo address
        price_,               // amount (1 USDC)
        logo_,                // logo
        description_          // description
        // banner is not used in paymentRequirements, but available as member
    );
}

// Set recurring frequency (0 clears/means unset)
void X402Ble::enableRecuring(uint32_t frequency)
{
    frequency_ = frequency;
}


// Set options from C-style array (Arduino friendly)
void X402Ble::enableOptions(const String options[], size_t count)
{
    options_.clear();
    options_.reserve(count);
    for (size_t i = 0; i < count; ++i)
    {
        options_.push_back(options[i]);
    }
}

// Allow custom content
void X402Ble::allowCustomised()
{
    allowCustomContent_ = true;
}

void X402Ble::begin()
{
    NimBLEDevice::init(device_name_.c_str());
    NimBLEDevice::setDeviceName(device_name_.c_str());
    NimBLEDevice::setPower(ESP_PWR_LVL_P7);
    NimBLEDevice::setSecurityAuth(false, false, false);
    NimBLEDevice::setMTU(150);

    pServer = NimBLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());

    pService = pServer->createService(SERVICE_UUID);

    // TX (notify)
    pTxCharacteristic = pService->createCharacteristic(
        TX_CHAR_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
    if (!pTxCharacteristic)
    {
        Serial.println("[X402Ble] Failed to create TX characteristic");
        return;
    }
    pTxCharacteristic->setValue((uint8_t *)"", 0);
    

    // RX (write / write without response)
    pRxCharacteristic = pService->createCharacteristic(
        RX_CHAR_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
    if (!pRxCharacteristic)
    {
        Serial.println("[X402Ble] Failed to create RX characteristic");
        return;
    }
    // Pass TX characteristic and X402Ble instance so RxCallbacks can send notifications and access config
    pRxCharacteristic->setCallbacks(new RxCallbacks(pTxCharacteristic, this));

    if (!pService)
    {
        Serial.println("[X402Ble] Failed to create service");
        return;
    }

    pService->start();

    pAdvertising = NimBLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->start();
}