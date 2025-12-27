import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, Text as RNText, Platform } from 'react-native';
import { Text, Card } from 'react-native-paper';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { theme } from '@/styles';
import { formatTime, formatDate } from '@/utils/dateTime';

interface DateTimePickerCardProps {
  value: Date;
  onChange: (date: Date) => void;
}

export default function TimePickerCard({ value, onChange }: DateTimePickerCardProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleDateTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (date) {
      onChange(date);
    }
  };

  return (
    <Card style={styles.card}>
      {/* Time Row */}
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => setShowPicker(!showPicker)}
      >
        <Card.Content style={styles.rowHeader}>
          <Text variant="titleMedium" style={styles.label}>Time</Text>
          <RNText style={styles.valueText}>
            {formatDate(value, 'short')} {formatTime(value)}
          </RNText>
        </Card.Content>
      </TouchableOpacity>
      {showPicker && (
        <Card.Content style={styles.pickerContainer}>
          <DateTimePicker
            value={value}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateTimeChange}
            accentColor={theme.colors.primary}
            style={styles.inlinePicker}
            maximumDate={new Date()}
          />
        </Card.Content>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.md,
    elevation: 2,
    backgroundColor: theme.colors.infoBackground,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  label: {
    color: theme.colors.primary,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  pickerContainer: {
    alignItems: 'center',
    paddingTop: 0,
  },
  inlinePicker: {
    backgroundColor: theme.colors.infoBackground,
  },
});
