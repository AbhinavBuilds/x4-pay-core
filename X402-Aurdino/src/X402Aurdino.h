#ifndef X402AURDINO_H
#define X402AURDINO_H

#include <Arduino.h>
#include <map>
#include <string>

static const char *DEFAULT_FACILITATOR_URL = "https://x402.org/facilitator";

struct AssetInfo
{
    const char *usdcAddress;
    const char *usdcName;
};

struct PaymentRequirements
{
    String scheme;
    String network;
    String maxAmountRequired;
    String resource;
    String description;
    String mimeType;
    String payTo;
    uint32_t maxTimeoutSeconds;
    String asset;
    String extra_name;
    String extra_version;
};

struct PaymentPayload
{
    String x402Version;
    String payloadJson;
};

const std::map<String, uint32_t> EvmNetworkToChainId = {
    {"base-sepolia", 84532},
    {"base", 8453},
    {"avalanche-fuji", 43113},
    {"avalanche", 43114},
    {"iotex", 4689},
    {"sei", 1329},
    {"sei-testnet", 1328},
    {"polygon", 137},
    {"polygon-amoy", 80002},
    {"peaq", 3338},
};

const std::map<uint32_t, AssetInfo> EvmUSDC = {
    {84532, {"0x036CbD53842c5426634e7929541eC2318f3dCF7e", "USDC"}},
    {8453, {"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "USD Coin"}},
    {43113, {"0x5425890298aed601595a70AB815c96711a31Bc65", "USD Coin"}},
    {43114, {"0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", "USD Coin"}},
    {4689, {"0xcdf79194c6c285077a58da47641d4dbe51f63542", "Bridged USDC"}},
    {1328, {"0x4fcf1784b31630811181f670aea7a7bef803eaed", "USDC"}},
    {1329, {"0xe15fc38f6d8c56af07bbcbe3baf5708a2bf42392", "USDC"}},
    {137, {"0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", "USD Coin"}},
    {80002, {"0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582", "USDC"}},
    {3338, {"0xbbA60da06c2c5424f03f7434542280FCAd453d10", "USDC"}},
};

AssetInfo getAssetForNetwork(const String &network);

String buildRequirementsJson(const String &network, const String &payTo, const String &maxAmountRequired, const String &resource, const String &description = "", const String &scheme = "exact", const String &maxTimeoutSeconds = "300", const String &asset = "", const String &extra_name = "", const String &extra_version = "2");

String buildDefaultPaymentRementsJson(const String network, const String payTo, const String maxAmountRequired, const String resource, const String description = "");

bool verifyPayment(const PaymentPayload &decodedSignedPayload, const String &paymentRequirements, const String &customHeaders = "");
String settlePayment(const PaymentPayload &decodedSignedPayload, const String &paymentRequirements, const String &customHeaders = "");

#endif