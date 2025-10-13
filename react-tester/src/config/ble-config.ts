import type { BLEConfig } from '../types/interfaces'

// Default ESP32 BLE Echo configuration
export const DEFAULT_BLE_CONFIG: BLEConfig = {
  deviceName: "ESP32-BLE-Echo",
  serviceUuid: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  rxCharUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e", // Write to ESP32
  txCharUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e"  // Notifications from ESP32
}

// Nordic UART Service UUIDs (commonly used in ESP32 projects)
export const NORDIC_UART_SERVICE = {
  SERVICE: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  RX: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
  TX: "6e400003-b5a3-f393-e0a9-e50e24dcca9e"
}

// UUID validation
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isValidUUID = (uuid: string): boolean => {
  return UUID_REGEX.test(uuid)
}

// Message validation
export const validateMessage = (message: string) => {
  if (message.length === 0) {
    return { valid: false, reason: "Empty message" }
  }
  if (message.length > 512) {
    return { valid: false, reason: "Message too long (>512 chars)" }
  }
  return { valid: true, reason: "Valid" }
}