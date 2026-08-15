import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../../src/components/ui/Text';
import { Spacing, Radii, useThemeColors } from '../../src/constants/colors';
import { Header } from '../../src/components/ui/Header';
import { usePreviewStore, useCategoryStore } from '../../src/store';
import { AIServiceClient } from '../../src/services/api';
import { getTodayString } from '../../src/utils/finance';

export default function VoiceAIScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
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
        let parsedSuccessfully = false;

        if (audioUri) {
          try {
            const result = await AIServiceClient.parseVoice(audioUri, categories);
            transcript = result.rawTranscript || '';
            if (result.success && result.transactions && result.transactions.length > 0) {
              setPreview(result.transactions, 'voice', result.rawTranscript);
              parsedSuccessfully = true;
            }
          } catch (apiError: any) {
            console.warn('[VoiceAI] Backend API call failed:', apiError);
            alert(apiError.message || 'Voice processing failed. Please try again.');
            setIsProcessing(false);
            setRecording(null);
            return;
          }
        }

        if (!parsedSuccessfully) {
          if (transcript.trim().length > 0) {
            alert(`The AI heard: "${transcript}", but couldn't identify transaction details. Please try again.`);
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
          Audio.RecordingOptionsPresets.HIGH_QUALITY
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
    <View style={[styles.container, { paddingBottom: insets.bottom, backgroundColor: colors.bg.primary }]}>
      <Header 
        title="Voice Input" 
        showBack={false}
        rightElement={
          <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
            <Ionicons name="close" size={28} color={colors.text.primary} />
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
              { backgroundColor: colors.bg.secondary },
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
        
        <View style={styles.textContainer}>
          <Text variant="xl" weight="bold" align="center" style={styles.statusText}>
            {isProcessing ? 'Analyzing audio...' : isRecording ? 'Listening...' : 'Tap to speak'}
          </Text>
          <Text variant="md" color={colors.text.secondary} align="center">
            {isProcessing 
              ? 'Extracting transactions using AI'
              : isRecording 
                ? 'Say things like "I spent 500 on food today"'
                : 'HisabAI will automatically categorize it'}
          </Text>
        </View>
      </View>
      
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[
            styles.recordButton, 
            { backgroundColor: colors.accent.primary, shadowColor: colors.accent.primary },
            isRecording && { backgroundColor: colors.semantic.danger, shadowColor: colors.semantic.danger }
          ]}
          onPress={handleToggleRecord}
          disabled={isProcessing}
        >
          {isRecording ? (
            <View style={styles.stopSquare} />
          ) : (
            <Ionicons name="mic" size={40} color="#FFFFFF" />
          )}
        </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
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
});
