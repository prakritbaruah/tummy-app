import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../store';
import { commonStyles } from '../styles';
import { fetchSymptomEntries } from '../store/symptomsSlice';
import { fetchBowelEntries } from '../store/bowelSlice';

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const symptomEntries = useAppSelector((state) => state.symptoms.entries);
  const bowelEntries = useAppSelector((state) => state.bowel.entries);
  
  useEffect(() => {
    dispatch(fetchSymptomEntries());
    dispatch(fetchBowelEntries());
  }, [dispatch]);

  return (
    <View style={commonStyles.container}>
      <Text variant="headlineMedium" style={commonStyles.title}>
        Welcome to Tummy
      </Text>
      <Card style={commonStyles.card}>
        <Card.Content>
          <Text variant="titleMedium">Today's Summary</Text>
          <Text>Symptom Entries: {symptomEntries.length}</Text>
          <Text>Bowel Movement Entries: {bowelEntries.length}</Text>
        </Card.Content>
      </Card>
    </View>
  );
}

// Styles moved to common styles 