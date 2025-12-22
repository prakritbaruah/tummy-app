import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { commonStyles } from '@/styles';

export default function HomeScreen() {
  return (
    <ScrollView style={commonStyles.container}>
      <Text variant="headlineMedium" style={commonStyles.title}>
        Welcome to Tummy
      </Text>
      <Card style={commonStyles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={{ marginBottom: 12 }}>
            How to Use Tummy
          </Text>
          <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
            <Text style={{ fontWeight: 'bold' }}>1. Add Entries:</Text> Tap the "+" tab at the bottom to add symptoms, bowel movements, or food entries.
          </Text>
          <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
            <Text style={{ fontWeight: 'bold' }}>2. View Your Log:</Text> Check the "Daily Log" tab to see all your entries organized by date. You can filter by today, this week, or view all entries.
          </Text>
          <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
            <Text style={{ fontWeight: 'bold' }}>3. Track Everything:</Text> Log symptoms, bowel movements, and meals to identify patterns and triggers in your digestive health.
          </Text>
          <Text variant="bodyMedium">
            <Text style={{ fontWeight: 'bold' }}>4. Profile:</Text> Tap the profile icon in the top-left corner to manage your account settings.
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

// Styles moved to common styles 