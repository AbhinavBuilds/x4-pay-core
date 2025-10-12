import asyncio
from bleak import BleakScanner, BleakClient

SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
RX      = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
TX      = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"
TARGET  = "ESP32 BLE Echo"

def on_notify(_, data: bytearray):
    try:
        print("  NOTIFY:", data.decode("utf-8"))
    except:
        print("  NOTIFY (hex):", data.hex())

async def connect_and_test(attempt):
    print(f"\n=== Attempt {attempt} ===")
    print("Scanning…")
    def match(d, ad):
        return (d.name or "") == TARGET or (SERVICE.lower() in "".join(ad.service_uuids or []).lower())
    dev = await BleakScanner.find_device_by_filter(match, timeout=10)
    if not dev:
        print(f"  ❌ Device not found"); 
        return False

    async with BleakClient(dev) as client:
        print(f"  ✓ Connected to {dev.name or dev.address}")
        await client.start_notify(TX, on_notify)
        await asyncio.sleep(0.3)
        
        print(f"  → Writing: test_{attempt}")
        await client.write_gatt_char(RX, f"test_{attempt}".encode(), response=True)
        await asyncio.sleep(2)
        
        await client.stop_notify(TX)
    print(f"  ✓ Disconnected")
    return True

async def main():
    print("Testing reconnection capability...")
    print("This will connect 3 times to verify the ESP32 restarts advertising")
    
    for i in range(1, 4):
        success = await connect_and_test(i)
        if not success:
            print(f"\n❌ Failed on attempt {i}")
            print("Please upload the updated sketch_oct12a.ino to your ESP32")
            return
        if i < 3:
            print("\nWaiting 2 seconds before next connection...")
            await asyncio.sleep(2)
    
    print("\n✅ All 3 connections successful! Reconnection issue is fixed!")

asyncio.run(main())
