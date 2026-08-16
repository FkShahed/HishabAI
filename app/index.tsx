import { useUIStore, useTransactionStore, useBudgetStore } from '../src/store';

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
          
          // Silent background sync without triggering UI spinners
          FirebaseService.fetchTransactions(user.uid)
            .then((cloudTxns) => {
              if (cloudTxns && cloudTxns.length > 0) {
                const localTxns = useTransactionStore.getState().transactions;
                const map = new Map<string, any>();
                cloudTxns.forEach((t) => map.set(t.id, t));
                localTxns.forEach((t) => {
                  if (!map.has(t.id)) {
                    map.set(t.id, t);
                    FirebaseService.saveTransaction(user.uid, t).catch(() => {});
                  }
                });
                const merged = Array.from(map.values()).sort((a, b) =>
                  new Date(b.transactionDate || 0).getTime() - new Date(a.transactionDate || 0).getTime()
                );
                setTransactions(merged);
              }
            })
            .catch((err) => console.warn('[App Init] Silent background sync warning:', err));

          FirebaseService.fetchBudgets(user.uid)
            .then((cloudBudgets) => {
              if (cloudBudgets && cloudBudgets.length > 0) {
                useBudgetStore.getState().setBudgets(cloudBudgets);
              }
            })
            .catch(() => {});




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
