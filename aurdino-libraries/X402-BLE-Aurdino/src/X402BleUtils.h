#ifndef X402BLE_UTILS_H
#define X402BLE_UTILS_H

#include <Arduino.h>

// Case-insensitive string comparison utility
bool startsWithIgnoreCase(const String &s, const char *prefix);

// Payment chunk assembly - handles X-PAYMENT:START, X-PAYMENT, X-PAYMENT:END chunks
// Returns true when assembly is complete (END received), false if still assembling
bool assemblePaymentChunk(const String &chunk, String &paymentPayload);

#endif // X402BLE_UTILS_H
