#pragma once
#include <Arduino.h>
#include <queue>
#include "NimBLEDevice.h"
#include "X402Ble.h"

// Job struct - will be heap-allocated to avoid shallow copies
struct VerifyJob
{
    String payload;               // assembled payment payload
    String requirements;          // paymentRequirements snapshot
    NimBLECharacteristic *txChar; // TX to respond on
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
                if (payload)
                {
                    Serial.println("payload created");
                    Serial.println(job->payload);
                    Serial.println("requirements:");
                    Serial.println(job->requirements);
                    Serial.println("{ \"Content-Type\": \"application/json\" }");
                    ok = verifyPayment(*payload, job->requirements, "");
                    
                    // If verification succeeded, settle the payment
                    if (ok)
                    {
                        txHash = settlePayment(*payload, job->requirements, "");
                        Serial.print("Transaction Hash: ");
                        Serial.println(txHash);
                    }
                    
                    delete payload;
                    payload = nullptr;
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