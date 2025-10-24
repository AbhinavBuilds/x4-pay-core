#include "X402Aurdino.h"
#include "httputils.h"
#include "paymentutils.h"
#include "stackmonitor.h"

// PaymentPayload constructor - automatically parses JSON string correctly
PaymentPayload::PaymentPayload(const String& paymentJsonStr) {
    // Extract x402Version from the JSON
    String versionStr = extractJsonValue(paymentJsonStr, "x402Version");
    
    if (versionStr.length() > 0) {
        x402Version = versionStr;  // Keep as-is (number string like "1")
    } else {
        x402Version = "1";  // Default to version 1
    }
    
    // Store the entire payment JSON
    payloadJson = paymentJsonStr;
}

AssetInfo getAssetForNetwork(const String &network)
{
    // Check if the network exists in our mapping
    auto it = EvmNetworkToChainId.find(network);
    if (it != EvmNetworkToChainId.end())
    {
        uint32_t chainId = it->second;
        auto assetIt = EvmUSDC.find(chainId);
        if (assetIt != EvmUSDC.end())
        {
            return assetIt->second;
        }
    }

    // Return empty AssetInfo if network not found
    AssetInfo empty = {"", ""};
    return empty;
}

String buildRequirementsJson(const String &network, const String &payTo, const String &maxAmountRequired, const String &resource, const String &description, const String &scheme, const String &maxTimeoutSeconds, const String &asset, const String &extra_name, const String &extra_version)
{
    // Pre-allocate to reduce memory fragmentation
    String j;
    j.reserve(300 + network.length() + payTo.length() + maxAmountRequired.length() + 
              resource.length() + description.length() + asset.length() + extra_name.length());
    
    j = "{\"scheme\":\"";
    j += scheme;
    j += "\",\"network\":\"";
    j += network;
    j += "\",\"maxAmountRequired\":\"";
    j += maxAmountRequired;
    j += "\",\"resource\":\"";
    j += resource;
    j += "\",\"description\":\"";
    j += description;
    j += "\",\"mimeType\":\"application/json\",\"payTo\":\"";
    j += payTo;
    j += "\",\"maxTimeoutSeconds\":";
    j += maxTimeoutSeconds;
    j += ",\"asset\":\"";
    j += asset;
    j += "\",\"extra\":{\"name\":\"";
    j += extra_name;
    j += "\",\"version\":\"";
    j += extra_version;
    j += "\"}}";
    return j;
}

String buildDefaultPaymentRementsJson(const String network, const String payTo, const String maxAmountRequired, const String resource, const String description)
{
    AssetInfo assetInfo = getAssetForNetwork(network);
    
    // Use stack variables (const char*) instead of String for better memory efficiency
    const char* assetAddress = assetInfo.usdcAddress;
    const char* assetName = assetInfo.usdcName;
    
    // Convert to String only when needed
    String asset = assetAddress;
    String name = assetName;
    
    String result = buildRequirementsJson(network, payTo, maxAmountRequired, resource, description, "exact", "300", asset, name, "2");
    
    // Free temporary strings
    asset = "";
    name = "";
    
    return result;
}

bool verifyPayment(const PaymentPayload &decodedSignedPayload, const String &paymentRequirements, const String &customHeaders)
{
    STACK_CHECKPOINT("verifyPayment:start");
    
    // Make API call using utility function
    HttpResponse response = makePaymentApiCall("verify", decodedSignedPayload, paymentRequirements, customHeaders);
    STACK_CHECKPOINT("verifyPayment:after_api_call");
    
    if (response.success && response.statusCode > 0) {
        // Parse response manually
        String isValidStr = extractJsonValue(response.body, "isValid");
        bool isValid = (isValidStr == "true");
        
        // Free memory immediately after use
        isValidStr = "";
        
        STACK_CHECKPOINT("verifyPayment:after_parse");
        
        if (!isValid) {
            String invalidReason = extractJsonValue(response.body, "invalidReason");
            if (invalidReason.length() > 0) {
                Serial.print("ERROR: Payment verification failed - ");
                Serial.println(invalidReason);
            }
            invalidReason = "";  // Free memory
        }
        
        // Clear response body to free memory
        response.body = "";
        
        STACK_CHECKPOINT("verifyPayment:end");
        return isValid;
    }
    
    Serial.print("ERROR: HTTP request failed - Code: ");
    Serial.println(response.statusCode);
    response.body = "";  // Free memory
    
    STACK_CHECKPOINT("verifyPayment:end_error");
    return false;
}

// Overloaded verifyPayment that accepts raw JSON strings
bool verifyPayment(const String &paymentPayloadJson, const String &paymentRequirements, const String &customHeaders)
{
    // Parse the payment JSON string into PaymentPayload struct
    PaymentPayload payload = parsePaymentString(paymentPayloadJson);
    
    // Call the main verifyPayment function
    return verifyPayment(payload, paymentRequirements, customHeaders);
}

String settlePayment(const PaymentPayload &decodedSignedPayload, const String &paymentRequirements, const String &customHeaders)
{
    STACK_CHECKPOINT("settlePayment:start");
    
    // Make API call using utility function
    HttpResponse response = makePaymentApiCall("settle", decodedSignedPayload, paymentRequirements, customHeaders);
    
    STACK_CHECKPOINT("settlePayment:after_api_call");
    Serial.println("Settlement response : " + String(response.body));
    if (response.success && response.statusCode == 200) {
        // Return a copy and free the response
        String result = response.body;
        response.body = "";
        
        STACK_CHECKPOINT("settlePayment:end_success");
        return result;
    } else {
        Serial.print("ERROR: Settlement failed - Code: ");
        Serial.println(response.statusCode);
        if (response.success && response.body.length() > 0) {
            Serial.print("ERROR: ");
            Serial.println(response.body);
        }
        
        // Free memory before returning
        response.body = "";
        
        STACK_CHECKPOINT("settlePayment:end_error");
        return "";
    }
}
