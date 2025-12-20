import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme, commonStyles } from '@/styles';
import { createFoodEntry } from '@/data/foodEntryService';
import { CreateFoodEntryResponse } from '@/types/foodEntry';

type RootStackParamList = {
  ConfirmFoodEntry: { response: CreateFoodEntryResponse };
  FoodLog: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'FoodLog'>;

export default function FoodLogScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [showTextInput, setShowTextInput] = useState(false);
  const [showMicrophoneText, setShowMicrophoneText] = useState(false);
  const [foodText, setFoodText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCameraPress = () => {
    console.log('Camera button clicked');
    setShowTextInput(false);
    setShowMicrophoneText(false);
  };

  const handleMicrophonePress = () => {
    console.log('Microphone button clicked');
    setShowMicrophoneText(true);
    setShowTextInput(false);
  };

  const handleWritingPress = () => {
    console.log('Text/Writing button clicked');
    setShowTextInput(true);
    setShowMicrophoneText(false);
  };

  const handleBarcodePress = () => {
    console.log('Barcode button clicked');
    setShowTextInput(false);
  };

  const handleSubmit = async () => {
    if (!foodText.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await createFoodEntry({
        raw_entry_text: foodText.trim(),
      });

      // Navigate to confirmation screen with the response
      navigation.navigate('ConfirmFoodEntry', { response });
      
      // Reset form
      setFoodText('');
      setShowTextInput(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process food entry';
      setError(errorMessage);
      console.error('Error creating food entry:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={commonStyles.container}>
      <Text variant="headlineMedium" style={styles.heading}>
        Track your meals
      </Text>
      <View style={styles.buttonRow}>
        <Button
          icon="camera"
          mode="contained"
          onPress={handleCameraPress}
          style={styles.button}
        >
          Camera
        </Button>
        <Button
          icon="microphone"
          mode="contained"
          onPress={handleMicrophonePress}
          style={styles.button}
        >
          Voice
        </Button>
        <Button
          icon="pencil"
          mode="contained"
          onPress={handleWritingPress}
          style={styles.button}
        >
          Text
        </Button>
      </View>

      {showMicrophoneText && (
        <View style={styles.explanationContainer}>
          <Text variant="bodyMedium" style={styles.explanationText}>
            Speak naturally about what you ate and drank today and our AI will do the rest.
          </Text>
        </View>
      )}

      {showTextInput && (
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Write naturally about what you ate and drank today and our AI will do the rest."
            value={foodText}
            onChangeText={(text) => {
              setFoodText(text);
              setError(null);
            }}
            style={styles.textInput}
            multiline
            disabled={isLoading}
          />
          {error && (
            <Text variant="bodySmall" style={styles.errorText}>
              {error}
            </Text>
          )}
          <Button 
            mode="contained" 
            onPress={handleSubmit} 
            style={styles.submitButton}
            disabled={isLoading || !foodText.trim()}
            loading={isLoading}
          >
            {isLoading ? 'Processing...' : 'Submit'}
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
    color: theme.colors.text,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.lg,
  },
  button: {
    flex: 1,
    marginHorizontal: theme.spacing.sm,
  },
  explanationContainer: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.infoBackground,
    borderRadius: theme.spacing.sm,
    borderLeftWidth: theme.spacing.xs,
    borderLeftColor: theme.colors.primary,
  },
  explanationText: {
    color: theme.colors.primary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  inputContainer: {
    marginTop: theme.spacing.lg,
  },
  textInput: {
    marginBottom: theme.spacing.md,
  },
  submitButton: {
    marginTop: theme.spacing.sm,
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: theme.spacing.sm,
  },
});
