import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { useAppSelector } from '../store';

export default function HomeScreen() {
  const foodEntries = useAppSelector((state) => state.food.entries);
  const symptomEntries = useAppSelector((state) => state.symptoms.entries);

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Welcome to Tummy
      </Text>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Today's Summary</Text>
          <Text>Food Entries: {foodEntries.length}</Text>
          <Text>Symptom Entries: {symptomEntries.length}</Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
  },
}); 