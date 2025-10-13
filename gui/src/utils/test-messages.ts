import type { TestSuite, TestMessage } from '../types/interfaces'

// Basic connectivity test messages
const BASIC_TESTS: TestMessage[] = [
  {
    id: "basic-1",
    name: "Hello Test",
    content: "Hello ESP32!",
    description: "Simple greeting message"
  },
  {
    id: "basic-2",
    name: "Connection Test",
    content: "Connection test",
    description: "Basic connection verification"
  },
  {
    id: "basic-3",
    name: "Status Check",
    content: "Status check",
    description: "Device status inquiry"
  }
]

// Data type tests
const DATA_TYPE_TESTS: TestMessage[] = [
  {
    id: "data-1",
    name: "Numbers",
    content: "123456789",
    description: "Numeric data transmission"
  },
  {
    id: "data-2",
    name: "Special Characters",
    content: "Special chars: !@#$%^&*()",
    description: "Special character handling"
  },
  {
    id: "data-3",
    name: "Unicode Test",
    content: "UTF-8 test: 你好世界 🌍",
    description: "Unicode and emoji support"
  },
  {
    id: "data-4",
    name: "JSON Data",
    content: JSON.stringify({ type: "json", data: "test", timestamp: new Date().toISOString() }),
    description: "Structured JSON data"
  },
  {
    id: "data-5",
    name: "Base64 Encoded",
    content: "Base64: " + btoa("test data encoding"),
    description: "Base64 encoded content"
  }
]

// Performance test messages
const PERFORMANCE_TESTS: TestMessage[] = [
  {
    id: "perf-1",
    name: "Short Message",
    content: "Short",
    description: "Minimal data (5 chars)"
  },
  {
    id: "perf-2",
    name: "Medium Message",
    content: "Medium length message for testing data transmission",
    description: "Medium payload (~50 chars)"
  },
  {
    id: "perf-3",
    name: "Long Message",
    content: "Long message: " + "A".repeat(100),
    description: "Extended content (~114 chars)"
  },
  {
    id: "perf-4",
    name: "Very Long Message",
    content: "Very long message: " + "B".repeat(200),
    description: "Large payload (~219 chars)"
  },
  {
    id: "perf-5",
    name: "Maximum Length",
    content: "Max length test: " + "C".repeat(400),
    description: "Near MTU limit (~417 chars)"
  }
]

// Edge case tests
const EDGE_CASE_TESTS: TestMessage[] = [
  {
    id: "edge-1",
    name: "Empty String",
    content: "",
    description: "Empty message handling"
  },
  {
    id: "edge-2",
    name: "Whitespace Only",
    content: "   ",
    description: "Space-only content"
  },
  {
    id: "edge-3",
    name: "Control Characters",
    content: "\n\r\t",
    description: "Newline, carriage return, tab"
  },
  {
    id: "edge-4",
    name: "Emoji Only",
    content: "🎉🔥💯🚀",
    description: "Multiple emojis"
  },
  {
    id: "edge-5",
    name: "Repeated Content",
    content: Array(10).fill("duplicate").join(" "),
    description: "Repetitive data pattern"
  }
]

// Protocol test messages
const PROTOCOL_TESTS: TestMessage[] = [
  {
    id: "proto-1",
    name: "Command Format",
    content: "CMD:STATUS",
    description: "Command protocol test"
  },
  {
    id: "proto-2",
    name: "Query Response",
    content: "GET:VERSION",
    description: "Query command"
  },
  {
    id: "proto-3",
    name: "Binary Data Simulation",
    content: Array.from({ length: 20 }, (_, i) => String.fromCharCode(65 + i)).join(""),
    description: "Sequential ASCII characters"
  },
  {
    id: "proto-4",
    name: "Delimiter Test",
    content: "field1,field2,field3|section1;section2",
    description: "Multiple delimiters"
  }
]

// Test suites organization
export const TEST_SUITES: TestSuite[] = [
  {
    name: "Basic Tests",
    description: "Simple connectivity and echo tests",
    messages: BASIC_TESTS
  },
  {
    name: "Data Types",
    description: "Different data formats and encodings",
    messages: DATA_TYPE_TESTS
  },
  {
    name: "Performance",
    description: "Various message lengths and throughput",
    messages: PERFORMANCE_TESTS
  },
  {
    name: "Edge Cases",
    description: "Boundary conditions and special cases",
    messages: EDGE_CASE_TESTS
  },
  {
    name: "Protocol",
    description: "Command structures and formats",
    messages: PROTOCOL_TESTS
  }
]

// Utility functions
export const getAllTestMessages = (): TestMessage[] => {
  return TEST_SUITES.flatMap(suite => suite.messages)
}

export const getTestMessageById = (id: string): TestMessage | undefined => {
  return getAllTestMessages().find(msg => msg.id === id)
}

export const getRandomTestMessage = (): TestMessage => {
  const allMessages = getAllTestMessages()
  return allMessages[Math.floor(Math.random() * allMessages.length)]
}

export const generateStressTest = (count: number = 10): TestMessage[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `stress-${i + 1}`,
    name: `Stress Test ${i + 1}`,
    content: `Stress test ${i + 1}: ${getRandomTestMessage().content}`,
    description: `Automated stress test message ${i + 1}`
  }))
}

export const createCustomTestMessage = (
  name: string, 
  content: string, 
  description?: string
): TestMessage => {
  return {
    id: `custom-${Date.now()}`,
    name,
    content,
    description
  }
}