# app.py — robust macOS BLE client for ESP32 Echo
# pip install bleak

import asyncio
from bleak import BleakScanner, BleakClient

DEVICE_NAME  = "ESP32-BLE-Echo"
SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
RX_CHAR_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"  # write here
TX_CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"  # notifications come from here

MESSAGE_TO_SEND = "Hello from Python!"

async def find_target(timeout: float = 10.0):
    """
    Use BleakScanner.find_device_by_filter so we can match either by name
    or by advertised service UUIDs, without touching .metadata.
    """
    def _flt(d, ad):
        try:
            # match by name first (most reliable/cheap)
            if d.name == DEVICE_NAME:
                return True
            # otherwise match by advertised service UUIDs if present
            if ad and getattr(ad, "service_uuids", None):
                return any(u.lower() == SERVICE_UUID.lower() for u in ad.service_uuids)
        except Exception:
            pass
        return False

    dev = await BleakScanner.find_device_by_filter(_flt, timeout=timeout)
    return dev

async def main():
    print("Scanning for BLE devices...")
    target = await find_target(timeout=12.0)

    if not target:
        # As a helpful fallback, list what we saw so you can confirm the name
        print("Target not found. Nearby devices:")
        try:
            # In newer bleak you can get (device, adv) pairs via detection callbacks,
            # but for compatibility just list names/addresses from discover()
            devices = await BleakScanner.discover(timeout=6.0)
            for d in devices:
                print(f"  - {d.name or '(no name)'}  [{d.address}]")
        except Exception:
            pass
        raise SystemExit("Make sure the ESP32 is powered and advertising as 'ESP32-BLE-Echo'.")

    print(f"Connecting to: {target.name} ({target.address})")
    async with BleakClient(target) as client:
        if not client.is_connected:
            raise RuntimeError("Failed to connect.")

        # Subscribe to notifications first
        def handle_notification(_, data: bytearray):
            print("ESP32 replied:", data.decode(errors="ignore"))

        await client.start_notify(TX_CHAR_UUID, handle_notification)

        # Try larger MTU where supported (safe to ignore failures on macOS)
        try:
            await client.exchange_mtu(247)
        except Exception:
            pass

        # Optional: sanity-check that the expected characteristics exist
        try:
            svcs = await client.get_services()
            if RX_CHAR_UUID not in [c.uuid for s in svcs for c in s.characteristics]:
                print("Warning: RX characteristic UUID not found in service table.")
            if TX_CHAR_UUID not in [c.uuid for s in svcs for c in s.characteristics]:
                print("Warning: TX characteristic UUID not found in service table.")
        except Exception:
            pass

        print("Sending:", MESSAGE_TO_SEND)
        await client.write_gatt_char(RX_CHAR_UUID, MESSAGE_TO_SEND.encode("utf-8"), response=True)

        # Wait briefly for the notify callback to print the response
        await asyncio.sleep(2.0)

        await client.stop_notify(TX_CHAR_UUID)

if __name__ == "__main__":
    asyncio.run(main())
