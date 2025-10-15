#ifndef X402BLE_H
#define X402BLE_H

#include <Arduino.h>
#include <NimBLEDevice.h>
#include <functional>
#include <string>

// Some NimBLE builds expose this C struct; forward-declare for compatibility
struct ble_gap_conn_desc;

class X402ble {
public:
  explicit X402ble(const String& device_name);

  void init();   // create server/service/chars (no advertising yet)
  void start();  // start service + advertising
  bool notify(const std::string &data);
  bool notifyLarge(const std::string &data);



  // Register a request->response handler (called on RX writes)
  void setRequestHandler(std::function<std::string(const std::string&)> fn) {
    onRequest = std::move(fn);
  }

private:
  // Nordic UART-style UUIDs
  static const char* SERVICE_UUID; // 6e400001-b5a3-f393-e0a9-e50e24dcca9e
  static const char* TX_CHAR_UUID; // 6e400003-b5a3-f393-e0a9-e50e24dcca9e (Notify)
  static const char* RX_CHAR_UUID; // 6e400002-b5a3-f393-e0a9-e50e24dcca9e (Write)

  String _device_name;

  NimBLEServer*         pServer{nullptr};
  NimBLEService*        pService{nullptr};
  NimBLECharacteristic* pTx{nullptr};
  NimBLECharacteristic* pRx{nullptr};
  NimBLEAdvertising*    pAdv{nullptr};

  std::function<std::string(const std::string&)> onRequest; // user handler

  // Chunked payload assembly state
  String _assembledPayload;
  bool _assemblyInProgress{false};

  // Helper methods
  void handleChunkedPayment(const std::string& req);
  void processCompletePayload(const String& payload);

  // ---- Callbacks (minimal, version-agnostic) ----
  class ServerCb : public NimBLEServerCallbacks {
  public:
    explicit ServerCb(X402ble* owner) : _owner(owner) {}
    void onConnect(NimBLEServer* srv);
    void onDisconnect(NimBLEServer* srv);
    // Compatibility overloads found in some NimBLE versions:
    void onConnect(NimBLEServer* srv, NimBLEConnInfo& info)      { onConnect(srv); }
    void onDisconnect(NimBLEServer* srv, NimBLEConnInfo& info)   { onDisconnect(srv); }
    void onConnect(NimBLEServer* srv, ble_gap_conn_desc* desc)   { onConnect(srv); }
    void onDisconnect(NimBLEServer* srv, ble_gap_conn_desc* desc){ onDisconnect(srv); }
  private:
    X402ble* _owner;
  };

  class RxCb : public NimBLECharacteristicCallbacks {
  public:
    explicit RxCb(X402ble* owner) : _owner(owner) {}
    void onWrite(NimBLECharacteristic* ch);
    // Some builds expose this overload:
    void onWrite(NimBLECharacteristic* ch, NimBLEConnInfo& /*info*/) { onWrite(ch); }
  private:
    X402ble* _owner;
  };
};

#endif // X402BLE_H
