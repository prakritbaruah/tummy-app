import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Text, Button, Divider } from 'react-native-paper';
import { theme } from '@/styles';
import { SymptomEntry } from '@/types/symptoms';
import { formatTime, formatDate } from '@/utils/dateTime';

interface SymptomDetailModalProps {
  visible: boolean;
  onDismiss: () => void;
  entry: SymptomEntry | null;
  onDelete?: () => void;
}

export default function SymptomDetailModal({
  visible,
  onDismiss,
  entry,
  onDelete,
}: SymptomDetailModalProps) {
  if (!entry) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Low':
        return theme.colors.primary;
      case 'Mild':
        return '#9c9c9c';
      case 'Moderate':
        return '#ff9800';
      case 'High':
        return '#f44336';
      case 'Severe':
        return theme.colors.error;
      default:
        return theme.colors.text;
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.container}
      >
        <View style={styles.content}>
          <Text variant="headlineSmall" style={styles.title}>
            {entry.name}
          </Text>
          <Text variant="bodyMedium" style={styles.timeText}>
            {formatDate(entry.occurredAt)} at {formatTime(entry.occurredAt)}
          </Text>

          <Divider style={styles.divider} />

          <View style={styles.severityRow}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Severity:{' '}
            </Text>
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: getSeverityColor(entry.severity) },
              ]}
            >
              <Text variant="bodyLarge" style={styles.severityText}>
                {entry.severity}
              </Text>
            </View>
          </View>

          {onDelete && (
            <>
              <Divider style={styles.divider} />
              <Button
                mode="outlined"
                onPress={onDelete}
                textColor={theme.colors.error}
                style={styles.deleteButton}
                icon="delete"
              >
                Delete Symptom
              </Button>
            </>
          )}

          <Button
            mode="contained"
            onPress={onDismiss}
            style={styles.closeButton}
          >
            Close
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    borderRadius: 12,
    padding: 0,
  },
  content: {
    padding: theme.spacing.md,
  },
  title: {
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  timeText: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  divider: {
    marginVertical: theme.spacing.md,
  },
  sectionTitle: {
    fontWeight: '600',
    color: theme.colors.textHeading,
  },
  severityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  severityBadge: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 8,
  },
  severityText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  deleteButton: {
    marginBottom: theme.spacing.sm,
    borderColor: theme.colors.error,
  },
  closeButton: {
    marginTop: theme.spacing.sm,
  },
});

