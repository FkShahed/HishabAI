import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../../src/components/ui/Text';
import { Button } from '../../src/components/ui/Button';
import { Spacing, Radii, useThemeColors } from '../../src/constants/colors';
import { Header } from '../../src/components/ui/Header';
import { usePreviewStore, useCategoryStore } from '../../src/store';
import { AIServiceClient, getFriendlyErrorMessage } from '../../src/services/api';

export default function ReceiptAIScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [image, setImage] = useState<string | null>(null);      // URI for display
  const [imageBase64, setImageBase64] = useState<string | null>(null); // base64 for upload
  const [isProcessing, setIsProcessing] = useState(false);
  const setPreview = usePreviewStore(s => s.setPreview);
  const getAICategoryList = useCategoryStore(s => s.getAICategoryList);

  const pickImage = async (useCamera: boolean = false) => {
    try {
      let result;
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) return;
        result = await ImagePicker.launchCameraAsync({
          base64: true,
          quality: 0.4,
          allowsEditing: false,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return;
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          base64: true,
          quality: 0.4,
          allowsEditing: false,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        setImage(result.assets[0].uri);
        setImageBase64(result.assets[0].base64 ?? null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleProcessReceipt = async () => {
    if (!image || !imageBase64) return;
    
    setIsProcessing(true);
    try {
      const categories = getAICategoryList();
      console.log('[ReceiptAI] Sending receipt image to backend AI parser...');
      const result = await AIServiceClient.parseReceipt(imageBase64, categories);
      
      if (result.success && result.transactions) {
        setPreview(result.transactions, 'receipt');
        router.push('/transaction-preview');
      } else {
        alert(result.error || 'Failed to process receipt');
      }
    } catch (error: any) {
      const msg = getFriendlyErrorMessage(error);
      alert(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom, backgroundColor: colors.bg.primary }]}>
      <Header 
        title="Scan Receipt" 
        showBack={true}
        onBack={() => router.back()}
      />
      
      <View style={styles.content}>
        {!image ? (
          <View style={styles.emptyState}>
            <View style={[styles.iconCircle, { backgroundColor: colors.bg.secondary }]}>
              <Ionicons name="receipt-outline" size={60} color={colors.accent.primary} />
            </View>
            <Text variant="xl" weight="bold" style={{ marginTop: Spacing.xl, marginBottom: Spacing.xs }}>
              Scan your receipt
            </Text>
            <Text variant="md" color={colors.text.secondary} align="center" style={{ paddingHorizontal: Spacing.lg }}>
              Take a photo or choose from gallery. HisabAI will extract all expenses automatically.
            </Text>
          </View>
        ) : (
          <View style={[styles.imagePreviewContainer, { backgroundColor: colors.bg.secondary }]}>
            <Image source={{ uri: image }} style={styles.imagePreview} resizeMode="contain" />
            
            {isProcessing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color={colors.accent.primary} />
                <Text variant="md" weight="bold" color="#FFFFFF" style={{ marginTop: Spacing.md }}>
                  Extracting items...
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
      
      <View style={styles.footer}>
        {!image ? (
          <>
            <Button 
              label="Take Photo" 
              leftIcon={<Ionicons name="camera" size={20} color="#FFFFFF" />}
              onPress={() => pickImage(true)}
              style={{ marginBottom: Spacing.md }}
            />
            <Button 
              label="Choose from Gallery" 
              variant="secondary"
              leftIcon={<Ionicons name="image" size={20} color={colors.text.primary} />}
              onPress={() => pickImage(false)}
            />
          </>
        ) : (
          <View style={styles.actionRow}>
            <Button 
              label="Retake" 
              variant="secondary"
              onPress={() => { setImage(null); setImageBase64(null); }}
              style={{ flex: 1, marginRight: Spacing.md }}
              disabled={isProcessing}
            />
            <Button 
              label={isProcessing ? "Processing..." : "Process Receipt"} 
              onPress={handleProcessReceipt}
              style={{ flex: 2 }}
              isLoading={isProcessing}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cancelBtn: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewContainer: {
    flex: 1,
    borderRadius: Radii.lg,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 8, 16, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: Spacing.xl,
    paddingTop: 0,
  },
  actionRow: {
    flexDirection: 'row',
  },
});
