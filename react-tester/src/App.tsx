import { useState, useEffect, useRef } from 'react'
import './types/web-bluetooth.d.ts'
import { BLEConnectionManager } from './services/ble-service'
import { Logger, getLogIcon, getLogColor, formatTimestamp } from './services/logger'
import { TestRunner, TestSequences } from './services/test-runner'
import { DEFAULT_BLE_CONFIG } from './config/ble-config'
import { TEST_SUITES, getAllTestMessages, getRandomTestMessage } from './utils/test-messages'
import type { LogEntry } from './types/interfaces'

function App() {
  const [, setLogs] = useState<LogEntry[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [deviceName, setDeviceName] = useState('')
  const [inputMessage, setInputMessage] = useState("Hello ESP32!")
  const [selectedSuite, setSelectedSuite] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [testInterval, setTestInterval] = useState(2000)
  const [logFilter, setLogFilter] = useState('all')
  const [isTestRunning, setIsTestRunning] = useState(false)
  const [testProgress, setTestProgress] = useState({ current: 0, total: 0 })

  // Service instances
  const bleManagerRef = useRef<BLEConnectionManager | null>(null)
  const loggerRef = useRef<Logger | null>(null)
  const testRunnerRef = useRef<TestRunner | null>(null)

  // Initialize services
  useEffect(() => {
    // Initialize logger
    loggerRef.current = new Logger(100, (newLogs) => {
      setLogs(newLogs)
    })

    // Initialize BLE manager
    bleManagerRef.current = new BLEConnectionManager(
      (type, message) => loggerRef.current?.log(type, message),
      (data) => {
        // Handle incoming notifications
        console.log('Notification received:', data)
      }
    )

    // Initialize test runner
    testRunnerRef.current = new TestRunner(
      async (message) => {
        if (bleManagerRef.current) {
          return await bleManagerRef.current.sendMessage(message)
        }
        return false
      },
      (current, total, message) => {
        setTestProgress({ current, total })
        loggerRef.current?.log('info', `Test ${current}/${total}: ${message.name}`)
      },
      () => {
        setIsTestRunning(false)
        setTestProgress({ current: 0, total: 0 })
        loggerRef.current?.log('success', 'Test sequence completed')
      }
    )

    return () => {
      // Cleanup
      bleManagerRef.current?.dispose()
    }
  }, [])

  // Update connection status
  useEffect(() => {
    const checkConnection = () => {
      if (bleManagerRef.current) {
        const connected = bleManagerRef.current.isConnected()
        setIsConnected(connected)
        
        if (connected) {
          const deviceInfo = bleManagerRef.current.getDeviceInfo()
          setDeviceName(deviceInfo?.name || 'Unknown')
        } else {
          setDeviceName('')
        }
      }
    }

    const interval = setInterval(checkConnection, 1000)
    return () => clearInterval(interval)
  }, [])

  // Connection handlers
  const handleConnect = async () => {
    if (!BLEConnectionManager.isSupported()) {
      loggerRef.current?.log('error', 'Web Bluetooth not supported')
      return
    }

    setIsScanning(true)
    try {
      await bleManagerRef.current?.connect(
        DEFAULT_BLE_CONFIG.deviceName,
        DEFAULT_BLE_CONFIG.serviceUuid,
        DEFAULT_BLE_CONFIG.rxCharUuid,
        DEFAULT_BLE_CONFIG.txCharUuid
      )
    } finally {
      setIsScanning(false)
    }
  }

  const handleDisconnect = async () => {
    await bleManagerRef.current?.disconnect()
    setIsTestRunning(false)
  }

  // Message sending
  const sendMessage = async (message: string = inputMessage) => {
    if (!bleManagerRef.current?.isConnected()) {
      loggerRef.current?.log('error', 'Not connected to device')
      return
    }

    setIsSending(true)
    try {
      await bleManagerRef.current.sendMessage(message)
    } finally {
      setIsSending(false)
    }
  }

  // Test execution
  const runTestSuite = async () => {
    if (!isConnected || isTestRunning) return

    const suite = TEST_SUITES[selectedSuite]
    if (!suite) return

    setIsTestRunning(true)
    testRunnerRef.current?.configure(testInterval)
    await testRunnerRef.current?.runTests(suite.messages)
  }

  const runQuickTest = async () => {
    if (!isConnected || isTestRunning) return

    const quickMessages = TestSequences.quickTest(getAllTestMessages())
    setIsTestRunning(true)
    testRunnerRef.current?.configure(1000) // Faster for quick test
    await testRunnerRef.current?.runTests(quickMessages)
  }

  const stopTest = () => {
    testRunnerRef.current?.stop()
    setIsTestRunning(false)
    setTestProgress({ current: 0, total: 0 })
  }

  const sendRandomMessage = () => {
    const randomMsg = getRandomTestMessage()
    sendMessage(randomMsg.content)
  }

  // Log management
  const clearLogs = () => {
    loggerRef.current?.clear()
  }

  const exportLogs = () => {
    if (loggerRef.current) {
      const data = loggerRef.current.export()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ble-logs-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  // Get filtered logs
  const filteredLogs = loggerRef.current?.getFilteredLogs(logFilter) || []
  const logStats = loggerRef.current?.getStats() || { total: 0, info: 0, success: 0, error: 0, send: 0, receive: 0 }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">ESP32 BLE Client</h1>
              <p className="text-gray-600 mt-1">Modular Web Bluetooth Communication Interface</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isConnected 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  isConnected ? 'bg-green-400' : 'bg-red-400'
                }`} />
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
              {deviceName && (
                <span className="text-sm text-gray-500">{deviceName}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Connection Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Connection</h2>
              
              {!isConnected ? (
                <button
                  onClick={handleConnect}
                  disabled={isScanning}
                  className="w-full bg-black text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isScanning ? 'Scanning...' : 'Connect to ESP32'}
                </button>
              ) : (
                <button
                  onClick={handleDisconnect}
                  className="w-full bg-black text-white py-3 px-4 rounded-md font-medium hover:bg-red-700 transition-colors"
                >
                  Disconnect
                </button>
              )}

              {/* Device Info */}
              <div className="mt-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Device:</span>
                  <span className="font-mono text-gray-900">{DEFAULT_BLE_CONFIG.deviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Service:</span>
                  <span className="font-mono text-gray-900 truncate ml-2" title={DEFAULT_BLE_CONFIG.serviceUuid}>
                    {DEFAULT_BLE_CONFIG.serviceUuid.slice(0, 8)}...
                  </span>
                </div>
              </div>

              {/* Log Statistics */}
              <div className="mt-6 p-4 bg-gray-50 rounded-md">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Activity Stats</h3>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium text-gray-900">{logStats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Errors:</span>
                    <span className="font-medium text-red-600">{logStats.error}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sent:</span>
                    <span className="font-medium text-blue-600">{logStats.send}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Received:</span>
                    <span className="font-medium text-purple-600">{logStats.receive}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Testing Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Testing Suite</h2>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {showAdvanced ? 'Hide' : 'Show'} Advanced
                </button>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={runQuickTest}
                  disabled={!isConnected || isTestRunning}
                  className="bg-black text-white py-2 px-4 rounded-md font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Quick Test
                </button>
                <button
                  onClick={sendRandomMessage}
                  disabled={!isConnected || isSending}
                  className="bg-black text-white py-2 px-4 rounded-md font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Random Message
                </button>
              </div>

              {/* Test Suite Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Suite
                </label>
                <select
                  value={selectedSuite}
                  onChange={(e) => setSelectedSuite(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {TEST_SUITES.map((suite, index) => (
                    <option key={index} value={index}>
                      {suite.name} ({suite.messages.length} tests)
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  {TEST_SUITES[selectedSuite]?.description}
                </p>
              </div>

              {/* Test Controls */}
              <div className="flex space-x-3 mb-6">
                <button
                  onClick={runTestSuite}
                  disabled={!isConnected || isTestRunning}
                  className="flex-1 bg-black text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isTestRunning ? 'Running Tests...' : 'Run Test Suite'}
                </button>
                {isTestRunning && (
                  <button
                    onClick={stopTest}
                    className="bg-red-600 text-white py-2 px-4 rounded-md font-medium hover:bg-red-700 transition-colors"
                  >
                    Stop
                  </button>
                )}
              </div>

              {/* Test Progress */}
              {isTestRunning && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{testProgress.current}/{testProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: testProgress.total > 0 
                          ? `${(testProgress.current / testProgress.total) * 100}%` 
                          : '0%' 
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Custom Message Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Message
                </label>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Enter message to send"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!isConnected || !inputMessage.trim() || isSending}
                    className="bg-black text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>

              {/* Advanced Options */}
              {showAdvanced && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-4">Advanced Options</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Test Interval (ms)
                      </label>
                      <input
                        type="number"
                        value={testInterval}
                        onChange={(e) => setTestInterval(Number(e.target.value))}
                        min="500"
                        max="10000"
                        step="500"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Activity Log */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">Activity Log</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={exportLogs}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Export
                    </button>
                    <button
                      onClick={clearLogs}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-900 bg-white"
                >
                  <option value="all">All ({logStats.total})</option>
                  <option value="send">Sent ({logStats.send})</option>
                  <option value="receive">Received ({logStats.receive})</option>
                  <option value="error">Errors ({logStats.error})</option>
                  <option value="info">Info ({logStats.info})</option>
                </select>
              </div>

              <div className="h-96 overflow-y-auto p-4">
                {filteredLogs.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-2xl mb-2">📋</div>
                    <p className="text-sm">No logs yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start space-x-2 p-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors text-xs"
                      >
                        <span className={getLogColor(log.type)}>
                          {getLogIcon(log.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`${getLogColor(log.type)} font-medium truncate`}>
                            {log.message}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {formatTimestamp(log.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App