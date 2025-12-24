import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, HelperText, SegmentedButtons } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { useAppDispatch, useAppSelector } from '@/store';
import { addBowelEntryAsync } from '@/store/bowelSlice';
import { useNavigation } from '@react-navigation/native';
import { BowelEntry, Urgency } from '@/types/bowel';
import { theme } from '@/styles';
import { TimePickerCard } from '@/components';

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
      occurredAt: selectedTime.getTime(),
      deletedAt: null,
    };
    try {
      await dispatch(addBowelEntryAsync(newEntry)).unwrap();
      setError(null);

      // Reset navigation to Daily Log tab (no overlay)
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'Main', params: { screen: 'DailyLog' } }],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save entry');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text variant="headlineMedium" style={styles.heading}>
        Track your movements
      </Text>
      
      <TimePickerCard value={selectedTime} onChange={setSelectedTime} />

      <Text variant="titleMedium" style={styles.label}>Urgency</Text>
      <SegmentedButtons
        value={urgency}
        onValueChange={(value) => setUrgency(value as Urgency)}
        buttons={[
          { value: 'Low', label: 'Low' },
          { value: 'Medium', label: 'Medium' },
          { value: 'High', label: 'High' },
        ]}
        style={styles.segmentedButtons}
      />

 
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
        <HelperText type="error" visible style={styles.errorText}>
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
  segmentedButtons: {
    marginBottom: theme.spacing.md,
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
    height: 40
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
  errorText: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    color: theme.colors.error,
  },
});
