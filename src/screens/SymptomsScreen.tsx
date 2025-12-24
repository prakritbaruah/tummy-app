import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, List, Checkbox, HelperText, SegmentedButtons } from 'react-native-paper';
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
  const [symptomListExpanded, setSymptomListExpanded] = useState(false);
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
      <View style={styles.dropdownContainer}>
        <List.Section style={styles.dropdownCard}>
          <List.Accordion
            title={
              selectedSymptoms.length > 0
                ? `${selectedSymptoms.length} symptom${selectedSymptoms.length > 1 ? 's' : ''} selected`
                : 'Choose symptoms'
            }
            expanded={symptomListExpanded}
            onPress={() => setSymptomListExpanded(prev => !prev)}
            left={() => null}
            right={props => <List.Icon {...props} icon={symptomListExpanded ? 'chevron-up' : 'chevron-down'} />}
          >
            {SYMPTOMS.map(symptom => (
              <List.Item
                key={symptom}
                title={symptom}
                onPress={() => handleSymptomToggle(symptom)}
                right={() => (
                  <Checkbox
                    status={selectedSymptoms.includes(symptom) ? 'checked' : 'unchecked'}
                    onPress={() => handleSymptomToggle(symptom)}
                  />
                )}
              />
            ))}
          </List.Accordion>
        </List.Section>
        {selectedSymptoms.length > 0 && (
          <Text variant="bodySmall" style={styles.selectedHint}>
            {selectedSymptoms.join(', ')}
          </Text>
        )}
      </View>

      {symptomInputs.length > 0 && (
        <TimePickerCard value={selectedTime} onChange={setSelectedTime} />
      )}

      {symptomInputs.map((input) => (
        <Card key={input.name} style={styles.symptomCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.symptomTitle}>{input.name}</Text>

            <Text variant="titleSmall" style={styles.label}>Severity</Text>
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

      {error && (
        <HelperText type="error" visible style={styles.errorText}>
          {error}
        </HelperText>
      )}

      {symptomInputs.length > 0 && (
        <Button 
          mode="contained" 
          onPress={handleAddAllSymptoms}
          style={styles.addAllButton}
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
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
    color: theme.colors.text,
  },
  symptomCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.infoBackground,
    elevation: 2,
  },
  label: {
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
    fontWeight: '600',
  },
  symptomTitle: {
    marginBottom: theme.spacing.md,
    color: theme.colors.primary,
  },
  dropdownContainer: {
    marginBottom: theme.spacing.md,
  },
  dropdownCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing.sm,
    overflow: 'hidden',
  },
  selectedHint: {
    marginTop: theme.spacing.xs,
    color: theme.colors.textSecondary,
  },
  segmentedButtons: {
    marginBottom: theme.spacing.md,
  },
  addAllButton: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    color: theme.colors.error,
  },
});
