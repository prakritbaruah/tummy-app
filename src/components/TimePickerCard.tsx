import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, Text as RNText, Platform, View } from 'react-native';
import { Text, Card } from 'react-native-paper';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { theme } from '@/styles';

interface DateTimePickerCardProps {
  value: Date;
  onChange: (date: Date) => void;
}

export default function TimePickerCard({ value, onChange }: DateTimePickerCardProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      // Preserve the time from current value, update only the date
      const newDate = new Date(value);
      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      onChange(newDate);
    }
  };

  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (date) {
      // Preserve the date from current value, update only the time
      const newDate = new Date(value);
      newDate.setHours(date.getHours(), date.getMinutes());
      onChange(newDate);
    }
  };

  const formatDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card style={styles.card}>
      {/* Date Row */}
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => {
          setShowDatePicker(!showDatePicker);
          setShowTimePicker(false);
        }}
      >
        <Card.Content style={styles.rowHeader}>
          <Text variant="titleMedium" style={styles.label}>Date</Text>
          <RNText style={styles.valueText}>{formatDate(value)}</RNText>
        </Card.Content>
      </TouchableOpacity>
      {showDatePicker && (
        <Card.Content style={styles.pickerContainer}>
          <DateTimePicker
            value={value}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            accentColor={theme.colors.primary}
            style={styles.inlinePicker}
            maximumDate={new Date()}
          />
        </Card.Content>
      )}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Time Row */}
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => {
          setShowTimePicker(!showTimePicker);
          setShowDatePicker(false);
        }}
      >
        <Card.Content style={styles.rowHeader}>
          <Text variant="titleMedium" style={styles.label}>Time</Text>
          <RNText style={styles.valueText}>{formatTime(value)}</RNText>
        </Card.Content>
      </TouchableOpacity>
      {showTimePicker && (
        <Card.Content style={styles.pickerContainer}>
          <DateTimePicker
            value={value}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
            accentColor={theme.colors.primary}
            style={styles.inlinePicker}
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
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
  pickerContainer: {
    alignItems: 'center',
    paddingTop: 0,
  },
  inlinePicker: {
    backgroundColor: theme.colors.infoBackground,
  },
});
