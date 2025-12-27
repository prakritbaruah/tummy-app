import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme, commonStyles } from '@/styles';
import { createFoodEntry } from '@/data/foodEntryService';
import { CreateFoodEntryResponse } from '@/types/foodEntry';

type RootStackParamList = {
  ConfirmFoodEntry: { response: CreateFoodEntryResponse; initialOccuredAtTimestamp?: number };
  FoodLog: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'FoodLog'>;

export default function FoodLogScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [foodText, setFoodText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!foodText.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Set occuredAt to  current time
      const currentTime = Date.now();

      const response = await createFoodEntry(currentTime, {
        raw_entry_text: foodText.trim(),
      });

      // Navigate to confirmation screen with the response and current timestamp
      // The user can adjust this timestamp in the confirmation screen
      navigation.navigate('ConfirmFoodEntry', { 
        response,
        initialOccuredAtTimestamp: currentTime,
      });
      
      // Reset form
      setFoodText('');
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
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
    color: theme.colors.text,
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
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
});
