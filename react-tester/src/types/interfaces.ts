export interface ConnectionStatus {
  isConnected: boolean
  device?: BluetoothDevice
  server?: BluetoothRemoteGATTServer
  service?: BluetoothRemoteGATTService
  rxCharacteristic?: BluetoothRemoteGATTCharacteristic
  txCharacteristic?: BluetoothRemoteGATTCharacteristic
}

export interface LogEntry {
  id: number
  timestamp: Date
  type: 'info' | 'success' | 'error' | 'send' | 'receive'
  message: string
}

export interface BLEConfig {
  deviceName: string
  serviceUuid: string
  rxCharUuid: string
  txCharUuid: string
}

export interface TestMessage {
  id: string
  name: string
  content: string
  description?: string
}

export interface TestSuite {
  name: string
  description: string
  messages: TestMessage[]
}