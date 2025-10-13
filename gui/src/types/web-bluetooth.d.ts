// Web Bluetooth API TypeScript declarations
declare global {
  interface Navigator {
    bluetooth: Bluetooth
  }
  
  interface Bluetooth {
    requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>
  }
  
  interface RequestDeviceOptions {
    filters?: BluetoothLEScanFilter[]
    optionalServices?: BluetoothServiceUUID[]
  }
  
  interface BluetoothLEScanFilter {
    name?: string
    services?: BluetoothServiceUUID[]
  }
  
  type BluetoothServiceUUID = string
  
  interface BluetoothDevice {
    name?: string
    gatt?: BluetoothRemoteGATTServer
  }
  
  interface BluetoothRemoteGATTServer {
    connected: boolean
    connect(): Promise<BluetoothRemoteGATTServer>
    disconnect(): void
    getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>
  }
  
  interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>
  }
  
  interface BluetoothRemoteGATTCharacteristic extends EventTarget {
    value?: DataView
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
    stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
    writeValue(value: BufferSource): Promise<void>
  }
}

export {};