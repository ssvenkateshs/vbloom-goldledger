import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/**
 * Cross-platform file exchange. On native, files are written to the cache
 * directory and handed to the system share sheet (AirDrop, Drive, WhatsApp,
 * mail ...). On web, a download is triggered instead.
 */
export async function shareTextFile(fileName: string, contents: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([contents], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  await file.write(contents);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, {
    mimeType,
    dialogTitle: fileName,
    UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json',
  });
}

export async function shareFileUri(uri: string, mimeType: string, dialogTitle: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(uri, { mimeType, dialogTitle, UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : undefined });
}

/** Let the user pick a text-based file and return its contents, or null if cancelled. */
export async function pickTextFile(mimeTypes: string[]): Promise<{ name: string; text: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: mimeTypes, multiple: false, copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  if (Platform.OS === 'web') {
    if (asset.file) return { name: asset.name, text: await asset.file.text() };
    const response = await fetch(asset.uri);
    return { name: asset.name, text: await response.text() };
  }
  const file = new File(asset.uri);
  return { name: asset.name, text: await file.text() };
}

export function timestampForFileName(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}
