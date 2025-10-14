#ifndef X402BLE_H
#define X402BLE_H

#include <Arduino.h>
#include <NimBLEDevice.h>
#include <functional>

struct ble_gap_conn_desc;
class NimBLEConnInfo;

class X402ble {
public:
    explicit X402ble(const String& name);

    void init();   // create server/service/chars (no advertising)
    void start();  // start service + advertising (idempotent)
    void stop();   // stop advertising (portable)

    // Send data via TX Notify
    bool notify(const std::string& data);

    // User-supplied handler: RX payload -> response to send on TX
    void setRequestHandler(std::function<std::string(const std::string&)> fn) {
        onRequest_ = std::move(fn);
    }

    // Accessors
    NimBLEService*        service()        const;
    NimBLECharacteristic* tx()             const;
    NimBLEAdvertising*    getAdvertising() const;

    // Called by RX callbacks
    void handleRxWrite(const std::string& incoming);

    // UUIDs
    static const char* SERVICE_UUID;   // 6e400001-b5a3-f393-e0a9-e50e24dcca9e
    static const char* TX_CHAR_UUID;   // 6e400003-b5a3-f393-e0a9-e50e24dcca9e
    static const char* RX_CHAR_UUID;   // 6e400002-b5a3-f393-e0a9-e50e24dcca9e

private:
    String _device_name;

    NimBLEServer*         pServer{nullptr};
    NimBLEService*        pService{nullptr};
    NimBLECharacteristic* pTxCharacteristic{nullptr};
    NimBLECharacteristic* pRxCharacteristic{nullptr};
    NimBLEAdvertising*    pAdvertising{nullptr};

    std::function<std::string(const std::string&)> onRequest_{};

    // ---- Callbacks ----
    class ServerCallbacks : public NimBLEServerCallbacks {
    public:
        explicit ServerCallbacks(X402ble* owner) : _owner(owner) {}
        void onConnect(NimBLEServer* srv);
        void onDisconnect(NimBLEServer* srv);
        // Compatibility overloads
        void onConnect(NimBLEServer* srv, NimBLEConnInfo& info)       { onConnect(srv); }
        void onDisconnect(NimBLEServer* srv, NimBLEConnInfo& info)    { onDisconnect(srv); }
        void onConnect(NimBLEServer* srv, ble_gap_conn_desc* desc)    { onConnect(srv); }
        void onDisconnect(NimBLEServer* srv, ble_gap_conn_desc* desc) { onDisconnect(srv); }
    private:
        X402ble* _owner;
    };

    class RxCallbacks : public NimBLECharacteristicCallbacks {
    public:
        explicit RxCallbacks(X402ble* owner) : _owner(owner) {}
        void onWrite(NimBLECharacteristic* ch);
        void onWrite(NimBLECharacteristic* ch, NimBLEConnInfo& /*info*/) { onWrite(ch); }
    private:
        X402ble* _owner;
    };
};

#endif // X402BLE_H
