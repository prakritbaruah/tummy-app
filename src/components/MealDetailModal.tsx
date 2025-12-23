import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Text, Button, Divider, ActivityIndicator } from 'react-native-paper';
import { theme } from '@/styles';
import { getConfirmedTriggersByDishEventIds, getTriggerById } from '@/data/foodEntryRepo';
import { Trigger } from '@/types/dish';
import { getTriggerDisplayText } from '@/data/trigger';
import { formatTime, formatDate } from '@/utils/dateTime';

interface MealDetailModalProps {
  visible: boolean;
  onDismiss: () => void;
  dishEventId: string;
  dishName: string;
  occurredAt: number;
  onDelete?: () => void;
}

export default function MealDetailModal({
  visible,
  onDismiss,
  dishEventId,
  dishName,
  occurredAt,
  onDelete,
}: MealDetailModalProps) {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (visible && dishEventId) {
      loadTriggers();
    } else {
      setTriggers([]);
      setIsLoading(true);
    }
  }, [visible, dishEventId]);

  const loadTriggers = async () => {
    try {
      setIsLoading(true);
      const dishTriggers = await getConfirmedTriggersByDishEventIds([dishEventId]);
      
      // Get trigger names
      const triggerIds = dishTriggers.map((dt) => dt.triggerId);
      const triggerPromises = triggerIds.map((id) => getTriggerById(id));
      const triggerResults = await Promise.all(triggerPromises);
      
      const validTriggers = triggerResults.filter(
        (t): t is Trigger => t !== null
      );
      setTriggers(validTriggers);
    } catch (error) {
      console.error('Error loading triggers:', error);
      setTriggers([]);
    } finally {
      setIsLoading(false);
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
            {dishName}
          </Text>
          <Text variant="bodyMedium" style={styles.timeText}>
            {formatDate(occurredAt)} at {formatTime(occurredAt)}
          </Text>

          <Divider style={styles.divider} />

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Triggers
          </Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : triggers.length > 0 ? (
            <View style={styles.triggersList}>
              {triggers.map((trigger) => (
                <View key={trigger.id} style={styles.triggerItem}>
                  <Text variant="bodyMedium" style={styles.triggerText}>
                    {getTriggerDisplayText(trigger.triggerName)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text variant="bodySmall" style={styles.noTriggersText}>
              No triggers associated with this meal
            </Text>
          )}

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
                Delete Meal
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
    marginBottom: theme.spacing.sm,
  },
  loadingContainer: {
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  triggersList: {
    marginTop: theme.spacing.xs,
  },
  triggerItem: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.infoBackground,
    borderRadius: 8,
    marginBottom: theme.spacing.xs,
  },
  triggerText: {
    color: theme.colors.text,
  },
  noTriggersText: {
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  deleteButton: {
    marginBottom: theme.spacing.sm,
    borderColor: theme.colors.error,
  },
  closeButton: {
    marginTop: theme.spacing.sm,
  },
});


