# ESP32 BLE Client - Modular Architecture

A modular React TypeScript application for communicating with ESP32 devices via Web Bluetooth API.

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   └── ui-components.tsx
├── config/              # Configuration files
│   └── ble-config.ts
├── services/            # Business logic services
│   ├── ble-service.ts
│   ├── logger.ts
│   └── test-runner.ts
├── types/               # TypeScript type definitions
│   ├── interfaces.ts
│   └── web-bluetooth.d.ts
├── utils/               # Utility functions and test data
│   ├── helpers.ts
│   └── test-messages.ts
├── App.tsx              # Main application component
└── main.tsx             # Application entry point
```

## 🧩 Modular Components

### Core Services

#### 1. **BLEConnectionManager** (`services/ble-service.ts`)
Handles all Bluetooth Low Energy communication.

```typescript
import { BLEConnectionManager } from './services/ble-service'

const bleManager = new BLEConnectionManager(
  (type, message) => console.log(type, message), // Logger callback
  (data) => console.log('Received:', data)       // Notification callback
)

// Connect to device
await bleManager.connect(deviceName, serviceUuid, rxUuid, txUuid)

// Send message
await bleManager.sendMessage("Hello ESP32!")

// Check connection status
const isConnected = bleManager.isConnected()

// Disconnect
await bleManager.disconnect()
```

#### 2. **Logger** (`services/logger.ts`)
Manages activity logging with filtering and export capabilities.

```typescript
import { Logger } from './services/logger'

const logger = new Logger(100, (logs) => setLogs(logs))

// Log different types of messages
logger.log('info', 'Connection established')
logger.log('send', 'Sending: Hello ESP32!')
logger.log('receive', 'Received: Echo response')
logger.log('error', 'Connection failed')

// Get filtered logs
const errorLogs = logger.getFilteredLogs('error')

// Export logs as JSON
const exportData = logger.export()

// Clear all logs
logger.clear()
```

#### 3. **TestRunner** (`services/test-runner.ts`)
Automated test execution with progress tracking.

```typescript
import { TestRunner } from './services/test-runner'

const testRunner = new TestRunner(
  async (message) => bleManager.sendMessage(message), // Send function
  (current, total, message) => updateProgress(current, total), // Progress callback
  () => console.log('Tests completed') // Completion callback
)

// Run test sequence
await testRunner.runTests(testMessages)

// Control execution
testRunner.pause()
testRunner.resume()
testRunner.stop()
```

### Configuration

#### **BLE Configuration** (`config/ble-config.ts`)
Centralized BLE device configuration.

```typescript
import { DEFAULT_BLE_CONFIG } from './config/ble-config'

const config = {
  deviceName: "ESP32-BLE-Echo",
  serviceUuid: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  rxCharUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
  txCharUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e"
}
```

### Test Management

#### **Test Messages** (`utils/test-messages.ts`)
Organized test suites for different scenarios.

```typescript
import { TEST_SUITES, getRandomTestMessage } from './utils/test-messages'

// Access organized test suites
const basicTests = TEST_SUITES.find(suite => suite.name === 'Basic Tests')
const performanceTests = TEST_SUITES.find(suite => suite.name === 'Performance')

// Get random test message
const randomMsg = getRandomTestMessage()

// Create custom test
const customTest = createCustomTestMessage('My Test', 'Hello World', 'Custom description')
```

### UI Components

#### **Reusable Components** (`components/ui-components.tsx`)

```typescript
import { TestMessageCard, ConnectionStatus, ProgressBar } from './components/ui-components'

// Test message display
<TestMessageCard 
  message={testMessage} 
  onSend={sendMessage} 
  disabled={!isConnected} 
/>

// Connection status indicator
<ConnectionStatus 
  isConnected={isConnected} 
  deviceName="ESP32-Device" 
  isScanning={isScanning} 
/>

// Progress indicator
<ProgressBar 
  current={5} 
  total={10} 
  className="mb-4" 
/>
```

### Utilities

#### **Helper Functions** (`utils/helpers.ts`)

```typescript
import { formatBytes, copyToClipboard, downloadTextFile } from './utils/helpers'

// Format data sizes
const size = formatBytes(1024) // "1.0 KB"

// Copy to clipboard
await copyToClipboard("Text to copy")

// Download logs
downloadTextFile(JSON.stringify(logs), 'ble-logs.json')
```

## 🎯 Usage Examples

### Independent Module Usage

Each module can be used independently in other projects:

#### Using BLE Service Only
```typescript
import { BLEConnectionManager } from './services/ble-service'
import { DEFAULT_BLE_CONFIG } from './config/ble-config'

const bleManager = new BLEConnectionManager()
await bleManager.connect(
  DEFAULT_BLE_CONFIG.deviceName,
  DEFAULT_BLE_CONFIG.serviceUuid,
  DEFAULT_BLE_CONFIG.rxCharUuid,
  DEFAULT_BLE_CONFIG.txCharUuid
)
```

#### Using Logger Only
```typescript
import { Logger } from './services/logger'

const logger = new Logger(50) // Keep 50 logs max
logger.log('info', 'Application started')
```

#### Using Test Messages Only
```typescript
import { TEST_SUITES } from './utils/test-messages'

const edgeCaseTests = TEST_SUITES.find(s => s.name === 'Edge Cases')?.messages
```

### Custom Integration

#### Custom BLE Device
```typescript
// Define your own device config
const customConfig = {
  deviceName: "MyCustomDevice",
  serviceUuid: "12345678-1234-1234-1234-123456789abc",
  rxCharUuid: "12345678-1234-1234-1234-123456789abd",
  txCharUuid: "12345678-1234-1234-1234-123456789abe"
}

const bleManager = new BLEConnectionManager()
await bleManager.connect(
  customConfig.deviceName,
  customConfig.serviceUuid,
  customConfig.rxCharUuid,
  customConfig.txCharUuid
)
```

#### Custom Test Suite
```typescript
import { createCustomTestMessage } from './utils/test-messages'

const myTests = [
  createCustomTestMessage('Test 1', 'AT+VERSION', 'Get firmware version'),
  createCustomTestMessage('Test 2', 'AT+STATUS', 'Get device status'),
  createCustomTestMessage('Test 3', 'AT+RESET', 'Reset device')
]
```

## 🔧 Extension Points

The modular architecture allows easy extension:

1. **Add new test types** in `utils/test-messages.ts`
2. **Create custom loggers** extending the base `Logger` class
3. **Add new BLE protocols** by extending `BLEConnectionManager`
4. **Create new UI components** in the `components/` directory
5. **Add configuration profiles** in `config/` directory

## 📦 Exports

Each module provides clean exports for external use:

- **Services**: `BLEConnectionManager`, `Logger`, `TestRunner`
- **Types**: All interfaces and type definitions
- **Config**: Device configurations and validation functions
- **Utils**: Test messages, helper functions, and utilities
- **Components**: Reusable UI components

This modular design ensures that each component can be:
- **Tested independently**
- **Reused in other projects**
- **Extended without affecting other modules**
- **Maintained separately**
- **Imported selectively to reduce bundle size**