import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { useAppSelector } from '../store';
import { theme, commonStyles } from '../styles';

export default function HomeScreen() {
  const foodEntries = useAppSelector((state) => state.food.entries);
  const symptomEntries = useAppSelector((state) => state.symptoms.entries);

  return (
    <View style={commonStyles.container}>
      <Text variant="headlineMedium" style={commonStyles.title}>
        Welcome to Tummy
      </Text>
      <Card style={commonStyles.card}>
        <Card.Content>
          <Text variant="titleMedium">Today's Summary</Text>
          <Text>Food Entries: {foodEntries.length}</Text>
          <Text>Symptom Entries: {symptomEntries.length}</Text>
        </Card.Content>
      </Card>
    </View>
  );
}

// Styles moved to common styles 