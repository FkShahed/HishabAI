import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../../src/components/ui/Text';
import { GlassBackground } from '../../src/components/ui/GlassBackground';
import { Spacing, Radii, useThemeColors } from '../../src/constants/colors';
import { Header } from '../../src/components/ui/Header';
import { usePreviewStore, useCategoryStore, useUIStore, useDraftStore } from '../../src/store';
import { AIServiceClient } from '../../src/services/api';
import { getTodayString } from '../../src/utils/finance';

export default function VoiceAIScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [engineStatus, setEngineStatus] = useState<string | null>(null);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);
  
  const setPreview = usePreviewStore(s => s.setPreview);
  const getAICategoryList = useCategoryStore(s => s.getAICategoryList);
  const sttModel = useUIStore(s => s.sttModel);
  const setSttModel = useUIStore(s => s.setSttModel);
  const queueDraft = useDraftStore(s => s.queueDraft);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [currentAudioUri, setCurrentAudioUri] = useState<string | null>(null);
  const isSwitchedToBackgroundRef = useRef(false);

  const handleSendActiveAudioToBackground = () => {
    if (!currentAudioUri) return;
    isSwitchedToBackgroundRef.current = true;
    setIsProcessing(false);

    try {
      const categories = getAICategoryList();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      queueDraft(`Voice Note (${timeStr})`, 'voice', {
        type: 'voice',
        input: currentAudioUri,
        categories,
        sttModel,
        rawText: 'Voice Recording',
      });

      setCurrentAudioUri(null);
      setToastMsg('⚡ Switched to background! Draft saved. You can record another now.');
      setTimeout(() => setToastMsg(null), 5000);
    } catch (e: any) {
      console.error('Background voice processing error:', e);
      alert('Failed to process in background: ' + (e.message || 'Unknown error'));
    }
  };

  const handleProcessInBackground = async () => {
    if (!isRecording || !recording) return;

    try {
      setIsRecording(false);
      let audioUri: string | null = null;
      try {
        const status = await recording.getStatusAsync();
        if (status.canRecord || status.isRecording) {
          await recording.stopAndUnloadAsync();
        }
        audioUri = recording.getURI();
      } catch (e) {
        audioUri = recording.getURI();
      }
      setRecording(null);

      if (!audioUri) {
        alert('No audio recorded. Please try again.');
        return;
      }

      const categories = getAICategoryList();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      queueDraft(`Voice Note (${timeStr})`, 'voice', {
        type: 'voice',
        input: audioUri,
        categories,
        sttModel,
        rawText: 'Voice Recording',
      });

      setToastMsg('⚡ Processing in background! Saved as draft. You can record another now.');
      setTimeout(() => setToastMsg(null), 5000);
    } catch (e: any) {
      console.error('Background voice processing error:', e);
      alert('Failed to process in background: ' + (e.message || 'Unknown error'));
    }
  };

  const handleToggleRecord = async () => {
    try {
      if (isRecording) {
        // Stop recording
        setIsRecording(false);
        setIsProcessing(true);

        let audioUri: string | null = null;

        if (recording) {
          try {
            const status = await recording.getStatusAsync();
            if (status.canRecord || status.isRecording) {
              await recording.stopAndUnloadAsync();
            }
            audioUri = recording.getURI();
          } catch (e) {
            console.warn('Audio unload warning:', e);
            try {
              audioUri = recording.getURI();
            } catch {}
          }
        }

        const categories = getAICategoryList();
        let transcript = '';
        let processingNotes = '';
        let parsedSuccessfully = false;

        if (audioUri) {
          setCurrentAudioUri(audioUri);
          isSwitchedToBackgroundRef.current = false;
          try {
            const result = await AIServiceClient.parseVoice(audioUri, categories, sttModel);
            if (isSwitchedToBackgroundRef.current) return;

            transcript = result.rawTranscript || '';
            processingNotes = result.processingNotes || '';
            if (result.engineUsed) {
              setEngineStatus(result.engineUsed);
            }
            if (result.success && result.transactions && result.transactions.length > 0) {
              setPreview(result.transactions, 'voice', result.rawTranscript);
              parsedSuccessfully = true;
            }
          } catch (apiError: any) {
            if (isSwitchedToBackgroundRef.current) return;
            console.warn('[VoiceAI] Backend API call failed:', apiError);
            alert(apiError.message || 'Voice processing failed. Please try again.');
            setIsProcessing(false);
            setRecording(null);
            setCurrentAudioUri(null);
            return;
          }
        }

        if (isSwitchedToBackgroundRef.current) return;

        if (!parsedSuccessfully) {
          if (transcript.trim().length > 0) {
            const missingMsg = processingNotes 
              ? `The AI heard: "${transcript}"\n\nMissing details: ${processingNotes}`
              : `The AI heard: "${transcript}", but couldn't identify transaction details. Please specify both the amount and item/category (e.g. "Spent 500 on groceries").`;
            alert(missingMsg);
          } else {
            alert('No audio was captured. Please speak clearly into the microphone and try again.');
          }
          setIsProcessing(false);
          setRecording(null);
          return;
        }

        setIsProcessing(false);
        setRecording(null);
        router.replace('/transaction-preview');

      } else {
        // Start recording
        let perm = await Audio.getPermissionsAsync();
        if (!perm.granted) {
          perm = await Audio.requestPermissionsAsync();
        }

        if (!perm.granted) {
          alert('Microphone permission is required to use Voice AI. Please enable it in Settings.');
          return;
        }

        try {
          if (recording) {
            await recording.stopAndUnloadAsync();
          }
        } catch {}

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
        });

        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.LOW_QUALITY
        );
        
        setRecording(newRecording);
        setIsRecording(true);
      }
    } catch (error: any) {
      console.error('Recording toggle error:', error);
      setIsProcessing(false);
      setIsRecording(false);
      alert(error.message || 'An error occurred with the microphone or AI processing.');
    }
  };

  const handleCancel = () => {
    if (isRecording && recording) {
      recording.stopAndUnloadAsync().catch(() => {});
    }
    setIsRecording(false);
    router.back();
  };

  return (
    <GlassBackground style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Header 
        title="Voice Input" 
        showBack={false}
        rightElement={
          <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
            <Ionicons name="close" size={28} color={colors.topbar.icon} />
          </TouchableOpacity>
        }
      />
      
      <View style={styles.content}>
        <View style={styles.animationContainer}>
          {isProcessing ? (
            <ActivityIndicator size="large" color={colors.accent.primary} />
          ) : (
            <Animated.View style={[
              styles.pulseCircle, 
              { backgroundColor: colors.bg.glass },
              isRecording && styles.pulseActive,
              { transform: [{ scale: pulseAnim }] }
            ]}>
              <Ionicons 
                name="mic" 
                size={80} 
                color={isRecording ? colors.semantic.danger : colors.accent.primary} 
              />
            </Animated.View>
          )}
        </View>
        
        <Text variant="lg" weight="bold" align="center" style={styles.statusText}>
          {isProcessing ? 'AI Analyzing Voice...' : isRecording ? 'Listening... Speak now' : 'Tap to start speaking'}
        </Text>
        <Text variant="sm" color={colors.text.secondary} align="center" style={styles.hintText}>
          {isRecording ? 'Say things like: "Spent 500 taka on groceries today"' : 'Record your income or expense using your voice'}
        </Text>
        
        {/* Model Selector */}
        <View 
          style={[
            styles.modelSelectorContainer, 
            { backgroundColor: colors.bg.glass, borderColor: colors.bg.glassBorder },
            (isRecording || isProcessing) && { opacity: 0.5 }
          ]}
        >
          <TouchableOpacity
            style={[
              styles.modelOption,
              sttModel === 'gemini' && [styles.modelOptionActive, { backgroundColor: colors.accent.primary }]
            ]}
            onPress={() => setSttModel('gemini')}
            disabled={isRecording || isProcessing}
          >
            <Text 
              variant="xs" 
              weight={sttModel === 'gemini' ? 'bold' : 'semibold'}
              color={sttModel === 'gemini' ? '#FFFFFF' : colors.text.primary}
            >
              Gemini
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modelOption,
              sttModel === 'whisper' && [styles.modelOptionActive, { backgroundColor: colors.accent.primary }]
            ]}
            onPress={() => setSttModel('whisper')}
            disabled={isRecording || isProcessing}
          >
            <Text 
              variant="xs" 
              weight={sttModel === 'whisper' ? 'bold' : 'semibold'}
              color={sttModel === 'whisper' ? '#FFFFFF' : colors.text.primary}
            >
              Whisper
            </Text>
          </TouchableOpacity>
        </View>

        {/* Toast notification */}
        {toastMsg && (
          <View style={[styles.toastContainer, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
            <Ionicons name="cloud-upload" size={18} color={colors.accent.primary} style={{ marginRight: 8 }} />
            <Text variant="xs" weight="medium" color={colors.text.primary} style={{ flex: 1 }}>
              {toastMsg}
            </Text>
          </View>
        )}

        {/* When processing, show button to switch to background */}
        {isProcessing && currentAudioUri && (
          <TouchableOpacity
            style={[
              styles.backgroundActionButton,
              { backgroundColor: colors.bg.glass, borderColor: colors.accent.primary, borderWidth: 1.5, marginBottom: Spacing.xl }
            ]}
            onPress={handleSendActiveAudioToBackground}
            activeOpacity={0.8}
          >
            <Ionicons name="flash" size={18} color={colors.accent.primary} />
            <Text variant="xs" weight="bold" color={colors.accent.primary} style={{ marginLeft: 6 }}>
              Send to Background & Record Next
            </Text>
          </TouchableOpacity>
        )}

        {/* Action Buttons */}
        {isRecording ? (
          <View style={styles.actionButtonRow}>
            <TouchableOpacity 
              style={[
                styles.recordButton, 
                { backgroundColor: colors.semantic.danger, shadowColor: colors.semantic.danger }
              ]}
              onPress={handleToggleRecord}
              disabled={isProcessing}
            >
              <View style={styles.stopSquare} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.backgroundActionButton, 
                { backgroundColor: colors.bg.glass, borderColor: colors.accent.primary, borderWidth: 1.5 }
              ]}
              onPress={handleProcessInBackground}
              activeOpacity={0.8}
            >
              <Ionicons name="flash" size={20} color={colors.accent.primary} />
              <Text variant="xs" weight="bold" color={colors.accent.primary} style={{ marginLeft: 6 }}>
                In Background
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[
              styles.recordButton, 
              { backgroundColor: colors.accent.primary, shadowColor: colors.accent.primary }
            ]}
            onPress={handleToggleRecord}
            disabled={isProcessing}
          >
            <Ionicons name="mic" size={40} color="#FFFFFF" />
          </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  actionButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  backgroundActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: Radii.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    maxWidth: 340,
  },
  animationContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  textContainer: {
    marginTop: Spacing.xl,
    height: 80,
  },
  statusText: {
    marginBottom: Spacing.sm,
  },
  hintText: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  controls: {
    alignItems: 'center',
    paddingBottom: Spacing.xxxl,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  recordButtonActive: {
  },
  stopSquare: {
    width: 24,
    height: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  modelSelectorContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderRadius: Radii.full,
    borderWidth: 1,
    padding: 3,
    marginBottom: Spacing.xl,
    width: 200,
  },
  modelOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelOptionActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
