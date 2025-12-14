import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, HelperText } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { useAppDispatch, useAppSelector } from '../store';
import { addBowelEntryAsync } from '../store/bowelSlice';
import { useNavigation } from '@react-navigation/native';
import { BowelEntry, Urgency } from '../types/bowel';
import { theme } from '../styles';
import { TimePickerCard } from '../components';

export default function BowelScreen() {
  const [urgency, setUrgency] = useState<Urgency>('Low');
  const [consistency, setConsistency] = useState(4);
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [mucusPresent, setMucusPresent] = useState(false);
  const [bloodPresent, setBloodPresent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const status = useAppSelector((state) => state.bowel.status);

  const handleAddEntry = async () => {
    const newEntry: BowelEntry = {
      id: Date.now().toString(),
      urgency,
      consistency,
      mucusPresent,
      bloodPresent,
      timestamp: selectedTime.getTime(),
    };
    try {
      await dispatch(addBowelEntryAsync({ entry: newEntry })).unwrap();
      setError(null);
      // Reset form
      setUrgency('Low');
      setConsistency(4);
      setSelectedTime(new Date());
      setMucusPresent(false);
      setBloodPresent(false);

      // Reset navigation to Daily Log tab (no overlay)
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'Main', params: { screen: 'DailyLog' } }],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save entry');
    }
  };

  const getUrgencyValue = (urgency: Urgency): number => {
    const urgencyLevels: Urgency[] = ['Low', 'Medium', 'High'];
    return urgencyLevels.indexOf(urgency) / (urgencyLevels.length - 1);
  };

  const getUrgencyFromValue = (value: number): Urgency => {
    const urgencyLevels: Urgency[] = ['Low', 'Medium', 'High'];
    const index = Math.round(value * (urgencyLevels.length - 1));
    return urgencyLevels[index];
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text variant="headlineMedium" style={styles.heading}>
        Track your movements
      </Text>
      
      <TimePickerCard value={selectedTime} onChange={setSelectedTime} />

      <Text variant="titleMedium" style={styles.label}>Urgency</Text>
      <View style={styles.sliderContainer}>
        <View style={styles.sliderLabels}>
          <Text variant="bodySmall">Low</Text>
          <Text variant="bodySmall">High</Text>
        </View>
        <Slider
          value={getUrgencyValue(urgency)}
          onValueChange={(value) => setUrgency(getUrgencyFromValue(value))}
          minimumValue={0}
          maximumValue={1}
          step={0.5}
          style={styles.slider}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.trackInactive}
          thumbTintColor={theme.colors.primary}
        />
        <Text variant="bodyMedium" style={styles.currentValue}>
          {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
        </Text>
      </View>

      <Text variant="titleMedium" style={styles.label}>Consistency</Text>
      <View style={styles.sliderContainer}>
        <View style={styles.sliderLabels}>
          <Text variant="bodySmall">Hard</Text>
          <Text variant="bodySmall">Liquid</Text>
        </View>
        <Slider
          value={consistency}
          onValueChange={setConsistency}
          minimumValue={1}
          maximumValue={7}
          step={1}
          style={styles.slider}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.trackInactive}
          thumbTintColor={theme.colors.primary}
        />
        <Text variant="bodyMedium" style={styles.currentValue}>
          Type {consistency}
        </Text>
      </View>

      <View style={styles.checkboxContainer}>
        <Button
          mode={mucusPresent ? "contained" : "outlined"}
          onPress={() => setMucusPresent(!mucusPresent)}
          style={styles.checkbox}
        >
          Mucus Present
        </Button>
        <Button
          mode={bloodPresent ? "contained" : "outlined"}
          onPress={() => setBloodPresent(!bloodPresent)}
          style={styles.checkbox}
        >
          Blood Present
        </Button>
      </View>

      {error && (
        <HelperText type="error" visible>
          {error}
        </HelperText>
      )}

      <Button
        mode="contained"
        onPress={handleAddEntry}
        style={styles.button}
        loading={status === 'loading'}
        disabled={status === 'loading'}
      >
        Add Entry
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.md,
  },
  heading: {
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
    color: theme.colors.text,
  },
  label: {
    marginBottom: theme.spacing.sm,
  },
  sliderContainer: {
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  slider: {
    height: 40,
  },
  currentValue: {
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  checkboxContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  checkbox: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
  },
  button: {
    marginTop: theme.spacing.sm,
  },
});
