#include "X402Ble.h"
#include "ServerCallbacks.h"
#include "RxCallbacks.h"
#include "PaymentVerifyWorker.h"
#include <algorithm>
#include <cctype>

const char *X402Ble::SERVICE_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const char *X402Ble::TX_CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
const char *X402Ble::RX_CHAR_UUID = "6e400004-b5a3-f393-e0a9-e50e24dcca9e";

// Memory-optimized constructor with move semantics where possible
X402Ble::X402Ble(const String &device_name,
                 const String &price,
                 const String &payTo,
                 const String &network,
                 const String &logo,
                 const String &description,
                 const String &banner)
    : device_name_(device_name), network_(network), price_(price), payTo_(payTo),
      logo_(logo), description_(description), banner_(banner),
      frequency_(0), allowCustomContent_(false),
      pServer(nullptr), pService(nullptr), pTxCharacteristic(nullptr), pRxCharacteristic(nullptr)
{
    // Reserve space for vectors to avoid reallocation
    options_.reserve(8); // Reserve space for typical number of options

    // Initialize payment payload with reasonable capacity
    paymentPayload_ = "";
    // Initialize last payment state
    lastPaid_ = false;
    lastTransactionhash_ = "";
    lastPayer_ = "";
    lastPaymentTimestamp_ = 0;
    // Initialize user selection/context
    userSelectedOptions_.reserve(8);
    userCustomContext_ = "";

    // Initialize price request payload and callback
    priceRequestPayload_ = "";
    dynamicPriceCallback_ = nullptr;
    onPayCallback_ = nullptr;

    // Build payment requirements once during construction
    paymentRequirements = buildDefaultPaymentRementsJson(
        network_,    // network
        payTo_,      // payTo address
        price_,      // amount (1 USDC)
        logo_,       // logo
        description_ // description
        // banner is not used in paymentRequirements, but available as member
    );
}

// Set recurring frequency (0 clears/means unset)
void X402Ble::enableRecuring(uint32_t frequency)
{
    frequency_ = frequency;
}

// Memory-optimized options management
void X402Ble::enableOptions(const String options[], size_t count)
{
    options_.clear();
    if (count > 0)
    {
        options_.reserve(count); // Pre-allocate exact capacity needed
        for (size_t i = 0; i < count; ++i)
        {
            options_.push_back(options[i]);
        }
    }
}

// Allow custom content
void X402Ble::allowCustomised()
{
    allowCustomContent_ = true;
}

void X402Ble::begin()
{
    // Set active instance for worker callbacks
    s_active = this;
    NimBLEDevice::init(device_name_.c_str());
    NimBLEDevice::setDeviceName(device_name_.c_str());
    NimBLEDevice::setPower(ESP_PWR_LVL_P7);
    NimBLEDevice::setSecurityAuth(false, false, false);
    NimBLEDevice::setMTU(150);

    // Start payment verification worker with large stack on core 1
    PaymentVerifyWorker::begin(/*stackBytes=*/8192, /*prio=*/3, /*core=*/1);

    pServer = NimBLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());

    pService = pServer->createService(SERVICE_UUID);

    // TX (notify)
    pTxCharacteristic = pService->createCharacteristic(
        TX_CHAR_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
    if (!pTxCharacteristic)
    {

        return;
    }
    pTxCharacteristic->setValue((uint8_t *)"", 0);

    // RX (write / write without response)
    pRxCharacteristic = pService->createCharacteristic(
        RX_CHAR_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
    if (!pRxCharacteristic)
    {

        return;
    }
    // Pass TX characteristic and X402Ble instance so RxCallbacks can send notifications and access config
    pRxCharacteristic->setCallbacks(new RxCallbacks(pTxCharacteristic, this));

    if (!pService)
    {

        return;
    }

    pService->start();

    pAdvertising = NimBLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->start();
}

// Destructor for proper cleanup
X402Ble::~X402Ble()
{
    cleanup();
}

// Manual cleanup method for proper garbage collection
void X402Ble::cleanup()
{
    // Clear payment payload to free memory
    paymentPayload_ = "";

    // Clear options vector and free memory
    options_.clear();
    options_.shrink_to_fit();

    // Clear payment requirements
    paymentRequirements = "";

    // Clear user-provided selections/context
    userSelectedOptions_.clear();
    userSelectedOptions_.shrink_to_fit();
    userCustomContext_ = "";

    // Clear price request payload and callback
    priceRequestPayload_ = "";
    dynamicPriceCallback_ = nullptr;
    onPayCallback_ = nullptr;

    // Stop BLE advertising if active
    if (pAdvertising)
    {
        pAdvertising->stop();
    }

    // Clean up BLE characteristics and service
    if (pRxCharacteristic)
    {
        // Note: NimBLE handles callback cleanup automatically
        pRxCharacteristic = nullptr;
    }

    if (pTxCharacteristic)
    {
        pTxCharacteristic = nullptr;
    }

    if (pService)
    {
        pService = nullptr;
    }

    if (pServer)
    {
        pServer = nullptr;
    }
}

// Memory monitoring function
void X402Ble::printMemoryUsage() const
{

    size_t total_options_size = 0;
    for (const auto &option : options_)
    {
        total_options_size += option.length();
    }
}

// Set user selected options from C-style array
void X402Ble::setUserSelectedOptions(const String options[], size_t count)
{
    userSelectedOptions_.clear();
    if (count > 0)
    {
        userSelectedOptions_.reserve(count);
        for (size_t i = 0; i < count; ++i)
        {
            userSelectedOptions_.push_back(options[i]);
        }
    }
}

void X402Ble::clearUserSelectedOptions()
{
    userSelectedOptions_.clear();
}

void X402Ble::setUserSelectedOptions(const std::vector<String> &options)
{
    userSelectedOptions_.clear();
    if (!options.empty())
    {
        userSelectedOptions_.reserve(options.size());
        for (const auto &opt : options)
        {
            userSelectedOptions_.push_back(opt);
        }
    }
}

// Static active instance pointer
X402Ble *X402Ble::s_active = nullptr;

// Return active instance
X402Ble *X402Ble::getActiveInstance()
{
    return s_active;
}

// Return lastPaid and reset it to false
bool X402Ble::getStatusAndReset()
{
    bool wasPaid = lastPaid_;
    lastPaid_ = false;
    return wasPaid;
}

// Update last payment state
void X402Ble::setLastPaymentState(bool paid, const String &txHash, const String &payer)
{
    lastPaid_ = paid;
    lastTransactionhash_ = txHash;
    lastPayer_ = payer;
    if (paid)
    {
        lastPaymentTimestamp_ = micros(); // Capture timestamp when payment succeeds
    }
}

// Returns microseconds elapsed since last successful payment
unsigned long X402Ble::getMicrosSinceLastPayment() const
{
    if (lastPaymentTimestamp_ == 0)
    {
        return 0; // No payment has occurred yet
    }
    
    unsigned long current = micros();
    unsigned long timestamp = lastPaymentTimestamp_;
    
    // Handle micros() overflow (happens every ~70 minutes)
    if (current >= timestamp) {
        return current - timestamp;
    } else {
        // Overflow occurred, calculate correctly
        return (0xFFFFFFFF - timestamp) + current + 1;
    }
}