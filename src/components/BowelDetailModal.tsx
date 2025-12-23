  import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Text, Button, Divider, Chip } from 'react-native-paper';
import { theme } from '@/styles';
import { BowelEntry } from '@/types/bowel';
import { formatTime, formatDate } from '@/utils/dateTime';

interface BowelDetailModalProps {
  visible: boolean;
  onDismiss: () => void;
  entry: BowelEntry | null;
  onDelete?: () => void;
}

export default function BowelDetailModal({
  visible,
  onDismiss,
  entry,
  onDelete,
}: BowelDetailModalProps) {
  if (!entry) {
    return null;
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Low':
        return theme.colors.primary;
      case 'Medium':
        return '#ff9800';
      case 'High':
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
            Bowel Movement
          </Text>
          <Text variant="bodyMedium" style={styles.timeText}>
            {formatDate(entry.occurredAt)} at {formatTime(entry.occurredAt)}
          </Text>

          <Divider style={styles.divider} />

          <View style={styles.urgencyRow}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Urgency:{' '}
            </Text>
            <Chip
              style={[
                styles.urgencyChip,
                { backgroundColor: getUrgencyColor(entry.urgency) },
              ]}
              textStyle={styles.urgencyText}
            >
              {entry.urgency}
            </Chip>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.flagsContainer}>
            {entry.mucusPresent && (
              <Chip
                icon="alert-circle"
                style={styles.flagChip}
                textStyle={styles.flagText}
              >
                Mucus Present
              </Chip>
            )}
            {entry.bloodPresent && (
              <Chip
                icon="alert-circle"
                style={[styles.flagChip, styles.bloodChip]}
                textStyle={styles.flagText}
              >
                Blood Present
              </Chip>
            )}
            {!entry.mucusPresent && !entry.bloodPresent && (
              <Text variant="bodySmall" style={styles.noFlagsText}>
                No flags
              </Text>
            )}
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
                Delete Entry
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
  urgencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  urgencyChip: {
  },
  urgencyText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  flagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  flagChip: {
    backgroundColor: theme.colors.infoBackground,
  },
  bloodChip: {
    backgroundColor: '#ffebee',
  },
  flagText: {
    color: theme.colors.text,
  },
  noFlagsText: {
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  deleteButton: {
    marginBottom: theme.spacing.sm,
    borderColor: theme.colors.error,
  },
  closeButton: {
    marginTop: theme.spacing.sm,
  },
});

