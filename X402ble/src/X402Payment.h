#ifndef X402PAYMENT_H
#define X402PAYMENT_H

#include <Arduino.h>
#include <Arduino.h>
#include <map>
#include <string>


// ---------- Config ----------
static const char* DEFAULT_FACILITATOR_URL = "https://x402.org/facilitator";

// ---------- Types ----------
struct AssetInfo {
  const char* usdcAddress;
  const char* usdcName;
};

struct PaymentRequirements {
  String scheme;               // e.g. "exact"
  String network;              // e.g. "base-sepolia"
  String maxAmountRequired;    // e.g. "1000000"
  String resource;             // e.g. "https://example.com/resource"
  String description;          // e.g. "Test resource"
  String mimeType;             // e.g. "application/json"
  String payTo;                // address
  uint32_t maxTimeoutSeconds;  // e.g. 300
  String asset;                // usdcAddress
  String extra_name;           // usdcName
  String extra_version;        // "2"
};

// The “payment payload” the client sends (already signed/encoded JSON string)
struct PaymentPayload {
  String x402Version;          // e.g. "2"
  String payloadJson;          // raw JSON text (the remainder after "x-payment")
};

// ---------- Lookup ----------
// Use std::map because Arduino String doesn't provide a noexcept hash for unordered_map
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

// chainId -> USDC info
const std::map<uint32_t, AssetInfo> EvmUSDC = {
  {84532, {"0x036CbD53842c5426634e7929541eC2318f3dCF7e", "USDC"}},
  {8453,  {"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "USD Coin"}},
  {43113, {"0x5425890298aed601595a70AB815c96711a31Bc65", "USD Coin"}},
  {43114, {"0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", "USD Coin"}},
  {4689,  {"0xcdf79194c6c285077a58da47641d4dbe51f63542", "Bridged USDC"}},
  // Solana devnet/mainnet included for parity (chain IDs 103/101)
  {103,   {"4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", "USDC"}},
  {101,   {"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "USDC"}},
  {1328,  {"0x4fcf1784b31630811181f670aea7a7bef803eaed", "USDC"}},
  {1329,  {"0xe15fc38f6d8c56af07bbcbe3baf5708a2bf42392", "USDC"}},
  {137,   {"0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", "USD Coin"}},
  {80002, {"0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582", "USDC"}},
  {3338,  {"0xbbA60da06c2c5424f03f7434542280FCAd453d10", "USDC"}},
};

// ---------- Helpers ----------
bool startsWithIgnoreCase(const String& s, const char* prefix);
String stripPrefix(const String& s, size_t n);

// Throws (via return false + errOut) if unsupported network/asset not found
bool getAssetForNetwork(const String& network, AssetInfo& out, String& errOut);

// Build a JSON body for PaymentRequirements (minimal safe concat)
String buildRequirementsJson(const PaymentRequirements& req);

// Build /verify & /settle request JSON body
String buildVerifyOrSettleJson(const PaymentPayload& payload, const PaymentRequirements& req);

// Helper: return a combined pipe-separated String: network|maxAmountRequired|payTo
String extractPaymentFields(const PaymentRequirements& req);

// HTTP calls
bool verifyPayment(const PaymentPayload& payload,
                   const PaymentRequirements& req,
                   String& responseJson,
                   const String& facilitatorUrl = DEFAULT_FACILITATOR_URL);

bool settlePayment(const PaymentPayload& payload,
                   const PaymentRequirements& req,
                   String& responseJson,
                   const String& facilitatorUrl = DEFAULT_FACILITATOR_URL);

#endif // X402PAYMENT_H
