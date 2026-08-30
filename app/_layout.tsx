import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useThemeColors } from '../src/constants/colors';
import { useUIStore } from '../src/store';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';

// Must be called at app root so auth.expo.io deep link redirects are intercepted
// immediately when Expo Go re-opens after Google OAuth.
WebBrowser.maybeCompleteAuthSession();

// Suppress react-native-web DOM attribute warning for react-navigation screens
if (Platform.OS === 'web' && typeof __DEV__ !== 'undefined' && __DEV__) {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && (args[0].includes('collapsable') || args[0].includes('non-boolean attribute'))) {
      return;
    }
    originalConsoleError(...args);
  };
}


export default function RootLayout() {
  const colors = useThemeColors();
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark' || colors.bg.primary === '#080810';

  return (
    <>
      <StatusBar style="light" backgroundColor={colors.topbar.bg} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.topbar.bg,
          },
          headerTintColor: colors.topbar.text,
          contentStyle: {
            backgroundColor: colors.bg.primary,
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="transaction/[id]"
          options={{
            title: 'Transaction Details',
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="transaction/new"
          options={{
            title: 'Add Transaction',
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="transaction-preview/index"
          options={{
            title: 'Review Transactions',
            presentation: 'fullScreenModal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="voice/index"
          options={{
            title: 'Voice AI',
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="receipt/index"
          options={{
            title: 'Scan Receipt',
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="auth/index"
          options={{
            title: 'Sign In / Account',
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="onboarding/index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="terms"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="categories/index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="category-detail/[id]"
          options={{
            headerShown: false,
          }}
        />
      </Stack>

    </>
  );
}
