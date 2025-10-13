import type { TestMessage } from '../types/interfaces'

interface TestMessageCardProps {
  message: TestMessage
  onSend: (message: string) => void
  disabled?: boolean
}

export const TestMessageCard: React.FC<TestMessageCardProps> = ({ 
  message, 
  onSend, 
  disabled = false 
}) => {
  return (
    <button
      onClick={() => onSend(message.content)}
      disabled={disabled}
      className="text-left p-3 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
    >
      <div className="font-medium text-gray-900 truncate">{message.name}</div>
      <div className="text-xs text-gray-500 truncate">{message.content}</div>
      <div className="text-xs text-gray-400 mt-1">{message.content.length} chars</div>
    </button>
  )
}

interface ConnectionStatusProps {
  isConnected: boolean
  deviceName?: string
  isScanning?: boolean
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  isConnected, 
  deviceName, 
  isScanning = false 
}) => {
  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
      isConnected 
        ? 'bg-green-100 text-green-800' 
        : isScanning 
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-red-100 text-red-800'
    }`}>
      <div className={`w-2 h-2 rounded-full mr-2 ${
        isConnected 
          ? 'bg-green-400' 
          : isScanning 
          ? 'bg-yellow-400 animate-pulse'
          : 'bg-red-400'
      }`} />
      {isScanning ? 'Scanning...' : isConnected ? 'Connected' : 'Disconnected'}
      {deviceName && isConnected && (
        <span className="ml-2 text-xs opacity-75">({deviceName})</span>
      )}
    </div>
  )
}

interface ProgressBarProps {
  current: number
  total: number
  className?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  current, 
  total, 
  className = '' 
}) => {
  const percentage = total > 0 ? (current / total) * 100 : 0
  
  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>Progress</span>
        <span>{current}/{total}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
                            <div className="text-xs text-gray-500 text-center">
                        {percentage.toFixed(1)}%
                      </div>
    </div>
  )
}