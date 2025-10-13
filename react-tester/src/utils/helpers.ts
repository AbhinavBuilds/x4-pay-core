// Utility functions for the BLE application

// Format bytes to human readable format
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

// Format duration in milliseconds
export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

// Generate unique ID
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Truncate text with ellipsis
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.substr(0, maxLength - 3) + '...'
}

// Copy text to clipboard
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
    return false
  }
}

// Download text as file
export const downloadTextFile = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Validate hex string
export const isValidHex = (hex: string): boolean => {
  return /^[0-9A-Fa-f]+$/.test(hex)
}

// Convert string to hex
export const stringToHex = (str: string): string => {
  return Array.from(str)
    .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join(' ')
}

// Convert hex to string
export const hexToString = (hex: string): string => {
  return hex
    .split(' ')
    .map(byte => String.fromCharCode(parseInt(byte, 16)))
    .join('')
}

// Debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(null, args), wait)
  }
}

// Throttle function
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Calculate message throughput
export const calculateThroughput = (
  messageCount: number, 
  totalBytes: number, 
  durationMs: number
): { messagesPerSecond: number; bytesPerSecond: number } => {
  const seconds = durationMs / 1000
  
  return {
    messagesPerSecond: messageCount / seconds,
    bytesPerSecond: totalBytes / seconds
  }
}

// Local storage helpers
export const storage = {
  set: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (err) {
      console.error('Failed to save to localStorage:', err)
    }
  },
  
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue || null
    } catch (err) {
      console.error('Failed to read from localStorage:', err)
      return defaultValue || null
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key)
    } catch (err) {
      console.error('Failed to remove from localStorage:', err)
    }
  },
  
  clear: (): void => {
    try {
      localStorage.clear()
    } catch (err) {
      console.error('Failed to clear localStorage:', err)
    }
  }
}