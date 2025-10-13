// Test utilities and patterns for ESP32 BLE testing

export const TEST_PATTERNS = {
  // Basic connectivity tests
  BASIC: [
    "Hello ESP32!",
    "Connection test",
    "Status check"
  ],
  
  // Data type tests
  DATA_TYPES: [
    "123456789", // Numbers
    "Special chars: !@#$%^&*()", // Special characters
    "UTF-8 test: 你好世界 🌍", // Unicode
    JSON.stringify({ type: "json", data: "test" }), // JSON
    "Base64: " + btoa("test data"), // Base64 encoded
  ],
  
  // Performance tests
  PERFORMANCE: [
    "Short",
    "Medium length message for testing",
    "Long message: " + "A".repeat(100),
    "Very long message: " + "B".repeat(200),
    "Max length test: " + "C".repeat(500)
  ],
  
  // Edge cases
  EDGE_CASES: [
    "", // Empty string
    " ", // Space only
    "\n\r\t", // Whitespace characters
    "🎉🔥💯🚀", // Emojis only
    Array(10).fill("duplicate").join(" "), // Repeated content
  ]
}

export const getRandomTestMessage = () => {
  const allMessages = Object.values(TEST_PATTERNS).flat()
  return allMessages[Math.floor(Math.random() * allMessages.length)]
}

export const generateStressTest = (count: number = 10) => {
  return Array.from({ length: count }, (_, i) => 
    `Stress test ${i + 1}: ${getRandomTestMessage()}`
  )
}

export const BLE_VALIDATION = {
  // Standard Nordic UART Service UUIDs
  NORDIC_UART_SERVICE: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  NORDIC_UART_RX: "6e400002-b5a3-f393-e0a9-e50e24dcca9e", 
  NORDIC_UART_TX: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
  
  // Validation functions
  isValidUUID: (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  },
  
  validateMessage: (message: string) => {
    if (message.length === 0) return { valid: false, reason: "Empty message" }
    if (message.length > 512) return { valid: false, reason: "Message too long (>512 chars)" }
    return { valid: true, reason: "Valid" }
  }
}