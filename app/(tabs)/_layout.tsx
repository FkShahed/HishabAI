import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, useThemeColors, TAB_BAR_HEIGHT } from '../../src/constants/colors';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AddOptionModal } from '../../src/components/ui/AddOptionModal';

export default function TabLayout() {
  const colors = useThemeColors();
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.bg.primary,
            borderTopColor: colors.border.subtle,
            height: TAB_BAR_HEIGHT,
            paddingBottom: 12,
            paddingTop: 12,
          },
          tabBarActiveTintColor: colors.accent.primary,
          tabBarInactiveTintColor: colors.text.tertiary,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="charts"
          options={{
            title: 'Charts',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="pie-chart" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: 'Add',
            tabBarIcon: () => (
              <View style={[styles.addButton, { backgroundColor: colors.accent.primary, shadowColor: colors.accent.primary }]}>
                <Ionicons name="add" size={32} color="#FFFFFF" />
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
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="document-text" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings" size={size} color={color} />
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
