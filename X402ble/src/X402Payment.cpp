#include "X402Payment.h"
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

// ---- String utils ----
bool startsWithIgnoreCase(const String &s, const char *prefix)
{
  size_t n = strlen(prefix);
  if (s.length() < n)
    return false;
  for (size_t i = 0; i < n; ++i)
  {
    char a = tolower(s[i]);
    char b = tolower(prefix[i]);
    if (a != b)
      return false;
  }
  return true;
}

String stripPrefix(const String &s, size_t n)
{
  if (s.length() <= n)
    return String();
  return s.substring(n);
}

// ---- Asset lookup ----
bool getAssetForNetwork(const String &network, AssetInfo &out, String &errOut)
{
  auto itChain = EvmNetworkToChainId.find(network);
  if (itChain == EvmNetworkToChainId.end())
  {
    errOut = "Unsupported network: " + network;
    return false;
  }
  uint32_t chainId = itChain->second;

  auto itAsset = EvmUSDC.find(chainId);
  if (itAsset == EvmUSDC.end())
  {
    errOut = "USDC not found for chainId: " + String(chainId);
    return false;
  }
  out = itAsset->second;
  return true;
}

// ---- JSON builders (manual concat; assumes inputs have no quotes that need escaping) ----
static String jsonEscape(const String &in)
{
  // Minimal escape for quotes & backslashes
  String out;
  out.reserve(in.length() + 8);
  for (size_t i = 0; i < in.length(); ++i)
  {
    char c = in[i];
    if (c == '"' || c == '\\')
    {
      out += '\\';
      out += c;
    }
    else if (c == '\n')
    {
      out += "\\n";
    }
    else if (c == '\r')
    {
      out += "\\r";
    }
    else if (c == '\t')
    {
      out += "\\t";
    }
    else
      out += c;
  }
  return out;
}

String buildRequirementsJson(const PaymentRequirements &req)
{
  String j = "{";
  j += "\"scheme\":\"" + jsonEscape(req.scheme) + "\",";
  j += "\"network\":\"" + jsonEscape(req.network) + "\",";
  j += "\"maxAmountRequired\":\"" + jsonEscape(req.maxAmountRequired) + "\",";
  j += "\"resource\":\"" + jsonEscape(req.resource) + "\",";
  j += "\"description\":\"" + jsonEscape(req.description) + "\",";
  j += "\"mimeType\":\"" + jsonEscape(req.mimeType) + "\",";
  j += "\"payTo\":\"" + jsonEscape(req.payTo) + "\",";
  j += "\"maxTimeoutSeconds\":" + String(req.maxTimeoutSeconds) + ",";
  j += "\"asset\":\"" + jsonEscape(req.asset) + "\",";
  j += "\"extra\":{";
  j += "\"name\":\"" + jsonEscape(req.extra_name) + "\",";
  j += "\"version\":\"" + jsonEscape(req.extra_version) + "\"}";
  j += "}";
  return j;
}

String buildVerifyOrSettleJson(const PaymentPayload &payload, const PaymentRequirements &req)
{
  // payload.payloadJson is assumed to be a valid JSON string (already signed/encoded)
  // We'll embed it as an object value without re-quoting.
  String reqJson = buildRequirementsJson(req);

  String j = "{";
  j += "\"x402Version\":\"" + jsonEscape(payload.x402Version) + "\",";
  j += "\"paymentPayload\":" + payload.payloadJson + ","; // raw JSON
  j += "\"paymentRequirements\":" + reqJson;
  j += "}";
  return j;
}

// ---- HTTP helpers ----
static bool postJson(const String &url, const String &body, String &response, int &statusOut)
{
  WiFiClientSecure client;
  client.setInsecure(); // simplify TLS (dev)
  HTTPClient http;
  if (!http.begin(client, url))
    return false;

  http.addHeader("Content-Type", "application/json");
  int code = http.POST((uint8_t *)body.c_str(), body.length());
  statusOut = code;

  if (code > 0)
  {
    response = http.getString();
  }
  else
  {
    response = "HTTP error";
  }
  http.end();
  return (code > 0);
}

bool verifyPayment(const PaymentPayload &payload,
                   const PaymentRequirements &req,
                   String &responseJson,
                   const String &facilitatorUrl)
{
  String url = facilitatorUrl + "/verify";
  String body = buildVerifyOrSettleJson(payload, req);
  int status = 0;
  bool ok = postJson(url, body, responseJson, status);
  Serial.printf("[verify] HTTP %d\n", status);
  if (!ok)
    return false;
  // Optionally inspect JSON for fields like isValid / invalidReason here
  return true;
}

bool settlePayment(const PaymentPayload &payload,
                   const PaymentRequirements &req,
                   String &responseJson,
                   const String &facilitatorUrl)
{
  String url = facilitatorUrl + "/settle";
  String body = buildVerifyOrSettleJson(payload, req);
  int status = 0;
  bool ok = postJson(url, body, responseJson, status);
  Serial.printf("[settle] HTTP %d\n", status);
  return ok && status == 200;
}

// Helper implementation: return a combined pipe-separated String
String extractPaymentFields(const PaymentRequirements &req)
{
  return String("402[") + String("\"") + req.network + String("\",") + String("\"") + req.maxAmountRequired + String("\",") + String("\"") + req.payTo + String("\"]");
}
