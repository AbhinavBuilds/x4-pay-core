#include "httputils.h"
#include "stackmonitor.h"
#include <HTTPClient.h>
#include <WiFi.h>

HttpResponse postJson(const String &url, const String &jsonPayload, const String &customHeaders)
{
    STACK_CHECKPOINT("postJson:start");

    HTTPClient http;
    HttpResponse response;

    // Initialize response with minimal memory allocation
    response.success = false;
    response.statusCode = 0;
    response.body = "";
    response.body.reserve(512); // Pre-allocate expected response size

    // Begin HTTP connection
    if (!http.begin(url))
    {
        Serial.println("ERROR: HTTP begin failed");
        return response;
    }

    // Enable redirect following (important for 301/302/307/308 responses)
    http.setFollowRedirects(HTTPC_FORCE_FOLLOW_REDIRECTS);

    // Default content type
    http.addHeader("Content-Type", "application/json");

    // Log request
    Serial.println("\n========== HTTP REQUEST ==========");
    Serial.print("URL: ");
    Serial.println(url);
    Serial.println("Headers:");
    Serial.println("  Content-Type: application/json");

    // Add custom headers if provided - Memory optimized
    if (customHeaders.length() > 0)
    {
        int startIndex = 0;
        int endIndex = customHeaders.indexOf('\n');

        while (startIndex < customHeaders.length())
        {
            String headerLine;
            headerLine.reserve(100); // Pre-allocate for header line

            if (endIndex == -1)
            {
                headerLine = customHeaders.substring(startIndex);
                startIndex = customHeaders.length();
            }
            else
            {
                headerLine = customHeaders.substring(startIndex, endIndex);
                startIndex = endIndex + 1;
                endIndex = customHeaders.indexOf('\n', startIndex);
            }

            // Parse individual header (format: "HeaderName: HeaderValue")
            int colonIndex = headerLine.indexOf(':');
            if (colonIndex > 0)
            {
                String headerName = headerLine.substring(0, colonIndex);
                String headerValue = headerLine.substring(colonIndex + 1);
                headerName.trim();
                headerValue.trim();
                http.addHeader(headerName, headerValue);

                Serial.print("  ");
                Serial.print(headerName);
                Serial.print(": ");
                Serial.println(headerValue);

                // Free memory immediately
                headerName = "";
                headerValue = "";
            }
            headerLine = ""; // Free memory
        }
    }

    Serial.print("Payload Length: ");
    Serial.println(jsonPayload.length());
    Serial.print("Payload: ");
    Serial.println(jsonPayload);
    Serial.println("==================================\n");

    // Perform POST request
    int httpResponseCode = http.POST(jsonPayload);

    STACK_CHECKPOINT("postJson:after_post");

    // Set response data
    response.statusCode = httpResponseCode;

    if (httpResponseCode > 0)
    {
        response.body = http.getString();
        response.success = (httpResponseCode >= 200 && httpResponseCode < 300);

        // Always log response for debugging
        Serial.println("\n========== HTTP RESPONSE ==========");
        Serial.print("POST to: ");
        Serial.println(url);
        Serial.print("Status Code: ");
        Serial.println(httpResponseCode);
        Serial.print("Response Body Length: ");
        Serial.println(response.body.length());
        Serial.print("Response Body: ");
        Serial.println(response.body);
        Serial.println("===================================\n");

    }
    else
    {
        // Handle HTTP errors (connection errors, negative codes)
        response.success = false;
        Serial.println("\n========== HTTP ERROR ==========");
        Serial.print("ERROR: HTTP POST failed - Code: ");
        Serial.println(httpResponseCode);
        Serial.print("URL: ");
        Serial.println(url);
        Serial.println("================================\n");
    }

    // Clean up HTTP client - This releases connection resources
    http.end();

    STACK_CHECKPOINT("postJson:end");

    return response;
}