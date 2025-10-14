#include "customized_cpp.h"

X402Client::X402Client() {
    // Constructor - initialize any needed components
}

X402Client::~X402Client() {
    // Destructor - cleanup
    http.end();
}

bool X402Client::initWiFi(const char* ssid, const char* password) {
    WiFi.begin(ssid, password);
    
    Serial.print("Connecting to WiFi");
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println();
        Serial.println("WiFi connected!");
        Serial.print("IP address: ");
        Serial.println(WiFi.localIP());
        return true;
    } else {
        Serial.println();
        Serial.println("WiFi connection failed!");
        return false;
    }
}

X402Client::USDCAsset X402Client::getAsset(const std::string& network) {
    auto chainIdIt = evmNetworkToChainId.find(network);
    if (chainIdIt == evmNetworkToChainId.end()) {
        Serial.println("Error: Unsupported network - " + String(network.c_str()));
        return {"", ""};
    }
    
    int chainId = chainIdIt->second;
    auto assetIt = evmUSDC.find(chainId);
    if (assetIt == evmUSDC.end()) {
        Serial.println("Error: USDC not found for chainId - " + String(chainId));
        return {"", ""};
    }
    
    return assetIt->second;
}

DynamicJsonDocument X402Client::createPaymentRequirements() {
    DynamicJsonDocument paymentRequirements(2048);
    USDCAsset asset = getAsset(network);
    
    paymentRequirements["scheme"] = "exact";
    paymentRequirements["network"] = network;
    paymentRequirements["maxAmountRequired"] = value;
    paymentRequirements["resource"] = "https://example.com/resource";
    paymentRequirements["description"] = "Test resource";
    paymentRequirements["mimeType"] = "application/json";
    paymentRequirements["payTo"] = to;
    paymentRequirements["maxTimeoutSeconds"] = 300;
    paymentRequirements["asset"] = asset.usdcAddress;
    
    // Create extra object
    JsonObject extra = paymentRequirements.createNestedObject("extra");
    extra["name"] = asset.usdcName;
    extra["version"] = "2";
    
    return paymentRequirements;
}

std::string X402Client::httpPost(const std::string& url, const std::string& payload) {
    http.begin(url.c_str());
    http.addHeader("Content-Type", "application/json");
    
    int httpResponseCode = http.POST(payload.c_str());
    std::string response = "";
    
    if (httpResponseCode > 0) {
        response = http.getString().c_str();
        Serial.println("HTTP Response Code: " + String(httpResponseCode));
    } else {
        Serial.println("HTTP POST Error: " + String(httpResponseCode));
    }
    
    http.end();
    return response;
}

void X402Client::printJsonResponse(const DynamicJsonDocument& doc) {
    String jsonString;
    serializeJsonPretty(doc, jsonString);
    Serial.println(jsonString);
}

bool X402Client::verify(const std::string& decodedSignedPayload) {
    std::string url = DEFAULT_FACILITATOR_URL + "/verify";
    
    // Create request payload
    DynamicJsonDocument requestDoc(4096);
    DynamicJsonDocument payloadDoc(1024);
    
    // Parse the signed payload if it's a JSON string
    if (!decodedSignedPayload.empty()) {
        deserializeJson(payloadDoc, decodedSignedPayload);
        requestDoc["x402Version"] = payloadDoc["x402Version"];
        requestDoc["paymentPayload"] = payloadDoc;
    } else {
        requestDoc["x402Version"] = "1.0";
        requestDoc["paymentPayload"] = "";
    }
    
    requestDoc["paymentRequirements"] = createPaymentRequirements();
    
    String requestPayload;
    serializeJson(requestDoc, requestPayload);
    
    Serial.println("Sending verification request...");
    std::string response = httpPost(url, requestPayload.c_str());
    
    if (response.empty()) {
        Serial.println("Failed to get verification response");
        return false;
    }
    
    // Parse response
    DynamicJsonDocument responseDoc(2048);
    deserializeJson(responseDoc, response);
    
    Serial.println("Verification response:");
    printJsonResponse(responseDoc);
    
    bool isValid = responseDoc["isValid"];
    if (!isValid && responseDoc.containsKey("invalidReason")) {
        Serial.println("Error reason: " + String(responseDoc["invalidReason"].as<const char*>()));
    }
    
    return isValid;
}

bool X402Client::settle(const std::string& decodedSignedPayload) {
    std::string url = DEFAULT_FACILITATOR_URL + "/settle";
    
    // Create request payload
    DynamicJsonDocument requestDoc(4096);
    DynamicJsonDocument payloadDoc(1024);
    
    // Parse the signed payload if it's a JSON string
    if (!decodedSignedPayload.empty()) {
        deserializeJson(payloadDoc, decodedSignedPayload);
        requestDoc["x402Version"] = payloadDoc["x402Version"];
        requestDoc["paymentPayload"] = payloadDoc;
    } else {
        requestDoc["x402Version"] = "1.0";
        requestDoc["paymentPayload"] = "";
    }
    
    requestDoc["paymentRequirements"] = createPaymentRequirements();
    
    String requestPayload;
    serializeJson(requestDoc, requestPayload);
    
    Serial.println("Sending settlement request...");
    std::string response = httpPost(url, requestPayload.c_str());
    
    if (response.empty()) {
        Serial.println("Failed to get settlement response");
        return false;
    }
    
    // Parse response
    DynamicJsonDocument responseDoc(2048);
    deserializeJson(responseDoc, response);
    
    Serial.println("Settlement response:");
    printJsonResponse(responseDoc);
    
    return true;
}

void X402Client::run(const std::string& decodedSignedPayload) {
    Serial.println("Starting X402 Client...");
    
    // Verify payment
    bool verificationResult = verify(decodedSignedPayload);
    if (verificationResult) {
        Serial.println("Payment verification successful");
        
        // Settle payment
        bool settlementResult = settle(decodedSignedPayload);
        if (settlementResult) {
            Serial.println("Payment settlement completed");
        } else {
            Serial.println("Payment settlement failed");
        }
    } else {
        Serial.println("Payment verification failed");
    }
}