#ifndef X402BLE_H
#define X402BLE_H

#include <Arduino.h>
#include <NimBLEDevice.h>
#include <vector>

#include "X402Aurdino.h"

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

    void begin();

    String paymentRequirements;

    // Public getters for RxCallbacks
    String getPrice() const { return price_; }
    String getPayTo() const { return payTo_; }
    String getNetwork() const { return network_; }
    String getLogo() const { return logo_; }
    String getDescription() const { return description_; }
    String getBanner() const { return banner_; }

    // Recurring/options/customization controls
    void enableRecuring(uint32_t frequency);                    // set frequency (0 means unset)
    void enableOptions(const String options[], size_t count);   // Arduino-friendly overload
    void allowCustomised();                                     // allow custom content

    // Optional getters for new fields
    uint32_t getFrequency() const { return frequency_; }
    const std::vector<String> &getOptions() const { return options_; }
    bool isCustomContentAllowed() const { return allowCustomContent_; }

    // BLE UUIDs
    static const char *SERVICE_UUID;
    static const char *TX_CHAR_UUID;
    static const char *RX_CHAR_UUID;

private:
    String device_name_;
    String network_;
    String price_;
    String payTo_;
    String logo_;
    String description_;
    String banner_;

    // New customization fields
    uint32_t frequency_;                 // 0 = not set
    std::vector<String> options_;        // empty by default
    bool allowCustomContent_;            // false by default

    NimBLEServer *pServer;
    NimBLEService *pService;
    NimBLECharacteristic *pTxCharacteristic;
    NimBLECharacteristic *pRxCharacteristic;
};

#endif // X402BLE_H