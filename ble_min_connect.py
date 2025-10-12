import asyncio
from bleak import BleakScanner, BleakClient

SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
RX      = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
TX      = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"
TARGET  = "ESP32 BLE Echo"

def on_notify(_, data: bytearray):
    try:
        print("NOTIFY:", data.decode("utf-8"))
    except:
        print("NOTIFY(hex):", data.hex())

async def main():
    print("Scanning…")
    dev = await BleakScanner.find_device_by_filter(
        lambda d, ad: (d.name or "") == TARGET or (SERVICE.lower() in "".join(ad.service_uuids or []).lower()),
        timeout=12)
    if not dev:
        return print("Device not found")

    async with BleakClient(dev) as client:
        print("Connected to", dev.name or dev.address)
        await client.start_notify(TX, on_notify)

        # small settle delay helps CoreBluetooth on first notify
        await asyncio.sleep(0.3)

        print("Write with response: ping")
        await client.write_gatt_char(RX, b"ping", response=True)

        # wait to receive the echo
        await asyncio.sleep(3)

        await client.stop_notify(TX)
    print("Done.")

asyncio.run(main())
