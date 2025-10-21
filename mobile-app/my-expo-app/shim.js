// src/shim.ts
import 'react-native-url-polyfill/auto'; // URL, URLSearchParams, etc.
import 'react-native-get-random-values'; // window.crypto.getRandomValues (polyfill helper)
// Note: Avoid react-native-webcrypto to prevent native dependency in dev client

// Buffer
import { Buffer } from 'buffer';
if (!global.Buffer) global.Buffer = Buffer;

// process
import process from 'process';
if (!global.process) global.process = process;
