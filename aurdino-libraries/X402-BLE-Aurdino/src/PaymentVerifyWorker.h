#pragma once
#include <Arduino.h>
#include <queue>
#include "NimBLEDevice.h"
#include "X402Ble.h"

// Job struct - will be heap-allocated to avoid shallow copies
struct VerifyJob
{
    String payload;               // assembled payment payload (JSON only)
    String requirements;          // paymentRequirements snapshot
    NimBLECharacteristic *txChar; // TX to respond on
    String customContext;         // user's custom context
    std::vector<String> selectedOptions; // user's selected options
};

class PaymentVerifyWorker
{
public:
    static void begin(size_t stackBytes = 8192, UBaseType_t prio = 3, BaseType_t core = 1)
    {
        if (!q_)
            q_ = xQueueCreate(4, sizeof(VerifyJob *)); // queue of pointers, not objects
        xTaskCreatePinnedToCore(taskTrampoline, "pay_verify", stackBytes / sizeof(StackType_t),
                                nullptr, prio, nullptr, core);
    }

    static bool enqueue(VerifyJob &&job)
    {
        if (!q_)
            return false;
        // Allocate job on heap with deep ownership transfer
        VerifyJob *heapJob = new (std::nothrow) VerifyJob();
        if (!heapJob)
            return false;

        // Move strings to avoid copies
        heapJob->payload = job.payload;
        heapJob->requirements = job.requirements;
        heapJob->txChar = job.txChar;
        heapJob->customContext = job.customContext;
        heapJob->selectedOptions = job.selectedOptions;

        // Queue the pointer (POD), not the object
        if (xQueueSend(q_, &heapJob, 0) != pdTRUE)
        {
            delete heapJob;
            return false;
        }
        return true;
    }

private:
    static QueueHandle_t q_;
    static void taskTrampoline(void *)
    {
        for (;;)
        {
            VerifyJob *job = nullptr;
            if (xQueueReceive(q_, &job, portMAX_DELAY) == pdTRUE && job)
            {
                // ---- Do the heavy work OFF the NimBLE host stack ----
                bool ok = false;
                PaymentPayload *payload = nullptr;

                // Avoid exceptions on ESP32 - use std::nothrow for safer allocation
                payload = new (std::nothrow) PaymentPayload(job->payload);
                String txHash = "";
                String payer = "";
                String dynamicRequirements = job->requirements; // Default to passed requirements
                
                if (payload)
                {
                    // Get active X402Ble instance to build dynamic payment requirements
                    if (X402Ble* ble = X402Ble::getActiveInstance()) {
                        // Calculate dynamic price if callback is set
                        String dynamicPrice = ble->getPrice(); // Default to static price
                        if (ble->getDynamicPriceCallback() != nullptr) {
                            dynamicPrice = ble->getDynamicPriceCallback()(job->selectedOptions, job->customContext);
                            
                        }
                        
                        // Build payment requirements with dynamic price
                        dynamicRequirements = buildDefaultPaymentRementsJson(
                            ble->getNetwork(),      // network
                            ble->getPayTo(),        // payTo address
                            dynamicPrice,           // dynamic price based on options/context
                            ble->getLogo(),         // logo
                            ble->getDescription()   // description
                        );
                        
                        
                    }
                    
                    ok = verifyPayment(*payload, dynamicRequirements, "");
                    
                    // If verification succeeded, settle the payment
                    if (ok)
                    {
                        String txResp = settlePayment(*payload, dynamicRequirements, "");
                        // Expecting JSON like: {"success":true,"transaction":"0x...","network":"...","payer":"0x..."}
                        // Minimal, allocation-light parsing
                        int txPos = txResp.indexOf("\"transaction\":\"");
                        if (txPos >= 0) {
                            txPos += 15; // length of "transaction":"
                            int txEnd = txResp.indexOf('"', txPos);
                            if (txEnd > txPos) txHash = txResp.substring(txPos, txEnd);
                        }
                        int payerPos = txResp.indexOf("\"payer\":\"");
                        if (payerPos >= 0) {
                            payerPos += 10; // length of "payer":"
                            int payerEnd = txResp.indexOf('"', payerPos);
                            if (payerEnd > payerPos) payer = txResp.substring(payerPos, payerEnd);
                        }
                        // Optional success flag
                        bool settledOk = txResp.indexOf("\"success\":true") >= 0;
                        // Only consider paid if settlement succeeded and we have a hash
                        ok = ok && settledOk && (txHash.length() > 0);
                    }
                    
                    delete payload;
                    payload = nullptr;
                }

                // Update global last payment state if we have an instance
                // Only set user context/options if payment was successful
                if (ok) {
                    if (X402Ble* ble = X402Ble::getActiveInstance()) {
                        ble->setLastPaymentState(true, txHash, payer);
                        // Set user selections only on successful payment
                        ble->setUserCustomContext(job->customContext);
                        ble->setUserSelectedOptions(job->selectedOptions);
                        
                        // Call onPay callback if set
                        if (ble->getOnPayCallback() != nullptr) {
                            
                            ble->getOnPayCallback()(job->selectedOptions, job->customContext);
                        }
                    }
                }

                // Build and send response with transaction hash if available
                String resp = ok ? "PAYMENT:COMPLETE VERIFIED:true" : "PAYMENT:COMPLETE VERIFIED:false";
                if (ok && txHash.length() > 0)
                {
                    resp += " TX:";
                    resp += txHash;
                }
                
                if (job->txChar)
                {
                    job->txChar->setValue((const uint8_t *)resp.c_str(), resp.length());
                    job->txChar->notify();
                }

                // Free the heap-allocated job
                delete job;
            }
        }
    }
};
inline QueueHandle_t PaymentVerifyWorker::q_ = nullptr;