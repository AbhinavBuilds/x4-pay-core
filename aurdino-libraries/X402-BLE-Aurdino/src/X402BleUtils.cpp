#include "X402BleUtils.h"
#include <cctype>

// Memory-optimized case-insensitive comparison using direct char comparison
bool startsWithIgnoreCase(const String &s, const char *prefix)
{
    size_t prefix_len = strlen(prefix);
    if (s.length() < prefix_len)
        return false;
    
    const char* s_ptr = s.c_str();
    for (size_t i = 0; i < prefix_len; ++i)
    {
        char a = tolower(s_ptr[i]);
        char b = tolower(prefix[i]);
        if (a != b)
            return false;
    }
    return true;
}

// Memory-optimized payment chunk assembly with proper capacity management
// Frontend sends: "X-PAYMENT:START<data>", "X-PAYMENT<data>", ..., "X-PAYMENT:END<data>"
// Returns true when complete (END received), false while still assembling
bool assemblePaymentChunk(const String &chunk, String &paymentPayload)
{
    const char* chunk_ptr = chunk.c_str();
    
    if (strncmp(chunk_ptr, "X-PAYMENT:START", 15) == 0)
    {
        // Start of new payment - clear existing and start fresh
        paymentPayload = "";
        paymentPayload.reserve(1024); // Pre-allocate expected payload size
        paymentPayload += (chunk_ptr + 15); // Skip "X-PAYMENT:START"
        return false; // Not complete yet
    }
    else if (strncmp(chunk_ptr, "X-PAYMENT:END", 13) == 0)
    {
        // End of payment - append final chunk
        paymentPayload += (chunk_ptr + 13); // Skip "X-PAYMENT:END"
        return true; // Assembly complete
    }
    else if (strncmp(chunk_ptr, "X-PAYMENT", 9) == 0)
    {
        // Middle chunk - append data efficiently
        paymentPayload += (chunk_ptr + 9); // Skip "X-PAYMENT"
        return false; // Not complete yet
    }
    
    // Not a payment chunk
    return false;
}
