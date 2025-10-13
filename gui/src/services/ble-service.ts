import type { ConnectionStatus, LogEntry } from '../types/interfaces'

export class BLEConnectionManager {
  private connection: ConnectionStatus = { isConnected: false }
  private onLogCallback?: (type: LogEntry['type'], message: string) => void
  private onNotificationCallback?: (data: string) => void

  constructor(
    onLog?: (type: LogEntry['type'], message: string) => void,
    onNotification?: (data: string) => void
  ) {
    this.onLogCallback = onLog
    this.onNotificationCallback = onNotification
  }

  // Check if Web Bluetooth is supported
  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator
  }

  // Get current connection status
  getConnection(): ConnectionStatus {
    return { ...this.connection }
  }

  // Check if currently connected
  isConnected(): boolean {
    return this.connection.isConnected
  }

  // Log messages
  private log(type: LogEntry['type'], message: string) {
    if (this.onLogCallback) {
      this.onLogCallback(type, message)
    }
  }

  // Handle incoming notifications
  private handleNotification = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic
    const value = target.value
    if (value) {
      const response = new TextDecoder().decode(value)
      this.log('receive', `Received: ${response}`)
      if (this.onNotificationCallback) {
        this.onNotificationCallback(response)
      }
    }
  }

  // Connect to BLE device
  async connect(
    deviceName: string,
    serviceUuid: string,
    rxCharUuid: string,
    txCharUuid: string
  ): Promise<boolean> {
    if (!BLEConnectionManager.isSupported()) {
      this.log('error', "Web Bluetooth API not supported")
      return false
    }

    try {
      this.log('info', "Scanning for BLE devices...")

      // Request device
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { name: deviceName },
          { services: [serviceUuid] }
        ],
        optionalServices: [serviceUuid]
      })

      this.log('info', `Found device: ${device.name || 'Unknown'}`)

      // Connect to GATT server
      const server = await device.gatt?.connect()
      if (!server) {
        throw new Error("Failed to connect to GATT server")
      }

      this.log('info', "Connected to GATT server")

      // Get service and characteristics
      const service = await server.getPrimaryService(serviceUuid)
      const rxCharacteristic = await service.getCharacteristic(rxCharUuid)
      const txCharacteristic = await service.getCharacteristic(txCharUuid)
      
      // Setup notifications
      await txCharacteristic.startNotifications()
      txCharacteristic.addEventListener('characteristicvaluechanged', this.handleNotification)
      
      // Update connection status
      this.connection = {
        isConnected: true,
        device,
        server,
        service,
        rxCharacteristic,
        txCharacteristic
      }

      this.log('success', "Successfully connected to device")
      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      this.log('error', `Connection failed: ${errorMessage}`)
      return false
    }
  }

  // Disconnect from BLE device
  async disconnect(): Promise<void> {
    if (this.connection.txCharacteristic) {
      try {
        this.connection.txCharacteristic.removeEventListener('characteristicvaluechanged', this.handleNotification)
        await this.connection.txCharacteristic.stopNotifications()
      } catch (err) {
        this.log('error', `Error stopping notifications: ${err}`)
      }
    }

    if (this.connection.server) {
      this.connection.server.disconnect()
    }

    this.connection = { isConnected: false }
    this.log('info', "Disconnected from device")
  }

  // Send message to device
  async sendMessage(message: string): Promise<boolean> {
    if (!this.connection.isConnected || !this.connection.rxCharacteristic) {
      this.log('error', "Not connected to device")
      return false
    }

    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(message)
      
      this.log('send', `Sending: ${message}`)
      await this.connection.rxCharacteristic.writeValue(data)
      return true
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      this.log('error', `Send failed: ${errorMessage}`)
      return false
    }
  }

  // Get device information
  getDeviceInfo() {
    if (!this.connection.device) {
      return null
    }

    return {
      name: this.connection.device.name || 'Unknown',
      connected: this.connection.isConnected
    }
  }

  // Cleanup resources
  dispose(): void {
    if (this.connection.isConnected) {
      this.disconnect()
    }
  }
}