#include "X402Aurdino.h"
#include "httputils.h"
#include "paymentutils.h"

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
    String j = "{";
    j += "\"scheme\":\"" + String(scheme) + "\",";
    j += "\"network\":\"" + String(network) + "\",";
    j += "\"maxAmountRequired\":\"" + String(maxAmountRequired) + "\",";
    j += "\"resource\":\"" + String(resource) + "\",";
    j += "\"description\":\"" + String(description) + "\",";
    j += "\"mimeType\":\"" + String("application/json") + "\",";
    j += "\"payTo\":\"" + String(payTo) + "\",";
    j += "\"maxTimeoutSeconds\":" + String(maxTimeoutSeconds) + ",";
    j += "\"asset\":\"" + String(asset) + "\",";
    j += "\"extra\":{";
    j += "\"name\":\"" + String(extra_name) + "\",";
    j += "\"version\":\"" + String(extra_version) + "\"}";
    j += "}";
    return j;
}

String buildDefaultPaymentRementsJson(const String network, const String payTo, const String maxAmountRequired, const String resource, const String description)
{
    AssetInfo assetInfo = getAssetForNetwork(network);
    String asset = assetInfo.usdcAddress;
    String assetName = assetInfo.usdcName;
    return buildRequirementsJson(network, payTo, maxAmountRequired, resource, description, "exact", "300", asset, assetName, "2");
}

bool verifyPayment(const PaymentPayload &decodedSignedPayload, const String &paymentRequirements, const String &customHeaders)
{
    // Make API call using utility function
    HttpResponse response = makePaymentApiCall("verify", decodedSignedPayload, paymentRequirements, customHeaders);
    
    if (response.success && response.statusCode > 0) {
        // Parse response manually
        String isValidStr = extractJsonValue(response.body, "isValid");
        bool isValid = (isValidStr == "true");
        
        if (!isValid) {
            String invalidReason = extractJsonValue(response.body, "invalidReason");
            if (invalidReason.length() > 0) {
                Serial.println("Error reason: " + invalidReason);
            }
        }
        return isValid;
    }
    
    Serial.println("HTTP Error: " + String(response.statusCode));
    return false;
}

String settlePayment(const PaymentPayload &decodedSignedPayload, const String &paymentRequirements, const String &customHeaders)
{
    // Make API call using utility function
    HttpResponse response = makePaymentApiCall("settle", decodedSignedPayload, paymentRequirements, customHeaders);
    
    if (response.success && response.statusCode == 200) {
        Serial.println("Settlement response: " + response.body);
        return response.body;
    } else {
        String errorMsg = "Failed to settle payment: " + String(response.statusCode);
        if (response.success) {
            errorMsg += " " + response.body;
        }
        Serial.println(errorMsg);
        return "";
    }
}
