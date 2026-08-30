import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, useThemeColors, TAB_BAR_HEIGHT } from '../../src/constants/colors';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { AddOptionModal } from '../../src/components/ui/AddOptionModal';

export default function TabLayout() {
  const colors = useThemeColors();
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const isDark = colors.bg.primary === '#080810';

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: Platform.OS === 'ios' ? 20 : 12,
            left: 12,
            right: 12,
            height: Platform.OS === 'ios' ? 68 : 64,
            borderRadius: 34,
            backgroundColor: Platform.OS === 'web'
              ? (isDark ? 'rgba(18, 18, 30, 0.88)' : 'rgba(255, 255, 255, 0.95)')
              : (isDark ? '#12121E' : '#FFFFFF'),
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(203, 213, 225, 0.70)',
            elevation: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDark ? 0.45 : 0.12,
            shadowRadius: 16,
            paddingBottom: Platform.OS === 'ios' ? 6 : 4,
            paddingTop: 4,
            paddingHorizontal: 4,
            overflow: 'visible',
            ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any) : {}),
          },
          tabBarItemStyle: {
            paddingVertical: 2,
          },
          tabBarActiveTintColor: colors.accent.primary,
          tabBarInactiveTintColor: colors.text.tertiary,
          tabBarLabelStyle: {
            fontSize: 10.5,
            fontWeight: '600',
            marginTop: 1,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => (
              <Ionicons name="home" size={21} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="charts"
          options={{
            title: 'Charts',
            tabBarIcon: ({ color }) => (
              <Ionicons name="pie-chart" size={21} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: 'Add',
            tabBarIcon: () => (
              <View style={[styles.addButton, { backgroundColor: colors.accent.primary, shadowColor: colors.accent.primary }]}>
                <Ionicons name="add" size={26} color="#FFFFFF" />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setIsAddModalVisible(true);
            },
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reports',
            tabBarIcon: ({ color }) => (
              <Ionicons name="document-text" size={21} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => (
              <Ionicons name="settings" size={21} color={color} />
            ),
          }}
        />
      </Tabs>

      <AddOptionModal 
        visible={isAddModalVisible} 
        onClose={() => setIsAddModalVisible(false)} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  addButton: {
    backgroundColor: Colors.accent.primary,
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: Colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
