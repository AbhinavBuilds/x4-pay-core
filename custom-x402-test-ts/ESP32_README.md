# ESP32 X402 Payment Client

This directory contains a C++ implementation of the X402 payment client optimized for ESP32 microcontrollers.

## Files

- `customized_cpp.h` - Header file with class definition and declarations
- `customized_cpp.cpp` - Implementation of the X402Client class
- `esp32_main.ino` - Arduino IDE sketch file for ESP32

## Dependencies

Make sure you have the following libraries installed in your Arduino IDE:

1. **WiFi** - Built-in ESP32 library for WiFi connectivity
2. **HTTPClient** - Built-in ESP32 library for HTTP requests
3. **ArduinoJson** - JSON parsing library (install via Library Manager)

## Installation

1. Install the Arduino IDE and ESP32 board package
2. Install the ArduinoJson library:
   - Go to Tools → Manage Libraries
   - Search for "ArduinoJson" by Benoit Blanchon
   - Install version 6.x or later

## Configuration

1. Open `esp32_main.ino` in Arduino IDE
2. Update WiFi credentials:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
3. Modify network settings in `customized_cpp.cpp` if needed:
   - Change the `network` variable to your desired blockchain network
   - Update `to` address and `value` as needed

## Features

- **Multi-network Support**: Supports various EVM networks (Base, Avalanche, IoTeX, Sei, Polygon, etc.)
- **USDC Integration**: Configured for USDC payments across different networks
- **WiFi Connectivity**: Automatic WiFi connection and management
- **HTTP Communication**: Secure communication with X402 facilitator
- **JSON Processing**: Efficient JSON parsing and serialization
- **Error Handling**: Comprehensive error reporting and debugging

## Usage

1. Upload the sketch to your ESP32
2. Open Serial Monitor (115200 baud)
3. The device will:
   - Connect to WiFi
   - Verify payment requirements
   - Attempt to settle payments
   - Display results in Serial Monitor

## API Methods

### X402Client Class

- `initWiFi(ssid, password)` - Initialize WiFi connection
- `getAsset(network)` - Get USDC asset info for a network
- `verify(signedPayload)` - Verify payment with facilitator
- `settle(signedPayload)` - Settle payment through facilitator
- `run(signedPayload)` - Execute complete payment flow

## Network Configuration

The client supports the following networks:

| Network | Chain ID | USDC Address |
|---------|----------|--------------|
| base-sepolia | 84532 | 0x036CbD53842c5426634e7929541eC2318f3dCF7e |
| base | 8453 | 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 |
| avalanche-fuji | 43113 | 0x5425890298aed601595a70AB815c96711a31Bc65 |
| avalanche | 43114 | 0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E |
| polygon | 137 | 0x3c499c542cef5e3811e1192ce70d8cc03d5c3359 |

## Troubleshooting

1. **WiFi Connection Issues**:
   - Check SSID and password
   - Ensure ESP32 is within range
   - Verify 2.4GHz network (ESP32 doesn't support 5GHz)

2. **HTTP Request Failures**:
   - Check internet connectivity
   - Verify facilitator URL is accessible
   - Ensure proper SSL/TLS support

3. **Memory Issues**:
   - Reduce JSON document sizes if needed
   - Monitor free heap memory with `ESP.getFreeHeap()`

4. **Compilation Errors**:
   - Ensure all required libraries are installed
   - Check ESP32 board package version
   - Verify ArduinoJson library compatibility

## Memory Considerations

The ESP32 has limited RAM, so the implementation uses:
- Dynamic JSON documents with appropriate sizes
- String references where possible
- Efficient memory management in HTTP operations

## Security Notes

- This implementation is for development and testing
- For production use, implement proper certificate validation
- Consider storing sensitive data in ESP32's secure storage
- Implement proper error handling for network failures

## Performance

- WiFi connection: ~2-5 seconds
- HTTP requests: ~1-3 seconds each
- JSON processing: ~100-500ms depending on payload size
- Total payment flow: ~5-10 seconds

## Future Enhancements

- Add support for hardware wallet integration
- Implement local payment validation
- Add support for multiple payment tokens
- Create web interface for configuration
- Add OTA (Over-The-Air) update capability