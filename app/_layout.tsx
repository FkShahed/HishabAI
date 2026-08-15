import { Stack } from 'expo-router';
import { useThemeColors } from '../src/constants/colors';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  const colors = useThemeColors();

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
      </Stack>
    </>
  );
}
