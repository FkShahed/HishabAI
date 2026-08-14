import { Stack } from 'expo-router';
import { Colors } from '../src/constants/colors';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.bg.primary,
          },
          headerTintColor: Colors.text.primary,
          contentStyle: {
            backgroundColor: Colors.bg.primary,
          },
        }}
      >
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
