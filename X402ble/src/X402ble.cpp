#include "X402ble.h"
#include <algorithm> // for std::transform, std::equal
#include <cctype>    // for std::tolower
#include "X402Payment.h"

// ---- UUIDs ----
const char *X402ble::SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const char *X402ble::TX_CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
const char *X402ble::RX_CHAR_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

static const char *TO_ADDR = "0xa78eD39F695615315458Bb066ac9a5F28Dfd65FE";
static const char *AMOUNT = "1000000";
static const char *NETWORK = "base-sepolia";

// ---- Class ----
X402ble::X402ble(const String &device_name) : _device_name(device_name) {}

void X402ble::init()
{
    NimBLEDevice::init(_device_name.c_str());
    NimBLEDevice::setDeviceName(_device_name.c_str());
    NimBLEDevice::setPower(ESP_PWR_LVL_P7);
    NimBLEDevice::setSecurityAuth(false, false, false); 
    NimBLEDevice::setMTU(1000);

    pServer = NimBLEDevice::createServer();
    static ServerCb s_cb(this); // static lifetime
    pServer->setCallbacks(&s_cb);

    pService = pServer->createService(SERVICE_UUID);

    // TX (notify)
    pTx = pService->createCharacteristic(
        TX_CHAR_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
    pTx->setValue((uint8_t *)"", 0);

    // RX (write / write without response)
    pRx = pService->createCharacteristic(
        RX_CHAR_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
    static RxCb rx_cb(this);
    pRx->setCallbacks(&rx_cb);

    // Do not start service/advertising here; call start()
}

void X402ble::start()
{
    if (!pService)
    {
        Serial.println("X402ble: call init() first");
        return;
    }
    if (pAdv && pAdv->isAdvertising())
        return; // already started

    pService->start();

    pAdv = NimBLEDevice::getAdvertising();
    pAdv->addServiceUUID(SERVICE_UUID);
    pAdv->setScanFilter(false, false); // helps some macOS flows
    // If you want name in scan response (optional):
    // NimBLEAdvertisementData scan; scan.setName(_device_name.c_str());
    // pAdv->setScanResponseData(scan);

    pAdv->start();
    Serial.println("BLE advertising started.");
}

// ---- Callbacks ----
void X402ble::ServerCb::onConnect(NimBLEServer * /*srv*/)
{
    Serial.println("Client connected");
    // keep advertising to allow multiple centrals
    NimBLEDevice::startAdvertising();
}

void X402ble::ServerCb::onDisconnect(NimBLEServer * /*srv*/)
{
    Serial.println("Client disconnected — restarting advertising");
    if (_owner && _owner->pAdv)
    {
        delay(500);
        _owner->pAdv->start();
        Serial.println("Advertising restarted");
    }
}

void X402ble::RxCb::onWrite(NimBLECharacteristic *ch)
{
    std::string req = ch->getValue();
    if (req.empty())
        return;

    std::string resp;

    // startsWithIgnoreCase helper expects an Arduino String; convert
    String reqStr(req.c_str());
    if (startsWithIgnoreCase(reqStr, "x-payment"))
    {
        // Handle chunked payment protocol
        _owner->handleChunkedPayment(req);
        return; // Don't send immediate response for chunked payments
    }
    else
    {
        // --- Not a payment: return payment requirements JSON ---
        AssetInfo asset;
        String err;
        if (!getAssetForNetwork(NETWORK, asset, err))
        {
            // err is Arduino String; convert to std::string for resp
            resp = std::string("ERR: ") + std::string(err.c_str());
        }
        else
        {
            PaymentRequirements reqs;
            reqs.scheme = "exact";
            reqs.network = NETWORK;
            reqs.maxAmountRequired = AMOUNT;
            reqs.resource = "https://example.com/resource";
            reqs.description = "Test resource";
            reqs.mimeType = "application/json";
            reqs.payTo = TO_ADDR;
            reqs.maxTimeoutSeconds = 300;
            reqs.asset = asset.usdcAddress;
            reqs.extra_name = asset.usdcName;
            reqs.extra_version = "2";

            // Get a compact pipe-separated string from the helper: network|maxAmountRequired|payTo
            String combined = extractPaymentFields(reqs);
            resp = std::string(combined.c_str());
        }
    }

    // --- Send response back over TX ---
    if (_owner->pTx)
    {
        _owner->pTx->setValue((const uint8_t *)resp.data(), resp.size());
        _owner->pTx->notify();
    }
}

// ---- Chunked Payment Assembly ----
void X402ble::handleChunkedPayment(const std::string& req) {
    String reqStr(req.c_str());
    
    if (reqStr.startsWith("X-PAYMENT:START")) {
        // Start of new chunked payload
        _assemblyInProgress = true;
        _assembledPayload = reqStr.substring(15); // Remove "X-PAYMENT:START"
        Serial.println("[payment] Started assembly");
    }
    else if (reqStr.startsWith("X-PAYMENT:END")) {
        // End of chunked payload
        if (_assemblyInProgress) {
            _assembledPayload += reqStr.substring(13); // Remove "X-PAYMENT:END"
            processCompletePayload(_assembledPayload);
            
            // Reset assembly state
            _assembledPayload = "";
            _assemblyInProgress = false;
            Serial.println("[payment] Assembly complete");
        }
    }
    else if (reqStr.startsWith("X-PAYMENT") && _assemblyInProgress) {
        // Middle chunk
        _assembledPayload += reqStr.substring(9); // Remove "X-PAYMENT"
        Serial.println("[payment] Chunk received");
    }
    else {
        Serial.println("[payment] Invalid chunk or out of sequence");
        // Reset on error
        _assembledPayload = "";
        _assemblyInProgress = false;
    }
}

void X402ble::processCompletePayload(const String& payload) {
    Serial.println("[payment] Complete payload:");
    Serial.println(payload);
    
    // Process the complete payment payload
    std::string response = std::string("Payment received: ") + std::string(payload.c_str());
    
    // Send response back over TX
    if (pTx) {
        pTx->setValue((const uint8_t*)response.data(), response.size());
        pTx->notify();
    }
    
    // Here you would normally call verify/settle functions with the complete payload
}
