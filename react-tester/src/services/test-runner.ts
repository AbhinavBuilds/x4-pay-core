import type { TestMessage } from '../types/interfaces'

export class TestRunner {
  private isRunning: boolean = false
  private isPaused: boolean = false
  private currentTestIndex: number = 0
  private testMessages: TestMessage[] = []
  private onProgress?: (current: number, total: number, message: TestMessage) => void
  private onComplete?: () => void
  private sendMessageFunction?: (message: string) => Promise<boolean>
  private interval: number = 2000

  constructor(
    sendMessage: (message: string) => Promise<boolean>,
    onProgress?: (current: number, total: number, message: TestMessage) => void,
    onComplete?: () => void
  ) {
    this.sendMessageFunction = sendMessage
    this.onProgress = onProgress
    this.onComplete = onComplete
  }

  // Configure test parameters
  configure(interval: number = 2000) {
    this.interval = interval
  }

  // Start running tests
  async runTests(messages: TestMessage[]): Promise<void> {
    if (this.isRunning) {
      return
    }

    this.testMessages = [...messages]
    this.currentTestIndex = 0
    this.isRunning = true
    this.isPaused = false

    await this.executeTests()
  }

  // Execute test sequence
  private async executeTests(): Promise<void> {
    while (this.currentTestIndex < this.testMessages.length && this.isRunning) {
      if (this.isPaused) {
        await new Promise(resolve => {
          const checkPause = () => {
            if (!this.isPaused || !this.isRunning) {
              resolve(void 0)
            } else {
              setTimeout(checkPause, 100)
            }
          }
          checkPause()
        })
      }

      if (!this.isRunning) break

      const currentMessage = this.testMessages[this.currentTestIndex]
      
      // Notify progress
      if (this.onProgress) {
        this.onProgress(this.currentTestIndex + 1, this.testMessages.length, currentMessage)
      }

      // Send the message
      if (this.sendMessageFunction) {
        await this.sendMessageFunction(currentMessage.content)
      }

      this.currentTestIndex++

      // Wait for interval (except for the last message)
      if (this.currentTestIndex < this.testMessages.length && this.isRunning) {
        await new Promise(resolve => setTimeout(resolve, this.interval))
      }
    }

    // Test sequence completed
    this.isRunning = false
    this.isPaused = false
    
    if (this.onComplete) {
      this.onComplete()
    }
  }

  // Pause test execution
  pause(): void {
    this.isPaused = true
  }

  // Resume test execution
  resume(): void {
    this.isPaused = false
  }

  // Stop test execution
  stop(): void {
    this.isRunning = false
    this.isPaused = false
    this.currentTestIndex = 0
  }

  // Get current test status
  getStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      current: this.currentTestIndex,
      total: this.testMessages.length,
      progress: this.testMessages.length > 0 ? (this.currentTestIndex / this.testMessages.length) * 100 : 0
    }
  }

  // Skip to next test
  skipCurrent(): void {
    if (this.isRunning && this.currentTestIndex < this.testMessages.length) {
      this.currentTestIndex++
    }
  }

  // Run a single test message
  async runSingleTest(message: TestMessage): Promise<boolean> {
    if (this.sendMessageFunction) {
      return await this.sendMessageFunction(message.content)
    }
    return false
  }
}

// Predefined test sequences
export class TestSequences {
  // Quick connectivity test (3 messages, fast)
  static quickTest(messages: TestMessage[]): TestMessage[] {
    return messages.slice(0, 3)
  }

  // Comprehensive test (all message types)
  static comprehensiveTest(messages: TestMessage[]): TestMessage[] {
    return messages
  }

  // Performance test (size-based progression)
  static performanceTest(messages: TestMessage[]): TestMessage[] {
    return messages
      .filter(msg => msg.name.toLowerCase().includes('message'))
      .sort((a, b) => a.content.length - b.content.length)
  }

  // Stress test (rapid-fire messages)
  static stressTest(messages: TestMessage[], count: number = 20): TestMessage[] {
    const selected = messages.slice(0, Math.min(count, messages.length))
    return Array(count).fill(null).map((_, i) => selected[i % selected.length])
  }

  // Edge case test (problematic inputs)
  static edgeCaseTest(messages: TestMessage[]): TestMessage[] {
    return messages.filter(msg => 
      msg.description?.toLowerCase().includes('edge') ||
      msg.content === '' ||
      msg.content.includes('\n') ||
      msg.content.length > 200
    )
  }
}