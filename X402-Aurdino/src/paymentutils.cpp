#include "paymentutils.h"
#include "X402Aurdino.h"

#include "paymentutils.h"
#include "X402Aurdino.h"

// Helper function to escape JSON strings
String escapeJsonString(const String& str) {
    String escaped = str;
    escaped.replace("\\", "\\\\");
    escaped.replace("\"", "\\\"");
    escaped.replace("\n", "\\n");
    escaped.replace("\r", "\\r");
    escaped.replace("\t", "\\t");
    return escaped;
}

// Helper function to extract value from JSON string
String extractJsonValue(const String& json, const String& key) {
    String searchKey = "\"" + key + "\":";
    int startIndex = json.indexOf(searchKey);
    if (startIndex == -1) return "";
    
    startIndex += searchKey.length();
    
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

String createPaymentRequestJson(const PaymentPayload &decodedSignedPayload, const String &paymentRequirements)
{
    String json = "{";
    json += "\"x402Version\":\"" + escapeJsonString(decodedSignedPayload.x402Version) + "\",";
    json += "\"paymentPayload\":{";
    json += "\"x402Version\":\"" + escapeJsonString(decodedSignedPayload.x402Version) + "\",";
    json += "\"payloadJson\":\"" + escapeJsonString(decodedSignedPayload.payloadJson) + "\"";
    json += "},";
    json += "\"paymentRequirements\":" + paymentRequirements;
    json += "}";
    return json;
}

HttpResponse makePaymentApiCall(const String &endpoint, const PaymentPayload &decodedSignedPayload, const String &paymentRequirements, const String &customHeaders)
{
    String url = String(DEFAULT_FACILITATOR_URL) + "/" + endpoint;
    String jsonPayload = createPaymentRequestJson(decodedSignedPayload, paymentRequirements);
    return postJson(url, jsonPayload, customHeaders);
}