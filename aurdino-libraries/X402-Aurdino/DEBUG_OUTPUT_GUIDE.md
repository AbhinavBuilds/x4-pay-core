# Debug Output Guide

## Expected Debug Output

When you call `verifyPayment(paymentJson, requirementsJson)`, you should see:

### ✅ CORRECT Flow:

```
========== parsePaymentString DEBUG ==========
INPUT paymentJsonStr length: 450
INPUT paymentJsonStr (first 100 chars): [{"x402Version":1,"scheme":"exact","network":"base-sepolia","payload":{"signature":"0x...]
Extracted versionStr: [1]

OUTPUT PaymentPayload:
  payload.x402Version: [1]
  payload.payloadJson length: 450
  payload.payloadJson (first 100 chars): [{"x402Version":1,"scheme":"exact","network":"base-sepolia","payload":{"signature":"0x...]
==============================================


========== createPaymentRequestJson DEBUG ==========
INPUT decodedSignedPayload.x402Version: [1]
INPUT decodedSignedPayload.payloadJson length: 450
INPUT decodedSignedPayload.payloadJson (first 100 chars): [{"x402Version":1,"scheme":"exact","network":"base-sepolia","payload":{"signature":"0x...]

Building JSON:
Step 1: Adding x402Version to root
  Result: {"x402Version":1
Step 2: Adding paymentPayload
  Result (first 150 chars): {"x402Version":1,"paymentPayload":{"x402Version":1,"scheme":"exact","network":"base-sepolia","payload":{"signature":"0x...
Step 3: Adding paymentRequirements

========== FINAL JSON (first 300 chars) ==========
{"x402Version":1,"paymentPayload":{"x402Version":1,"scheme":"exact","network":"base-sepolia","payload":{"signature":"0x...","authorization":{...}}},"paymentRequirements":{"scheme":"exact","network":"base-sepolia","maxAmountRequired":"1000000"...
====================================================
```

### ❌ INCORRECT Flow (If you see this, you're NOT using the new function):

```
========== parsePaymentString DEBUG ==========
INPUT paymentJsonStr length: 450
INPUT paymentJsonStr (first 100 chars): [{"x402Version":1,"scheme":"exact"...]
Extracted versionStr: [{"x402Version":1,"scheme":"exact"...}]  ← WRONG! Entire JSON extracted!

OUTPUT PaymentPayload:
  payload.x402Version: [{"x402Version":1,"scheme":"exact"...}]  ← WRONG!
  payload.payloadJson length: 0  ← EMPTY!
  payload.payloadJson (first 100 chars): []
```

## How to Use

### ✅ CORRECT Usage:

```cpp
#include "X402Aurdino.h"

String paymentJson = "{\"x402Version\":1,\"scheme\":\"exact\",\"network\":\"base-sepolia\",\"payload\":{...}}";
String requirementsJson = "{\"scheme\":\"exact\",\"network\":\"base-sepolia\",\"maxAmountRequired\":\"1000000\",...}";

// Direct JSON strings - library handles everything
bool verified = verifyPayment(paymentJson, requirementsJson);
```

### ❌ INCORRECT Usage (Old way - don't do this):

```cpp
// DON'T manually create PaymentPayload like this anymore:
PaymentPayload payload;
payload.x402Version = paymentJson;  // ❌ WRONG!
payload.payloadJson = "";
verifyPayment(payload, requirementsJson);
```

## Troubleshooting

### If you see `"x402Version":{entire JSON}` in the output:

**Problem:** You're manually creating `PaymentPayload` incorrectly

**Solution:** Use the new overloaded function:
```cpp
// Instead of this:
PaymentPayload payload;
payload.x402Version = paymentJson;
bool verified = verifyPayment(payload, requirementsJson);

// Do this:
bool verified = verifyPayment(paymentJson, requirementsJson);
```

### If you see `"paymentPayload":,` (empty):

**Problem:** The `payloadJson` field is empty because you assigned the entire JSON to `x402Version`

**Solution:** Same as above - use the overloaded function

## Summary

✅ **Use:** `verifyPayment(paymentJson, requirementsJson)` - library handles everything  
❌ **Don't:** Manually create `PaymentPayload` struct - let the library do it

The debug output will show you exactly what's being passed and constructed at each step.
