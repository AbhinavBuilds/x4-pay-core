#ifndef SERVERCALLBACKS_H
#define SERVERCALLBACKS_H

#include <Arduino.h>
#include <NimBLEDevice.h>

// Forward declaration for pAdvertising
extern NimBLEAdvertising* pAdvertising;

class ServerCallbacks : public NimBLEServerCallbacks
{
public:
    void onConnect(NimBLEServer* /*srv*/);
    void onDisconnect(NimBLEServer* /*srv*/);

    // Compatibility overloads (some NimBLE versions use these)
    void onConnect(NimBLEServer* s, NimBLEConnInfo& i);
    void onDisconnect(NimBLEServer* s, NimBLEConnInfo& i);
    void onConnect(NimBLEServer* s, ble_gap_conn_desc* d);
    void onDisconnect(NimBLEServer* s, ble_gap_conn_desc* d);
};

#endif // SERVERCALLBACKS_H
