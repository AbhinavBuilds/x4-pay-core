#ifndef PAYMENTUTILS_H
#define PAYMENTUTILS_H

#include <Arduino.h>
#include "httputils.h"

// Forward declaration
struct PaymentPayload;

// Helper function to escape JSON strings
String escapeJsonString(const String& str);

// Helper function to extract value from JSON string
String extractJsonValue(const String& json, const String& key);

// Helper function to parse payment JSON string into PaymentPayload struct
PaymentPayload parsePaymentString(const String& paymentJsonStr);

// Helper function to create payment request JSON payload
String createPaymentRequestJson(const PaymentPayload &decodedSignedPayload, const String &paymentRequirements);

// Helper function to make payment API call
HttpResponse makePaymentApiCall(const String &endpoint, const PaymentPayload &decodedSignedPayload, const String &paymentRequirements, const String &customHeaders = "");

#endif