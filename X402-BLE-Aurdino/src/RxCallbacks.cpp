#include "RxCallbacks.h"
#include "X402Ble.h"
#include "X402BleUtils.h"

// Empty implementation for now; extend as needed
void RxCallbacks::onWrite(NimBLECharacteristic *ch)
{
    std::string req = ch->getValue();
    if (req.empty())
        return;

    std::string reply;
    Serial.printf("Request received over BLE: %s\n", req.c_str());

    String reqStr(req.c_str());
    if (startsWithIgnoreCase(reqStr, "x-payment"))
    {
        // Handle payment request
        reply = "Payment request received";
    }
    else if (startsWithIgnoreCase(reqStr, "[LOGO]"))
    {
        // Return logo string
        reply = pBle ? "LOGO://" + std::string(pBle->getLogo().c_str()) : "LOGO://";
    }
    else if (startsWithIgnoreCase(reqStr, "[BANNER]"))
    {
        // Return banner string
        reply = pBle ? "BANNER://" + std::string(pBle->getBanner().c_str()) : "BANNER://";
    }
    else if (startsWithIgnoreCase(reqStr, "[DESC]"))
    {
        // Return description string
        reply = pBle ? "DESC://" + std::string(pBle->getDescription().c_str()) : "DESC://";
    }
    else if (startsWithIgnoreCase(reqStr, "[CONFIG]"))
    {
        const auto &opts = pBle->getOptions();
        std::string json = "CONFIG://{";
        json += "\"frequency\": " + std::to_string(pBle->getFrequency()) + ", ";
        json += "\"allowCustomContent\": " + std::string(pBle->isCustomContentAllowed() ? "true" : "false");
        json += "}";
        reply = json; // main reply is the JSON summary
    }
    else if (startsWithIgnoreCase(reqStr, "[OPTIONS]"))
    {
        // Handle options request - build comma-separated string
        if (pBle)
        {
            const auto &opts = pBle->getOptions();
            std::string optionsStr = "OPTIONS://";
            for (size_t i = 0; i < opts.size(); ++i)
            {
                optionsStr += std::string(opts[i].c_str());
                if (i + 1 < opts.size())
                    optionsStr += ",";
            }
            reply = optionsStr;
        }
        else
        {
            reply = "OPTIONS://";
        }
    }
    else
    {
        // Send price, payTo, and network from X402Ble instance
        if (pBle)
        {
            reply = "402://{\"price\": \"" + std::string(pBle->getPrice().c_str()) +
                    "\", \"payTo\": \"" + std::string(pBle->getPayTo().c_str()) +
                    "\", \"network\": \"" + std::string(pBle->getNetwork().c_str()) +
                    "\"}";
        }
        else
        {
            reply = "{\"error\": \"Unknown command\"}";
        }
    }

    // Send response back to client via TX characteristic (notify)
    if (pTxChar && !reply.empty())
    {
        pTxChar->setValue((uint8_t *)reply.data(), reply.size());
        pTxChar->notify();
        Serial.printf("Response sent: %s\n", reply.c_str());
    }
}
