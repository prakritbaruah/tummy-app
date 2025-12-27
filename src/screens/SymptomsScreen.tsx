import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Chip, HelperText, SegmentedButtons } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '@/store';
import { addSymptomEntryAsync } from '@/store/symptomsSlice';
import { useNavigation } from '@react-navigation/native';
import { 
  SYMPTOMS, 
  Severity, 
  SymptomData,
  SymptomEntry 
} from '@/types/symptoms';
import { theme } from '@/styles';
import { TimePickerCard } from '@/components';

export default function SymptomsScreen() {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [symptomInputs, setSymptomInputs] = useState<SymptomData[]>([]);
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const status = useAppSelector((state) => state.symptoms.status);

  const handleSymptomToggle = (symptom: string) => {
    setSelectedSymptoms(prev => {
      if (prev.includes(symptom)) {
        // Remove symptom input when unselected
        setSymptomInputs(inputs => inputs.filter(input => input.name !== symptom));
        return prev.filter(s => s !== symptom);
      } else {
        // Add new symptom input with default values
        setSymptomInputs(inputs => [...inputs, {
          name: symptom as typeof SYMPTOMS[number],
          severity: 'Moderate'
        }]);
        return [...prev, symptom];
      }
    });
  };

  const handleSeverityChange = (symptom: string, severity: Severity) => {
    setSymptomInputs(inputs => 
      inputs.map(input => 
        input.name === symptom 
          ? { ...input, severity }
          : input
      )
    );
  };

  const handleAddAllSymptoms = () => {
    Promise.all(
      symptomInputs.map((input) => {
        const newEntry: SymptomEntry = {
          ...input,
          id: Date.now().toString() + input.name,
          occurredAt: selectedTime.getTime(),
          deletedAt: null,
        };
        return dispatch(addSymptomEntryAsync(newEntry)).unwrap();
      }),
    )
      .then(() => {
        setError(null);
        setSelectedSymptoms([]);
        setSymptomInputs([]);
        setSelectedTime(new Date());

        // Reset navigation to Daily Log tab (no overlay)
        (navigation as any).reset({
          index: 0,
          routes: [{ name: 'Main', params: { screen: 'DailyLog' } }],
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to save symptoms');
      });
  };


  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text variant="headlineMedium" style={styles.heading}>
        Track your symptoms
      </Text>
      <Text variant="titleMedium" style={styles.label}>Select Symptoms</Text>
      <View style={styles.symptomsContainer}>
        {SYMPTOMS.map(symptom => (
          <Chip
            key={symptom}
            selected={selectedSymptoms.includes(symptom)}
            onPress={() => handleSymptomToggle(symptom)}
            style={styles.symptomChip}
            mode="flat"
          >
            {symptom}
          </Chip>
        ))}
      </View>

      {symptomInputs.length > 0 && (
        <>
          <View style={styles.timePickerContainer}>
            <TimePickerCard 
              value={selectedTime} 
              onChange={setSelectedTime}
            />
          </View>

          {symptomInputs.map((input) => (
            <Card key={input.name} style={styles.symptomCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.symptomTitle}>{input.name}</Text>

                <Text variant="titleSmall" style={styles.severityLabel}>Severity</Text>
                <SegmentedButtons
                  value={input.severity}
                  onValueChange={(value) => handleSeverityChange(input.name, value as Severity)}
                  buttons={[
                    { value: 'Mild', label: 'Mild' },
                    { value: 'Moderate', label: 'Moderate' },
                    { value: 'Severe', label: 'Severe' },
                  ]}
                  style={styles.segmentedButtons}
                />
              </Card.Content>
            </Card>
          ))}
        </>
      )}

      {error && (
        <HelperText type="error" visible style={styles.errorText}>
          {error}
        </HelperText>
      )}

      {symptomInputs.length > 0 && (
        <Button 
          mode="contained" 
          onPress={handleAddAllSymptoms}
          style={[
            styles.addAllButton,
            symptomInputs.length === 1 && styles.addAllButtonSingle
          ]}
          loading={status === 'loading'}
          disabled={status === 'loading'}
        >
          Add Symptoms
        </Button>
      )}
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
    marginBottom: theme.spacing.md,
    textAlign: 'center',
    color: theme.colors.text,
  },
  label: {
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    fontWeight: '600',
  },
  symptomsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  symptomChip: {
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  symptomCard: {
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.infoBackground,
    elevation: 2,
  },
  symptomTitle: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.primary,
  },
  severityLabel: {
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.xs,
    fontWeight: '600',
  },
  timePickerContainer: {
    marginBottom: theme.spacing.sm,
  },
  segmentedButtons: {
    marginBottom: 0,
  },
  addAllButton: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  addAllButtonSingle: {
    marginTop: theme.spacing.sm,
  },
  errorText: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    color: theme.colors.error,
  },
});
