import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../store';
import { addFoodEntryAsync } from '../store/foodSlice';
import { FoodEntry } from '../types/food';
import { theme, commonStyles } from '../styles';

export default function FoodLogScreen() {
  const [showTextInput, setShowTextInput] = useState(false);
  const [showMicrophoneText, setShowMicrophoneText] = useState(false);
  const [foodText, setFoodText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.food.status);

  const handleCameraPress = () => {
    // TODO: Implement camera functionality
    console.log('Camera pressed');
    setShowTextInput(false);
    setShowMicrophoneText(false);
  };

  const handleMicrophonePress = () => {
    // TODO: Implement microphone functionality
    console.log('Microphone pressed');
    setShowMicrophoneText(true);
    setShowTextInput(false);
  };

  const handleWritingPress = () => {
    setShowTextInput(true);
    setShowMicrophoneText(false);
  };

  const handleBarcodePress = () => {
    // TODO: Implement barcode scanning functionality
    console.log('Barcode pressed');
    setShowTextInput(false);
  };

  const handleSubmit = () => {
    if (foodText.trim()) {
      const newEntry: FoodEntry = {
        id: Date.now().toString(),
        name: foodText.trim(),
        quantity: '1 serving',
        timestamp: Date.now(),
      };
      dispatch(addFoodEntryAsync({ entry: newEntry }))
        .unwrap()
        .then(() => {
          setError(null);
          setFoodText('');
          setShowTextInput(false);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Unable to save food entry');
        });
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
            onChangeText={setFoodText}
            style={styles.textInput}
            multiline
          />
          <Button 
            mode="contained" 
            onPress={handleSubmit} 
            style={styles.submitButton}
            loading={status === 'loading'}
            disabled={status === 'loading'}
          >
            Submit
          </Button>
          {error && (
            <HelperText type="error" visible>
              {error}
            </HelperText>
          )}
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
});
