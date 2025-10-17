#ifndef RX_CALLBACKS_H
#define RX_CALLBACKS_H

#include <Arduino.h>
#include <NimBLEDevice.h>


class X402Ble; // Forward declaration

class RxCallbacks : public NimBLECharacteristicCallbacks {
public:
    RxCallbacks(NimBLECharacteristic* txChar, X402Ble* ble) : pTxChar(txChar), pBle(ble) {}

    void onWrite(NimBLECharacteristic *ch);
    // Compatibility overload (some NimBLE versions provide connection info)
    void onWrite(NimBLECharacteristic* ch, NimBLEConnInfo& /*info*/) { onWrite(ch); }

private:
    NimBLECharacteristic* pTxChar;  // TX characteristic for sending responses
    X402Ble* pBle;                   // Pointer to X402Ble instance
};

#endif // RX_CALLBACKS_H
