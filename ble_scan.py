import asyncio
from bleak import BleakScanner

async def scan():
    print("Scanning for 10 seconds...")
    devices = await BleakScanner.discover(timeout=10.0, return_adv=True)
    
    print(f"\nFound {len(devices)} devices:\n")
    for addr, (device, adv_data) in devices.items():
        print(f"Name: {device.name or 'Unknown'}")
        print(f"Address: {device.address}")
        if adv_data.service_uuids:
            print(f"Services: {adv_data.service_uuids}")
        print("-" * 50)

asyncio.run(scan())
