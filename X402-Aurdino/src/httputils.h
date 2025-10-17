#ifndef HTTPUTILS_H
#define HTTPUTILS_H

#include <Arduino.h>

struct HttpResponse {
    int statusCode;
    String body;
    bool success;
};

// Function to perform HTTP POST request with JSON payload
HttpResponse postJson(const String &url, const String &jsonPayload, const String &customHeaders = "");

#endif