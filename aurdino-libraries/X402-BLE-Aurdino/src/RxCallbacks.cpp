#include "RxCallbacks.h"
#include "X402Ble.h"
#include "X402BleUtils.h"
#include "PaymentVerifyWorker.h"

// Memory-optimized implementation with proper garbage collection
void RxCallbacks::onWrite(NimBLECharacteristic *ch)
{
    // Get request directly as const char* to avoid String copy
    std::string req_std = ch->getValue();
    if (req_std.empty())
        return;
    
    const char* req_cstr = req_std.c_str();

    // Use stack-allocated buffer for small replies, heap for large ones
    char reply_buffer[256];
    String* heap_reply = nullptr;
    const char* reply_ptr = nullptr;

    // Check if this is a payment chunk (X-PAYMENT:START, X-PAYMENT, X-PAYMENT:END)
    if (strncmp(req_cstr, "X-PAYMENT", 9) == 0)
    {
        if (pBle)
        {
            String currentPayload = pBle->getPaymentPayload();
            String reqStr(req_cstr); // Only create String when needed
            bool isComplete = assemblePaymentChunk(reqStr, currentPayload);
            pBle->setPaymentPayload(currentPayload);
            
            // Clear reqStr immediately after use
            reqStr = String();

            if (isComplete)
            {
                // Immediate lightweight ACK (keeps phone happy & host stack safe)
                strcpy(reply_buffer, "PAYMENT:VERIFYING");
                reply_ptr = reply_buffer;

                // Defer heavy verification to worker task with large stack
                VerifyJob job;
                job.payload = pBle->getPaymentPayload();     // copy assembled payload
                job.requirements = pBle->paymentRequirements; // snapshot requirements
                job.txChar = pTxChar;                        // TX characteristic for response
                PaymentVerifyWorker::enqueue(std::move(job));
            }
            else
            {
                // Still assembling
                strcpy(reply_buffer, "PAYMENT:ACK");
                reply_ptr = reply_buffer;
            }
        }
        else
        {
            strcpy(reply_buffer, "ERROR:NO_CONTEXT");
            reply_ptr = reply_buffer;
        }
    }
    else if (strncasecmp(req_cstr, "[LOGO]", 6) == 0)
    {
        // Return logo string - use heap for potentially large content
        if (pBle && pBle->getLogo().length() > 0)
        {
            heap_reply = new String("LOGO://" + pBle->getLogo());
            reply_ptr = heap_reply->c_str();
        }
        else
        {
            strcpy(reply_buffer, "LOGO://");
            reply_ptr = reply_buffer;
        }
    }
    else if (strncasecmp(req_cstr, "[BANNER]", 8) == 0)
    {
        // Return banner string
        if (pBle && pBle->getBanner().length() > 0)
        {
            heap_reply = new String("BANNER://" + pBle->getBanner());
            reply_ptr = heap_reply->c_str();
        }
        else
        {
            strcpy(reply_buffer, "BANNER://");
            reply_ptr = reply_buffer;
        }
    }
    else if (strncasecmp(req_cstr, "[DESC]", 6) == 0)
    {
        // Return description string
        if (pBle && pBle->getDescription().length() > 0)
        {
            heap_reply = new String("DESC://" + pBle->getDescription());
            reply_ptr = heap_reply->c_str();
        }
        else
        {
            strcpy(reply_buffer, "DESC://");
            reply_ptr = reply_buffer;
        }
    }
    else if (strncasecmp(req_cstr, "[CONFIG]", 8) == 0)
    {
        // Build CONFIG response efficiently
        heap_reply = new String();
        heap_reply->reserve(128); // Pre-allocate memory
        *heap_reply = "CONFIG://{\"frequency\": ";
        *heap_reply += String(pBle->getFrequency());
        *heap_reply += ", \"allowCustomContent\": ";
        *heap_reply += (pBle->isCustomContentAllowed() ? "true" : "false");
        *heap_reply += "}";
        reply_ptr = heap_reply->c_str();
    }
    else if (strncasecmp(req_cstr, "[OPTIONS]", 9) == 0)
    {
        // Handle options request - build comma-separated string
        if (pBle)
        {
            const auto &opts = pBle->getOptions();
            heap_reply = new String();
            heap_reply->reserve(256); // Pre-allocate for options
            *heap_reply = "OPTIONS://";
            for (size_t i = 0; i < opts.size(); ++i)
            {
                *heap_reply += opts[i];
                if (i + 1 < opts.size())
                    *heap_reply += ",";
            }
            reply_ptr = heap_reply->c_str();
        }
        else
        {
            strcpy(reply_buffer, "OPTIONS://");
            reply_ptr = reply_buffer;
        }
    }
    else
    {
        // Send price, payTo, and network from X402Ble instance
        if (pBle)
        {
            // Build JSON efficiently with pre-allocation
            heap_reply = new String();
            heap_reply->reserve(256);
            *heap_reply = "402://{\"price\": \"";
            *heap_reply += pBle->getPrice();
            *heap_reply += "\", \"payTo\": \"";
            *heap_reply += pBle->getPayTo();
            *heap_reply += "\", \"network\": \"";
            *heap_reply += pBle->getNetwork();
            *heap_reply += "\"}";
            reply_ptr = heap_reply->c_str();
        }
        else
        {
            strcpy(reply_buffer, "{\"error\": \"Unknown command\"}");
            reply_ptr = reply_buffer;
        }
    }

    // Send response back to client via TX characteristic (notify)
    if (pTxChar && reply_ptr && strlen(reply_ptr) > 0)
    {
        size_t len = strlen(reply_ptr);
        pTxChar->setValue((uint8_t *)reply_ptr, len);
        pTxChar->notify();
    }

    // Proper garbage collection - clean up heap allocations
    if (heap_reply)
    {
        delete heap_reply;
        heap_reply = nullptr;
    }
}
