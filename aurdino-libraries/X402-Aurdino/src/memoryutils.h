#ifndef MEMORYUTILS_H
#define MEMORYUTILS_H

#include <Arduino.h>

// Enable memory debugging - Comment out for production
// #define DEBUG_MEMORY

// Memory monitoring utilities for ESP32
#ifdef ESP32
    #include <esp_system.h>
    
    // Get free heap memory
    inline uint32_t getFreeHeap() {
        return ESP.getFreeHeap();
    }
    
    // Get minimum free heap ever recorded
    inline uint32_t getMinFreeHeap() {
        return ESP.getMinFreeHeap();
    }
    
    // Get largest free block
    inline uint32_t getMaxAllocHeap() {
        return ESP.getMaxAllocHeap();
    }
    
    // Get heap fragmentation percentage (0-100)
    inline uint8_t getHeapFragmentation() {
        uint32_t free = getFreeHeap();
        uint32_t maxAlloc = getMaxAllocHeap();
        if (free == 0) return 100;
        return 100 - ((maxAlloc * 100) / free);
    }
    
    // Print comprehensive memory stats
    inline void printMemoryStats() {
        #ifdef DEBUG_MEMORY
        Serial.println("=== Memory Statistics ===");
        Serial.print("Free Heap: ");
        Serial.print(getFreeHeap());
        Serial.println(" bytes");
        Serial.print("Min Free Heap: ");
        Serial.print(getMinFreeHeap());
        Serial.println(" bytes");
        Serial.print("Max Alloc Block: ");
        Serial.print(getMaxAllocHeap());
        Serial.println(" bytes");
        Serial.print("Fragmentation: ");
        Serial.print(getHeapFragmentation());
        Serial.println("%");
        Serial.println("========================");
        #endif
    }
    
    // Stack high water mark (FreeRTOS)
    #ifdef CONFIG_FREERTOS_UNICORE
        #include <freertos/FreeRTOS.h>
        #include <freertos/task.h>
        
        inline uint32_t getFreeStack() {
            return uxTaskGetStackHighWaterMark(NULL);
        }
        
        inline void printStackInfo() {
            #ifdef DEBUG_MEMORY
            Serial.print("Free Stack: ");
            Serial.print(getFreeStack());
            Serial.println(" words");
            #endif
        }
    #endif
    
#else
    // Generic Arduino fallback
    inline uint32_t getFreeHeap() {
        #ifdef __AVR__
            extern int __heap_start, *__brkval;
            int v;
            return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval);
        #else
            return 0;  // Not supported
        #endif
    }
    
    inline void printMemoryStats() {
        #ifdef DEBUG_MEMORY
        Serial.print("Free Heap (approx): ");
        Serial.print(getFreeHeap());
        Serial.println(" bytes");
        #endif
    }
#endif

// Memory scope guard - RAII pattern for String cleanup
class MemoryGuard {
private:
    String* _strings[10];
    uint8_t _count;
    
public:
    MemoryGuard() : _count(0) {}
    
    // Track a String for automatic cleanup
    void track(String& str) {
        if (_count < 10) {
            _strings[_count++] = &str;
        }
    }
    
    // Destructor - automatically frees all tracked Strings
    ~MemoryGuard() {
        for (uint8_t i = 0; i < _count; i++) {
            *_strings[i] = "";  // Free memory
        }
        #ifdef DEBUG_MEMORY
        Serial.print("MemoryGuard freed ");
        Serial.print(_count);
        Serial.println(" strings");
        #endif
    }
};

// Macro for memory monitoring
#ifdef DEBUG_MEMORY
    #define MEMORY_CHECKPOINT(label) \
        Serial.print("MEMORY ["); \
        Serial.print(label); \
        Serial.print("]: "); \
        Serial.print(getFreeHeap()); \
        Serial.println(" bytes free");
#else
    #define MEMORY_CHECKPOINT(label) // No-op in production
#endif

#endif // MEMORYUTILS_H
