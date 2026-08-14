import { Redirect } from 'expo-router';
import { useUIStore, useTransactionStore } from '../src/store';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../src/constants/colors';
import { useEffect, useState } from 'react';
import { ensureAuthenticated, FirebaseService } from '../src/services/firebase';

export default function Index() {
  const isFirstLaunch = useUIStore((state) => state.isFirstLaunch);
  const setTransactions = useTransactionStore((state) => state.setTransactions);
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function initApp() {
      try {
        const user = await ensureAuthenticated();
        if (user) {
          setIsAuthenticated(true);
          console.log('[Auth] Signed in:', user.uid);
          
          // Fetch existing data
          const txns = await FirebaseService.fetchTransactions(user.uid);
          if (txns.length > 0) {
            setTransactions(txns);
          }
        } else {
          setIsAuthenticated(false);
          console.log('[Auth] No active session. Redirecting to login.');
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setIsReady(true);
      }
    }
    
    initApp();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.accent.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/auth" />;
  }

  if (isFirstLaunch) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
