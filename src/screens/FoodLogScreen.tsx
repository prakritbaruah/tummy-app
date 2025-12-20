import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { theme, commonStyles } from '@/styles';

export default function FoodLogScreen() {
  const [showTextInput, setShowTextInput] = useState(false);
  const [showMicrophoneText, setShowMicrophoneText] = useState(false);
  const [foodText, setFoodText] = useState('');

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

  const handleSubmit = () => {
    console.log('Submit button clicked with text:', foodText);
    if (foodText.trim()) {
      setFoodText('');
      setShowTextInput(false);
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
          >
            Submit
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
});
