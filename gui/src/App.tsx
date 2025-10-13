import { useState, useCallback } from 'react'

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

// BLE Configuration matching the Python app
const DEVICE_NAME = "ESP32-BLE-Echo"
const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
const RX_CHAR_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e" // write here
const TX_CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e" // notifications from here

interface ConnectionStatus {
  isConnected: boolean
  device?: BluetoothDevice
  server?: BluetoothRemoteGATTServer
  service?: BluetoothRemoteGATTService
  rxCharacteristic?: BluetoothRemoteGATTCharacteristic
  txCharacteristic?: BluetoothRemoteGATTCharacteristic
}

function App() {
  const [connection, setConnection] = useState<ConnectionStatus>({ isConnected: false })
  const [messages, setMessages] = useState<string[]>([])
  const [inputMessage, setInputMessage] = useState("Hello from React!")
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const addMessage = useCallback((message: string) => {
    setMessages(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }, [])

  const checkWebBluetoothSupport = () => {
    if (!navigator.bluetooth) {
      setError("Web Bluetooth is not supported in this browser. Please use Chrome 56+ or Edge 79+")
      return false
    }
    return true
  }

  const handleNotification = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic
    const value = target.value
    if (value) {
      const response = new TextDecoder().decode(value)
      addMessage(`ESP32 replied: ${response}`)
    }
  }, [addMessage])

  const connectToDevice = async () => {
    if (!checkWebBluetoothSupport()) return

    try {
      setIsScanning(true)
      setError(null)
      addMessage("Scanning for BLE devices...")

      // Request device with filters
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { name: DEVICE_NAME },
          { services: [SERVICE_UUID] }
        ],
        optionalServices: [SERVICE_UUID]
      })

      addMessage(`Found device: ${device.name || 'Unknown'}`)

      // Connect to GATT server
      const server = await device.gatt?.connect()
      if (!server) throw new Error("Failed to connect to GATT server")

      addMessage("Connected to GATT server")

      // Get service
      const service = await server.getPrimaryService(SERVICE_UUID)
      addMessage("Found service")

      // Get characteristics
      const rxCharacteristic = await service.getCharacteristic(RX_CHAR_UUID)
      const txCharacteristic = await service.getCharacteristic(TX_CHAR_UUID)
      
      addMessage("Found characteristics")

      // Setup notifications
      await txCharacteristic.startNotifications()
      txCharacteristic.addEventListener('characteristicvaluechanged', handleNotification)
      
      addMessage("Notifications enabled")

      setConnection({
        isConnected: true,
        device,
        server,
        service,
        rxCharacteristic,
        txCharacteristic
      })

      addMessage("✅ Successfully connected to ESP32!")

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      setError(`Connection failed: ${errorMessage}`)
      addMessage(`❌ Error: ${errorMessage}`)
    } finally {
      setIsScanning(false)
    }
  }

  const disconnect = async () => {
    if (connection.txCharacteristic) {
      try {
        connection.txCharacteristic.removeEventListener('characteristicvaluechanged', handleNotification)
        await connection.txCharacteristic.stopNotifications()
      } catch (err) {
        console.warn("Error stopping notifications:", err)
      }
    }

    if (connection.server) {
      connection.server.disconnect()
    }

    setConnection({ isConnected: false })
    addMessage("Disconnected from ESP32")
  }

  const sendMessage = async () => {
    if (!connection.isConnected || !connection.rxCharacteristic) {
      setError("Not connected to device")
      return
    }

    try {
      setError(null)
      const encoder = new TextEncoder()
      const data = encoder.encode(inputMessage)
      
      addMessage(`Sending: ${inputMessage}`)
      await connection.rxCharacteristic.writeValue(data)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      setError(`Send failed: ${errorMessage}`)
      addMessage(`❌ Send error: ${errorMessage}`)
    }
  }

  const clearMessages = () => {
    setMessages([])
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔵 ESP32 BLE Echo Client</h1>
        <p>Web Bluetooth API React Client</p>
      </header>

      <div className="connection-section">
        <div className="status">
          <span className={`status-indicator ${connection.isConnected ? 'connected' : 'disconnected'}`}>
            {connection.isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
          {connection.device && (
            <span className="device-info">
              Device: {connection.device.name || 'Unknown'}
            </span>
          )}
        </div>

        <div className="connection-controls">
          {!connection.isConnected ? (
            <button 
              onClick={connectToDevice} 
              disabled={isScanning}
              className="connect-btn"
            >
              {isScanning ? '🔍 Scanning...' : '📡 Connect to ESP32'}
            </button>
          ) : (
            <button onClick={disconnect} className="disconnect-btn">
              🚫 Disconnect
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {connection.isConnected && (
        <div className="messaging-section">
          <div className="input-section">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Enter message to send"
              className="message-input"
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button 
              onClick={sendMessage}
              className="send-btn"
              disabled={!inputMessage.trim()}
            >
              📤 Send
            </button>
          </div>
        </div>
      )}

      <div className="messages-section">
        <div className="messages-header">
          <h3>📋 Messages</h3>
          <button onClick={clearMessages} className="clear-btn">
            🗑️ Clear
          </button>
        </div>
        <div className="messages-log">
          {messages.length === 0 ? (
            <p className="no-messages">No messages yet. Connect to ESP32 to start!</p>
          ) : (
            messages.map((message, index) => (
              <div key={index} className="message">
                {message}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="info-section">
        <h3>ℹ️ Setup Instructions</h3>
        <ol>
          <li>Make sure your ESP32 is running the BLE Echo sketch</li>
          <li>Ensure your ESP32 is advertising as "{DEVICE_NAME}"</li>
          <li>Use Chrome 56+ or Edge 79+ for Web Bluetooth support</li>
          <li>Click "Connect to ESP32" to start scanning</li>
          <li>Send messages and receive echoed responses!</li>
        </ol>
      </div>
    </div>
  )
}

export default App
