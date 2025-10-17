#include "httputils.h"
#include <HTTPClient.h>
#include <WiFi.h>

HttpResponse postJson(const String &url, const String &jsonPayload, const String &customHeaders)
{
    HTTPClient http;
    HttpResponse response;
    
    // Initialize response
    response.success = false;
    response.statusCode = 0;
    response.body = "";
    
    // Begin HTTP connection
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    // Add custom headers if provided
    if (customHeaders.length() > 0) {
        // Parse custom headers (expected format: "Header1: Value1\nHeader2: Value2")
        int startIndex = 0;
        int endIndex = customHeaders.indexOf('\n');
        
        while (startIndex < customHeaders.length()) {
            String headerLine;
            if (endIndex == -1) {
                headerLine = customHeaders.substring(startIndex);
                startIndex = customHeaders.length();
            } else {
                headerLine = customHeaders.substring(startIndex, endIndex);
                startIndex = endIndex + 1;
                endIndex = customHeaders.indexOf('\n', startIndex);
            }
            
            // Parse individual header (format: "HeaderName: HeaderValue")
            int colonIndex = headerLine.indexOf(':');
            if (colonIndex > 0) {
                String headerName = headerLine.substring(0, colonIndex);
                String headerValue = headerLine.substring(colonIndex + 1);
                headerName.trim();
                headerValue.trim();
                http.addHeader(headerName, headerValue);
                Serial.println("Added custom header: " + headerName + " = " + headerValue);
            }
        }
    }
    
    // Perform POST request
    int httpResponseCode = http.POST(jsonPayload);
    
    // Set response data
    response.statusCode = httpResponseCode;
    
    if (httpResponseCode > 0) {
        response.body = http.getString();
        response.success = true;
        
        // Log the request for debugging
        Serial.println("HTTP POST to: " + url);
        Serial.println("Response Code: " + String(httpResponseCode));
        Serial.println("Response Body: " + response.body);
    } else {
        // Handle HTTP errors
        response.success = false;
        Serial.println("HTTP POST Error: " + String(httpResponseCode));
        Serial.println("URL: " + url);
    }
    
    // Clean up
    http.end();
    
    return response;
}