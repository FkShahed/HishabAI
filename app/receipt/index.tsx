import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../../src/components/ui/Text';
import { GlassBackground } from '../../src/components/ui/GlassBackground';
import { Button } from '../../src/components/ui/Button';
import { Spacing, Radii, useThemeColors } from '../../src/constants/colors';
import { Header } from '../../src/components/ui/Header';
import { usePreviewStore, useCategoryStore, useDraftStore } from '../../src/store';
import { AIServiceClient, getFriendlyErrorMessage } from '../../src/services/api';

export default function ReceiptAIScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [image, setImage] = useState<string | null>(null);      // URI for display
  const [imageBase64, setImageBase64] = useState<string | null>(null); // base64 for upload
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const isSwitchedToBackgroundRef = useRef(false);

  const setPreview = usePreviewStore(s => s.setPreview);
  const getAICategoryList = useCategoryStore(s => s.getAICategoryList);
  const queueDraft = useDraftStore(s => s.queueDraft);

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

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImage(asset.uri);
        if (asset.base64) {
          setImageBase64(asset.base64);
        }
      }
    } catch (e: any) {
      alert('Error picking image: ' + e.message);
    }
  };

  const handleProcessReceipt = async () => {
    if (!image || !imageBase64) return;
    isSwitchedToBackgroundRef.current = false;
    setIsProcessing(true);

    try {
      const categories = getAICategoryList();
      console.log('[ReceiptAI] Sending receipt image to backend AI parser...');
      const result = await AIServiceClient.parseReceipt(imageBase64, categories);
      
      // If user switched to background while waiting, skip foreground navigation
      if (isSwitchedToBackgroundRef.current) return;

      if (result.success && result.transactions) {
        setPreview(result.transactions, 'receipt');
        router.push('/transaction-preview');
      } else {
        alert(result.error || 'Failed to process receipt');
      }
    } catch (error: any) {
      if (isSwitchedToBackgroundRef.current) return;
      const msg = getFriendlyErrorMessage(error);
      alert(msg);
    } finally {
      if (!isSwitchedToBackgroundRef.current) {
        setIsProcessing(false);
      }
    }
  };

  const handleProcessInBackground = () => {
    if (!image || !imageBase64) return;
    isSwitchedToBackgroundRef.current = true;
    setIsProcessing(false);

    try {
      const categories = getAICategoryList();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      queueDraft(`Receipt (${timeStr})`, 'receipt', {
        type: 'receipt',
        input: imageBase64,
        categories,
        rawText: 'Receipt Image',
      });

      setImage(null);
      setImageBase64(null);
      setToastMsg('⚡ Receipt queued for background AI processing! Draft saved. You can scan another receipt.');
      setTimeout(() => setToastMsg(null), 5000);
    } catch (e: any) {
      console.error('Background receipt processing error:', e);
      alert('Failed to process receipt in background: ' + (e.message || 'Unknown error'));
    }
  };

  return (
    <GlassBackground style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Header 
        title="Scan Receipt" 
        showBack={true}
        onBack={() => router.back()}
      />
      
      <View style={styles.content}>
        {/* Toast confirmation */}
        {toastMsg && (
          <View style={[styles.toastContainer, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
            <Ionicons name="cloud-upload" size={18} color={colors.accent.primary} style={{ marginRight: 8 }} />
            <Text variant="xs" weight="medium" color={colors.text.primary} style={{ flex: 1 }}>
              {toastMsg}
            </Text>
          </View>
        )}

        {!image ? (
          <View style={styles.emptyState}>
            <View style={[styles.iconCircle, { backgroundColor: colors.bg.glass, borderColor: colors.bg.glassBorder, borderWidth: 1 }]}>
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
          <View style={[styles.imagePreviewContainer, { backgroundColor: colors.bg.glass, borderColor: colors.bg.glassBorder, borderWidth: 1 }]}>
            <Image source={{ uri: image }} style={styles.imagePreview} resizeMode="contain" />
            
            {isProcessing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color={colors.accent.primary} />
                <Text variant="md" weight="bold" color="#FFFFFF" style={{ marginTop: Spacing.md, marginBottom: Spacing.lg }}>
                  Extracting items...
                </Text>
                <TouchableOpacity
                  style={[styles.overlayBackgroundBtn, { backgroundColor: colors.accent.primary }]}
                  onPress={handleProcessInBackground}
                  activeOpacity={0.8}
                >
                  <Ionicons name="flash" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text variant="sm" weight="bold" color="#FFFFFF">
                    Send to Background & Scan Next
                  </Text>
                </TouchableOpacity>
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
          <View style={styles.actionColumn}>
            <View style={styles.actionRow}>
              <Button 
                label="Retake" 
                variant="secondary"
                onPress={() => { setImage(null); setImageBase64(null); }}
                style={{ flex: 1, marginRight: Spacing.sm }}
                disabled={isProcessing}
              />
              <Button 
                label={isProcessing ? "Processing..." : "Process Now"} 
                onPress={handleProcessReceipt}
                style={{ flex: 1.5 }}
                isLoading={isProcessing}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.backgroundProcessBtn,
                { backgroundColor: colors.bg.glass, borderColor: colors.accent.primary }
              ]}
              onPress={handleProcessInBackground}
              activeOpacity={0.8}
            >
              <Ionicons name="flash" size={18} color={colors.accent.primary} />
              <Text variant="sm" weight="bold" color={colors.accent.primary} style={{ marginLeft: 6 }}>
                Process in Background & Scan Next
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </GlassBackground>
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
  actionColumn: {
    flexDirection: 'column',
    gap: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
  },
  backgroundProcessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  overlayBackgroundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: Radii.md,
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
});
