import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Root HTML for the static web build. Runs only in Node during export.
 * Adds the cross-origin isolation service worker so the on-device SQLite
 * database works on hosts that cannot set response headers (GitHub Pages).
 */
export default function Root({ children }: PropsWithChildren) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();
  const base = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');
  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="theme-color" content="#0C0B09" />
        <meta name="color-scheme" content="dark" />
        <meta name="description" content="Stock, rates, people and ledger for private gold jewellers. Offline-first, open formats." />
        <script src={`${base}/coi-serviceworker.js`} />
        {headNodes}
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'html, body { background: #0C0B09; } #root { min-height: 100%; }' }} />
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
