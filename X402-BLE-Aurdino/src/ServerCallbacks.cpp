#include "ServerCallbacks.h"

// Global pointer to advertising (defined in X402Ble.cpp)
NimBLEAdvertising *pAdvertising = nullptr;

void ServerCallbacks::onConnect(NimBLEServer * /*srv*/)
{
    Serial.println("Client connected");
    // keep advertising even when connected (for multiple centrals)
    NimBLEDevice::startAdvertising();
}

void ServerCallbacks::onDisconnect(NimBLEServer * /*srv*/)
{
    Serial.println("Client disconnected — restarting advertising");
    if (pAdvertising)
    {
        delay(500); // let BLE stack settle
        pAdvertising->start();
        Serial.println("Advertising restarted");
    }
}

// Compatibility overloads (some NimBLE versions use these)
void ServerCallbacks::onConnect(NimBLEServer *s, NimBLEConnInfo &i)
{
    onConnect(s);
}

void ServerCallbacks::onDisconnect(NimBLEServer *s, NimBLEConnInfo &i)
{
    onDisconnect(s);
}

void ServerCallbacks::onConnect(NimBLEServer *s, ble_gap_conn_desc *d)
{
    onConnect(s);
}

void ServerCallbacks::onDisconnect(NimBLEServer *s, ble_gap_conn_desc *d)
{
    onDisconnect(s);
}
