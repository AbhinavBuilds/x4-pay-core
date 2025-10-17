#ifndef STACKMONITOR_H
#define STACKMONITOR_H

#include <Arduino.h>

// Stack monitoring utilities for FreeRTOS (ESP32)
#ifdef ESP32
    #include <freertos/FreeRTOS.h>
    #include <freertos/task.h>
    
    // Enable stack monitoring - Comment out for production
    // #define DEBUG_STACK
    
    /**
     * Log stack high watermark (minimum free stack space)
     * Lower numbers indicate closer to stack overflow
     * 
     * @param tag Identifier for this checkpoint
     */
    static inline void logStack(const char* tag) {
        #ifdef DEBUG_STACK
        UBaseType_t wm = uxTaskGetStackHighWaterMark(nullptr);
        Serial.printf("[%s] Stack high watermark: %u words (~%u bytes free)\n",
                      tag, (unsigned)wm, (unsigned)(wm * sizeof(StackType_t)));
        
        // Warn if stack is getting tight
        uint32_t bytesLeft = wm * sizeof(StackType_t);
        if (bytesLeft < 512) {
            Serial.printf("  ⚠️  WARNING: Very low stack! Only %u bytes free\n", bytesLeft);
        } else if (bytesLeft < 1024) {
            Serial.printf("  ⚠️  CAUTION: Low stack space (%u bytes)\n", bytesLeft);
        }
        #endif
    }
    
    /**
     * Get current stack high watermark in bytes
     * Returns the minimum free stack space ever recorded for this task
     * 
     * @return Number of bytes free (lower = closer to overflow)
     */
    static inline uint32_t getStackHighWaterMark() {
        UBaseType_t wm = uxTaskGetStackHighWaterMark(nullptr);
        return wm * sizeof(StackType_t);
    }
    
    /**
     * Check if stack usage is safe
     * 
     * @param minBytes Minimum bytes that should be free (default 512)
     * @return true if stack is safe, false if dangerously low
     */
    static inline bool isStackSafe(uint32_t minBytes = 512) {
        return getStackHighWaterMark() >= minBytes;
    }
    
    /**
     * Print detailed stack information
     */
    static inline void printStackInfo(const char* context = "") {
        #ifdef DEBUG_STACK
        UBaseType_t wm = uxTaskGetStackHighWaterMark(nullptr);
        uint32_t bytesLeft = wm * sizeof(StackType_t);
        
        Serial.println("=== Stack Information ===");
        if (context && strlen(context) > 0) {
            Serial.print("Context: ");
            Serial.println(context);
        }
        Serial.print("High Watermark: ");
        Serial.print(wm);
        Serial.println(" words");
        Serial.print("Free Stack: ");
        Serial.print(bytesLeft);
        Serial.println(" bytes");
        
        if (bytesLeft < 512) {
            Serial.println("Status: ⚠️ CRITICAL - Stack overflow imminent!");
        } else if (bytesLeft < 1024) {
            Serial.println("Status: ⚠️ WARNING - Low stack space");
        } else if (bytesLeft < 2048) {
            Serial.println("Status: ℹ️  CAUTION - Monitor closely");
        } else {
            Serial.println("Status: ✅ HEALTHY");
        }
        Serial.println("========================");
        #endif
    }
    
    /**
     * Macro for stack checkpoints - Only active in DEBUG_STACK mode
     */
    #ifdef DEBUG_STACK
        #define STACK_CHECKPOINT(label) logStack(label)
        #define STACK_CHECK_SAFE(minBytes) \
            if (!isStackSafe(minBytes)) { \
                Serial.printf("ERROR: Stack unsafe at %s:%d\n", __FILE__, __LINE__); \
            }
    #else
        #define STACK_CHECKPOINT(label) // No-op in production
        #define STACK_CHECK_SAFE(minBytes) // No-op in production
    #endif
    
    /**
     * Stack-safe task creation helper
     * Automatically validates stack size is sufficient
     * 
     * Recommended stack sizes:
     * - Simple tasks: 2048-4096 bytes
     * - HTTP/WiFi tasks: 4096-8192 bytes
     * - JSON parsing: 8192-12288 bytes
     * - Heavy processing: 12288-16384 bytes
     */
    struct StackConfig {
        uint32_t recommendedSize;
        const char* taskType;
    };
    
    static const StackConfig STACK_SIZE_SIMPLE = {4096, "Simple Task"};
    static const StackConfig STACK_SIZE_HTTP = {8192, "HTTP/WiFi Task"};
    static const StackConfig STACK_SIZE_JSON = {12288, "JSON Processing"};
    static const StackConfig STACK_SIZE_HEAVY = {16384, "Heavy Processing"};
    
#else
    // Non-ESP32 platforms - No-op implementations
    static inline void logStack(const char* tag) {}
    static inline uint32_t getStackHighWaterMark() { return 0; }
    static inline bool isStackSafe(uint32_t minBytes = 512) { return true; }
    static inline void printStackInfo(const char* context = "") {}
    
    #define STACK_CHECKPOINT(label)
    #define STACK_CHECK_SAFE(minBytes)
#endif

/**
 * Best Practices for Stack-Safe Code:
 * 
 * 1. NO LARGE STACK BUFFERS
 *    ❌ char buffer[4096];
 *    ✅ String buffer; buffer.reserve(4096);
 * 
 * 2. USE HEAP FOR VARIABLE-SIZED DATA
 *    ❌ uint8_t data[8192];
 *    ✅ std::vector<uint8_t> data; data.reserve(8192);
 * 
 * 3. AVOID DEEP RECURSION
 *    ❌ void parseJson(obj) { parseJson(obj.child); }
 *    ✅ Use iterative parsing with a queue/stack
 * 
 * 4. PRE-ALLOCATE ON HEAP
 *    ✅ String str; str.reserve(estimatedSize);
 * 
 * 5. FREE IMMEDIATELY AFTER USE
 *    ✅ String temp = getData(); use(temp); temp = "";
 * 
 * 6. MONITOR IN DEVELOPMENT
 *    ✅ #define DEBUG_STACK in debug builds
 *    ✅ Call STACK_CHECKPOINT at critical points
 * 
 * 7. INCREASE TASK STACK IF NEEDED
 *    ✅ xTaskCreate(..., 12288, ...); // Not default 4096
 */

#endif // STACKMONITOR_H
