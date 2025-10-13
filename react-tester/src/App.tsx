import { useEffect, useState } from 'react'
import { BLEConnectionManager } from './services/ble-service'
import { SimpleControls } from './components/SimpleControls'

export default function App() {
  const [bleManager, setBleManager] = useState<BLEConnectionManager | null>(null)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    const mgr = new BLEConnectionManager((type, msg) => {
      // minimal logging to console
      console.log(type, msg)
    }, (data) => {
      console.log('notification', data)
      // Send ESP32 response to SimpleControls via global handler
      if ((window as any).handleBLEResponse) {
        (window as any).handleBLEResponse(data)
      }
    })

    setBleManager(mgr)
    setSupported(BLEConnectionManager.isSupported())

    return () => {
      mgr.dispose()
    }
  }, [])

  if (!supported) {
    return <div style={{ padding: 20 }}>Web Bluetooth not supported in this browser.</div>
  }

  return (
    <div>
      <SimpleControls bleManager={bleManager} />
    </div>
  )
}