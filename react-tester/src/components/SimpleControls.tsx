import React, { useState, useEffect } from "react";
import type { BLEConnectionManager } from "../services/ble-service";
import { DEFAULT_BLE_CONFIG } from "../config/ble-config";

interface Props {
  bleManager: BLEConnectionManager | null;
}

export const SimpleControls: React.FC<Props> = ({ bleManager }) => {
  const [message, setMessage] = useState("Hello ESP32!");
  const [sending, setSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [responses, setResponses] = useState<string[]>([]);

  const managerReady = !!bleManager;

  // Poll connection status regularly
  useEffect(() => {
    if (!bleManager) {
      setIsConnected(false);
      setResponses([]);
      return;
    }

    const checkConnection = () => {
      setIsConnected(bleManager.isConnected());
    };

    // Check immediately
    checkConnection();

    // Then check every second
    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, [bleManager]);

  // Handle incoming ESP32 responses
  useEffect(() => {
    // We'll need to modify App.tsx to pass responses as a prop
    // For now, let's add a simple way to capture responses
    if (bleManager && window) {
      (window as any).handleBLEResponse = (data: string) => {
        setResponses(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${data}`]);
      };
    }
  }, [bleManager]);

  const handleConnect = async () => {
    if (!bleManager) {
      // Shouldn't happen when UI is disabled correctly, but guard defensively
      console.error("BLE Manager not initialized");
      return;
    }
    await bleManager.connect(
      DEFAULT_BLE_CONFIG.deviceName,
      DEFAULT_BLE_CONFIG.serviceUuid,
      DEFAULT_BLE_CONFIG.rxCharUuid,
      DEFAULT_BLE_CONFIG.txCharUuid
    );
  };

  const handleDisconnect = async () => {
    if (!bleManager) {
      throw new Error("BLE Manager not initialized");
    }
    await bleManager.disconnect();
  };

  const handleSend = async () => {
    if (!bleManager) {
      console.error("BLE Manager not initialized");
      return;
    }
    if (!isConnected) {
      console.error("Not connected to device");
      alert("Not connected to device. Please connect first.");
      return;
    }
    if (!message.trim()) {
      console.error("Empty message");
      return;
    }
    
    setSending(true);
    try {
      console.log("Attempting to send message:", message);
      const success = await bleManager.sendMessage(message);
      if (success) {
        console.log("Message sent successfully");
      } else {
        console.error("Failed to send message");
        alert("Failed to send message. Check console for details.");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert(`Error sending message: ${error}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "40px auto",
        padding: 20,
        border: "1px solid #e5e7eb",
        borderRadius: 8,
      }}
    >
      <h2 style={{ marginBottom: 12 }}>Minimal BLE Tester</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
          }}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Enter message"
        />
        <button
          className="border-2"
          onClick={handleSend}
          disabled={!isConnected || sending}
          style={{ padding: "8px 12px" }}
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {isConnected ? (
          <button
            className="border-2"
            onClick={handleDisconnect}
            disabled={!managerReady}
            style={{ padding: "8px 12px", backgroundColor: "#dc2626", color: "white" }}
          >
            Disconnect
          </button>
        ) : (
          <button
            className="border-2"
            onClick={handleConnect}
            disabled={!managerReady}
            style={{ padding: "8px 12px", backgroundColor: "#16a34a", color: "white" }}
          >
            Connect
          </button>
        )}
        <span style={{ padding: "8px 12px", color: isConnected ? "#16a34a" : "#dc2626" }}>
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* ESP32 Response Display */}
      {responses.length > 0 && (
        <div style={{ 
          marginTop: 12, 
          padding: 12, 
          backgroundColor: "#f3f4f6", 
          borderRadius: 6,
          maxHeight: 200,
          overflowY: "auto"
        }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "bold" }}>ESP32 Responses:</h3>
          {responses.map((response, index) => (
            <div key={index} style={{ 
              fontSize: "12px", 
              padding: "2px 0", 
              fontFamily: "monospace",
              color: "#374151"
            }}>
              {response}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
