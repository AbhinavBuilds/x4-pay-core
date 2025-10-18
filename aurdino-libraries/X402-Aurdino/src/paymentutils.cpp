#include "paymentutils.h"
#include "X402Aurdino.h"
#include "stackmonitor.h"

// Helper function to escape JSON strings - Memory optimized
String escapeJsonString(const String& str) {
    // Pre-calculate worst case size (each char could be escaped)
    String escaped;
    escaped.reserve(str.length() * 2 + 10);
    
    for (unsigned int i = 0; i < str.length(); i++) {
        char c = str.charAt(i);
        switch(c) {
            case '\\': escaped += "\\\\"; break;
            case '"':  escaped += "\\\""; break;
            case '\n': escaped += "\\n"; break;
            case '\r': escaped += "\\r"; break;
            case '\t': escaped += "\\t"; break;
            default:   escaped += c; break;
        }
    }
    
    return escaped;
}

// Helper function to extract value from JSON string - Memory optimized
String extractJsonValue(const String& json, const String& key) {
    // Build search key without concatenation
    String searchKey;
    searchKey.reserve(key.length() + 4);
    searchKey = '"';
    searchKey += key;
    searchKey += "\":";
    
    int startIndex = json.indexOf(searchKey);
    if (startIndex == -1) {
        searchKey = "";  // Free memory immediately
        return "";
    }
    
    startIndex += searchKey.length();
    searchKey = "";  // Free memory immediately after use
    
    // Skip whitespace
    while (startIndex < json.length() && (json.charAt(startIndex) == ' ' || json.charAt(startIndex) == '\t')) {
        startIndex++;
    }
    
    if (startIndex >= json.length()) return "";
    
    char firstChar = json.charAt(startIndex);
    if (firstChar == '"') {
        // String value
        startIndex++; // Skip opening quote
        int endIndex = startIndex;
        while (endIndex < json.length() && json.charAt(endIndex) != '"') {
            if (json.charAt(endIndex) == '\\') {
                endIndex += 2; // Skip escaped character
            } else {
                endIndex++;
            }
        }
        return json.substring(startIndex, endIndex);
    } else if (firstChar == 't' || firstChar == 'f') {
        // Boolean value
        if (json.substring(startIndex, startIndex + 4) == "true") return "true";
        if (json.substring(startIndex, startIndex + 5) == "false") return "false";
        return "";
    } else {
        // Number or other value
        int endIndex = startIndex;
        while (endIndex < json.length() && 
               json.charAt(endIndex) != ',' && 
               json.charAt(endIndex) != '}' && 
               json.charAt(endIndex) != ']' &&
               json.charAt(endIndex) != ' ' &&
               json.charAt(endIndex) != '\t' &&
               json.charAt(endIndex) != '\n') {
            endIndex++;
        }
        return json.substring(startIndex, endIndex);
    }
}

// Parse a complete payment JSON string into PaymentPayload struct
PaymentPayload parsePaymentString(const String& paymentJsonStr) {

    
    PaymentPayload payload;
    
    // Extract x402Version from the payment JSON (as number, not quoted)
    String versionStr = extractJsonValue(paymentJsonStr, "x402Version");
    
    if (versionStr.length() > 0) {
        payload.x402Version = versionStr;  // Keep as-is (number string like "1")
    } else {
        payload.x402Version = "1";  // Default to version 1
    }
    
    // The payloadJson should be the entire payment object
    // This includes: x402Version, scheme, network, payload
    payload.payloadJson = paymentJsonStr;

    
    return payload;
}

String createPaymentRequestJson(const PaymentPayload &decodedSignedPayload, const String &paymentRequirements)
{
    
    // AUTO-FIX: Detect if user swapped the fields
    String actualVersion;
    String actualPayloadJson;
    
    if (decodedSignedPayload.payloadJson.length() == 0 && decodedSignedPayload.x402Version.length() > 10) {
        // User put entire JSON in x402Version field (common mistake)
        
        
        actualPayloadJson = decodedSignedPayload.x402Version;  // Full JSON is here
        actualVersion = extractJsonValue(actualPayloadJson, "x402Version");  // Extract version
        
        if (actualVersion.length() == 0) {
            actualVersion = "1";
        }
        
        
    } else {
        // Fields are correct
        actualVersion = decodedSignedPayload.x402Version;
        actualPayloadJson = decodedSignedPayload.payloadJson;
    }
    
    // Pre-allocate string to reduce reallocations
    String json;
    json.reserve(128 + actualPayloadJson.length() + paymentRequirements.length());
    
    
    json = "{\"x402Version\":";
    json += actualVersion;  // Add as unquoted number
    json += ",\"paymentPayload\":";
    json += actualPayloadJson;
    json += ",\"paymentRequirements\":";
    json += paymentRequirements;
    json += "}";
    
    return json;
}

HttpResponse makePaymentApiCall(const String &endpoint, const PaymentPayload &decodedSignedPayload, const String &paymentRequirements, const String &customHeaders)
{
    STACK_CHECKPOINT("makePaymentApiCall:start");
    
    // Build URL without concatenation - Memory optimized
    String url;
    url.reserve(strlen(DEFAULT_FACILITATOR_URL) + endpoint.length() + 2);
    url = DEFAULT_FACILITATOR_URL;
    url += '/';
    url += endpoint;
    
    STACK_CHECKPOINT("makePaymentApiCall:after_url");
    
    // Create payload
    String jsonPayload = createPaymentRequestJson(decodedSignedPayload, paymentRequirements);
    
    STACK_CHECKPOINT("makePaymentApiCall:after_payload");
    
    // Make request and get response
    HttpResponse response = postJson(url, jsonPayload, customHeaders);
    
    // Free temporary strings immediately
    url = "";
    jsonPayload = "";
    
    STACK_CHECKPOINT("makePaymentApiCall:end");
    
    return response;
}