import type { LogEntry } from '../types/interfaces'

export class Logger {
  private logs: LogEntry[] = []
  private maxLogs: number = 100
  private onUpdateCallback?: (logs: LogEntry[]) => void

  constructor(maxLogs: number = 100, onUpdate?: (logs: LogEntry[]) => void) {
    this.maxLogs = maxLogs
    this.onUpdateCallback = onUpdate
  }

  // Add a new log entry
  log(type: LogEntry['type'], message: string): void {
    const newLog: LogEntry = {
      id: Date.now() + Math.random(), // Ensure uniqueness
      timestamp: new Date(),
      type,
      message
    }

    this.logs = [newLog, ...this.logs].slice(0, this.maxLogs)
    
    if (this.onUpdateCallback) {
      this.onUpdateCallback([...this.logs])
    }
  }

  // Get all logs
  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  // Get filtered logs
  getFilteredLogs(filter: string): LogEntry[] {
    if (filter === 'all') {
      return this.getLogs()
    }
    return this.logs.filter(log => log.type === filter)
  }

  // Clear all logs
  clear(): void {
    this.logs = []
    if (this.onUpdateCallback) {
      this.onUpdateCallback([])
    }
  }

  // Get log statistics
  getStats() {
    const stats = {
      total: this.logs.length,
      info: 0,
      success: 0,
      error: 0,
      send: 0,
      receive: 0
    }

    this.logs.forEach(log => {
      stats[log.type]++
    })

    return stats
  }

  // Export logs as JSON
  export(): string {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      totalLogs: this.logs.length,
      logs: this.logs
    }, null, 2)
  }

  // Import logs from JSON
  import(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData)
      if (data.logs && Array.isArray(data.logs)) {
        this.logs = data.logs.slice(0, this.maxLogs)
        if (this.onUpdateCallback) {
          this.onUpdateCallback([...this.logs])
        }
        return true
      }
      return false
    } catch {
      return false
    }
  }
}

// Utility functions for log formatting
export const getLogIcon = (type: LogEntry['type']): string => {
  switch (type) {
    case 'success': return '✓'
    case 'error': return '✗'
    case 'send': return '↗'
    case 'receive': return '↙'
    default: return 'ℹ'
  }
}

export const getLogColor = (type: LogEntry['type']): string => {
  switch (type) {
    case 'success': return 'text-green-600'
    case 'error': return 'text-red-600'
    case 'send': return 'text-blue-600'
    case 'receive': return 'text-purple-600'
    default: return 'text-gray-600'
  }
}

export const formatTimestamp = (timestamp: Date): string => {
  return timestamp.toLocaleTimeString()
}