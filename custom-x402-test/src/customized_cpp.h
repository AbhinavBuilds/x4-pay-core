#ifndef CUSTOMIZED_CPP_H
#define CUSTOMIZED_CPP_H

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <map>
#include <string>

class X402Client {
private:
    const std::string DEFAULT_FACILITATOR_URL = "https://x402.org/facilitator";
    const std::string to = "0xa78eD39F695615315458Bb066ac9a5F28Dfd65FE";
    const std::string value = "1000000";
    const std::string network = "base-sepolia";
    
    // Network to Chain ID mapping
    std::map<std::string, int> evmNetworkToChainId = {
        {"base-sepolia", 84532},
        {"base", 8453},
        {"avalanche-fuji", 43113},
        {"avalanche", 43114},
        {"iotex", 4689},
        {"sei", 1329},
        {"sei-testnet", 1328},
        {"polygon", 137},
        {"polygon-amoy", 80002},
        {"peaq", 3338}
    };
    
    // Asset information structure
    struct USDCAsset {
        std::string usdcAddress;
        std::string usdcName;
    };
    
    // Chain ID to USDC mapping
    std::map<int, USDCAsset> evmUSDC = {
        {84532, {"0x036CbD53842c5426634e7929541eC2318f3dCF7e", "USDC"}},
        {8453, {"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "USD Coin"}},
        {43113, {"0x5425890298aed601595a70AB815c96711a31Bc65", "USD Coin"}},
        {43114, {"0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", "USD Coin"}},
        {4689, {"0xcdf79194c6c285077a58da47641d4dbe51f63542", "Bridged USDC"}},
        {103, {"4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", "USDC"}},
        {101, {"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "USDC"}},
        {1328, {"0x4fcf1784b31630811181f670aea7a7bef803eaed", "USDC"}},
        {1329, {"0xe15fc38f6d8c56af07bbcbe3baf5708a2bf42392", "USDC"}},
        {137, {"0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", "USD Coin"}},
        {80002, {"0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582", "USDC"}},
        {3338, {"0xbbA60da06c2c5424f03f7434542280FCAd453d10", "USDC"}}
    };

    HTTPClient http;
    
public:
    X402Client();
    ~X402Client();
    
    // Initialize WiFi connection
    bool initWiFi(const char* ssid, const char* password);
    
    // Get asset information for a network
    USDCAsset getAsset(const std::string& network);
    
    // Create payment requirements JSON
    DynamicJsonDocument createPaymentRequirements();
    
    // Verify payment
    bool verify(const std::string& decodedSignedPayload);
    
    // Settle payment
    bool settle(const std::string& decodedSignedPayload);
    
    // Main execution function
    void run(const std::string& decodedSignedPayload = "");
    
    // Utility functions
    void printJsonResponse(const DynamicJsonDocument& doc);
    std::string httpPost(const std::string& url, const std::string& payload);
};

#endif // CUSTOMIZED_CPP_H