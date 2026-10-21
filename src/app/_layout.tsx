import * as Crypto from 'expo-crypto';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { DATABASE_NAME, migrateDatabase } from '@/data';
import { setIdGenerator } from '@/domain';
import { Gate } from '@/features/Gate';
import { AppStateProvider, SettingsProvider } from '@/state';
import { Palette } from '@/theme';

SplashScreen.preventAutoHideAsync();
setIdGenerator(() => Crypto.randomUUID());

const colors = Palette.dark;

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider
      value={{
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: colors.accent,
          background: colors.background,
          card: colors.background,
          text: colors.text,
          border: colors.border,
        },
      }}>
      <SQLiteProvider
        databaseName={DATABASE_NAME}
        onInit={migrateDatabase}
        useSuspense={false}
        onError={(e) => console.error('Database failed to open', e)}>
        <SettingsProvider>
          <AppStateProvider>
            <StatusBar style="light" />
            <Gate>
              <Stack
                screenOptions={{
                  headerTintColor: colors.accent,
                  headerTitleStyle: { color: colors.text, fontWeight: '600' },
                  headerStyle: { backgroundColor: colors.background },
                  headerShadowVisible: false,
                  contentStyle: { backgroundColor: colors.background },
                }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="item/[id]" options={{ title: 'Item' }} />
                <Stack.Screen name="item/edit" options={{ title: 'Item' }} />
                <Stack.Screen name="party/[id]" options={{ title: 'Party' }} />
                <Stack.Screen name="party/edit" options={{ title: 'Party' }} />
                <Stack.Screen name="transaction/[id]" options={{ title: 'Transaction' }} />
                <Stack.Screen name="transaction/new" options={{ title: 'New transaction' }} />
                <Stack.Screen name="pick/party" options={{ title: 'Choose party', presentation: 'modal' }} />
                <Stack.Screen name="pick/item" options={{ title: 'Choose stock item', presentation: 'modal' }} />
                <Stack.Screen name="rates" options={{ title: 'Rates' }} />
                <Stack.Screen name="reminders" options={{ title: 'Reminders' }} />
                <Stack.Screen name="settings" options={{ title: 'Shop settings' }} />
                <Stack.Screen name="data" options={{ title: 'Backup & data' }} />
                <Stack.Screen name="about" options={{ title: 'About' }} />
              </Stack>
            </Gate>
          </AppStateProvider>
        </SettingsProvider>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
