#ifndef X402BLE_H
#define X402BLE_H

#include <Arduino.h>
#include <NimBLEDevice.h>
#include <vector>

#include "X402Aurdino.h"

// Forward declaration to avoid circular include
class PaymentVerifyWorker;

// Dynamic price callback typedef
// Takes user selected options and custom context, returns price as String
typedef String (*DynamicPriceCallback)(const std::vector<String>& options, const String& customContext);

// OnPay callback typedef
// Called when payment verification and settlement succeed
// Receives selected options and custom context from the user
typedef void (*OnPayCallback)(const std::vector<String>& options, const String& customContext);

class X402Ble
{
public:
    explicit X402Ble(const String &device_name,
                     const String &price,
                     const String &payTo,
                     const String &network = "base-sepolia",
                     const String &logo = "",
                     const String &description = "",
                     const String &banner = "");

    // Destructor for proper cleanup
    ~X402Ble();

    void begin();
    void cleanup(); // Manual cleanup method
    
    // Memory monitoring functions
    void printMemoryUsage() const;
    size_t getPaymentPayloadSize() const { return paymentPayload_.length(); }

    String paymentRequirements;

    // Public getters for RxCallbacks
    String getPrice() const { return price_; }
    String getPayTo() const { return payTo_; }
    String getNetwork() const { return network_; }
    String getLogo() const { return logo_; }
    String getDescription() const { return description_; }
    String getBanner() const { return banner_; }

    // Last payment state getters
    bool getLastPaid() const { return lastPaid_; }
    String getLastTransactionhash() const { return lastTransactionhash_; }
    String getLastPayer() const { return lastPayer_; }
    unsigned long getLastPaymentTimestamp() const { return lastPaymentTimestamp_; }

    // Returns lastPaid and resets it to false
    bool getStatusAndReset();
    
    // Returns microseconds elapsed since last successful payment (0 if no payment yet)
    unsigned long getMicrosSinceLastPayment() const;

    // Recurring/options/customization controls
    void enableRecuring(uint32_t frequency);                    // set frequency (0 means unset)
    void enableOptions(const String options[], size_t count);   // Arduino-friendly overload
    void allowCustomised();                                     // allow custom content

    // Optional getters for new fields
    uint32_t getFrequency() const { return frequency_; }
    const std::vector<String> &getOptions() const { return options_; }
    bool isCustomContentAllowed() const { return allowCustomContent_; }
    String getPaymentPayload() const { return paymentPayload_; }

    // User-provided selection/context
    const std::vector<String>& getUserSelectedOptions() const { return userSelectedOptions_; }
    void setUserSelectedOptions(const String options[], size_t count);
    void setUserSelectedOptions(const std::vector<String>& options);
    void clearUserSelectedOptions();
    const String& getUserCustomContext() const { return userCustomContext_; }
    void setUserCustomContext(const String &ctx) { userCustomContext_ = ctx; }
    void clearUserCustomContext() { userCustomContext_ = ""; }

    // Payment payload assembly (used by RxCallbacks)
    void setPaymentPayload(const String &payload) { paymentPayload_ = payload; }
    void clearPaymentPayload() { paymentPayload_ = ""; }

    // Price request payload assembly (for [PRICE] chunks)
    void setPriceRequestPayload(const String &payload) { priceRequestPayload_ = payload; }
    String getPriceRequestPayload() const { return priceRequestPayload_; }
    void clearPriceRequestPayload() { priceRequestPayload_ = ""; }

    // Dynamic price callback
    void setDynamicPriceCallback(DynamicPriceCallback callback) { dynamicPriceCallback_ = callback; }
    DynamicPriceCallback getDynamicPriceCallback() const { return dynamicPriceCallback_; }

    // OnPay callback - called when payment succeeds
    void setOnPay(OnPayCallback callback) { onPayCallback_ = callback; }
    OnPayCallback getOnPayCallback() const { return onPayCallback_; }

    // BLE UUIDs
    static const char *SERVICE_UUID;
    static const char *TX_CHAR_UUID;
    static const char *RX_CHAR_UUID;

    // Access the active instance (used by worker thread)
    static X402Ble* getActiveInstance();

    // Update last payment state atomically
    void setLastPaymentState(bool paid, const String &txHash, const String &payer);

private:
    String device_name_;
    String network_;
    String price_;
    String payTo_;
    String logo_;
    String description_;
    String banner_;

    // Last payment state
    bool lastPaid_ = false;
    String lastTransactionhash_ = "";
    String lastPayer_ = "";
    unsigned long lastPaymentTimestamp_ = 0; // micros() when last payment succeeded

    // New customization fields
    uint32_t frequency_;                 // 0 = not set
    std::vector<String> options_;        // empty by default
    bool allowCustomContent_;            // false by default
    String paymentPayload_;              // assembled from chunks

    // User-provided selection/context from client
    std::vector<String> userSelectedOptions_;
    String userCustomContext_;

    // Price request payload (for [PRICE] chunks)
    String priceRequestPayload_;
    
    // Dynamic price callback function
    DynamicPriceCallback dynamicPriceCallback_;
    
    // OnPay callback function (called on successful payment)
    OnPayCallback onPayCallback_;

    NimBLEServer *pServer;
    NimBLEService *pService;
    NimBLECharacteristic *pTxCharacteristic;
    NimBLECharacteristic *pRxCharacteristic;

    // Track the active instance for worker callbacks
    static X402Ble* s_active;
};

#endif // X402BLE_H