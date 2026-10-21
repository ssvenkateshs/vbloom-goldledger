import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * App lock. The PIN is never stored: only a salted SHA-256 digest lives in the
 * device keychain/keystore (localStorage on web, which has no secure store).
 */
const KEY = 'goldledger.pin';

async function read(): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(KEY) ?? null;
  return SecureStore.getItemAsync(KEY);
}

async function write(value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (value === null) globalThis.localStorage?.removeItem(KEY);
    else globalThis.localStorage?.setItem(KEY, value);
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(KEY);
  else await SecureStore.setItemAsync(KEY, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

async function digest(salt: string, pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function hasPin(): Promise<boolean> {
  return (await read()) !== null;
}

export async function setPin(pin: string): Promise<void> {
  const salt = Crypto.randomUUID();
  await write(`${salt}$${await digest(salt, pin)}`);
}

export async function clearPin(): Promise<void> {
  await write(null);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await read();
  if (!stored) return true;
  const [salt, hash] = stored.split('$');
  return (await digest(salt, pin)) === hash;
}

export const PIN_LENGTH = 4;
