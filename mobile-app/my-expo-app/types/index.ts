declare global {
  interface Navigator {
    bluetooth?: any;
  }
}

 type BluetoothDevice = any;
 type BluetoothRemoteGATTServer = any;
 type BluetoothRemoteGATTCharacteristic = any;

export type GattRefs = {
  device?: BluetoothDevice;
  server?: BluetoothRemoteGATTServer;
  rx?: BluetoothRemoteGATTCharacteristic;
  tx?: BluetoothRemoteGATTCharacteristic;
};

export type PaymentRequirements = {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: {
    name: string;
    version: string;
  };
};

