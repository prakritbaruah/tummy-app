import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  Card,
  TextInput,
  Button,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme, commonStyles } from '@/styles';
import { confirmFoodEntry } from '@/data/foodEntryService';
import { getAllTriggers } from '@/data/foodEntryRepo';
import { logger } from '@/utils/logger';
import {
  CreateFoodEntryResponse,
  DishWithTriggers,
  ConfirmedDish,
} from '@/types/foodEntry';
import { Trigger } from '@/types/dish';

const FILENAME = 'ConfirmFoodEntryScreen.tsx';

type RootStackParamList = {
  ConfirmFoodEntry: { response: CreateFoodEntryResponse };
  FoodLog: undefined;
};

type ConfirmFoodEntryRouteProp = RouteProp<RootStackParamList, 'ConfirmFoodEntry'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ConfirmFoodEntry'>;

interface DishState {
  dishName: string;
  selectedTriggerIds: Set<string>;
}

export default function ConfirmFoodEntryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ConfirmFoodEntryRouteProp>();
  const { response } = route.params;

  const [dishes, setDishes] = useState<DishWithTriggers[]>(response.dishes);
  const [dishStates, setDishStates] = useState<Map<string, DishState>>(new Map());
  const [allTriggers, setAllTriggers] = useState<Trigger[]>([]);
  const [isLoadingTriggers, setIsLoadingTriggers] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddTriggerModal, setShowAddTriggerModal] = useState(false);
  const [selectedDishEventId, setSelectedDishEventId] = useState<string | null>(null);

  // Initialize dish states with predicted triggers
  useEffect(() => {
    const initialStates = new Map<string, DishState>();
    dishes.forEach((dish) => {
      const predictedTriggerIds = new Set(
        dish.predicted_triggers?.map((t) => t.trigger_id) || []
      );
      initialStates.set(dish.dish_event_id, {
        dishName: dish.dish_name,
        selectedTriggerIds: predictedTriggerIds,
      });
    });
    setDishStates(initialStates);
  }, [dishes]);

  // Load all available triggers
  useEffect(() => {
    const loadTriggers = async () => {
      try {
        const triggers = await getAllTriggers();
        setAllTriggers(triggers);
      } catch (err) {
        console.error('Error loading triggers:', err);
        setError('Failed to load triggers');
      } finally {
        setIsLoadingTriggers(false);
      }
    };
    loadTriggers();
  }, []);
  

  const updateDishName = (dishEventId: string, name: string) => {
    setDishStates((prev) => {
      const newStates = new Map(prev);
      const currentState = newStates.get(dishEventId);
      if (currentState) {
        newStates.set(dishEventId, {
          ...currentState,
          dishName: name,
        });
      }
      return newStates;
    });
  };

  const removeTrigger = (dishEventId: string, triggerId: string) => {
    setDishStates((prev) => {
      const newStates = new Map(prev);
      const currentState = newStates.get(dishEventId);
      if (currentState) {
        const newTriggerIds = new Set(currentState.selectedTriggerIds);
        newTriggerIds.delete(triggerId);
        newStates.set(dishEventId, {
          ...currentState,
          selectedTriggerIds: newTriggerIds,
        });
      }
      return newStates;
    });
  };

  const openAddTriggerModal = (dishEventId: string) => {
    logger.info(FILENAME, 'openAddTriggerModal', 'Opening add trigger modal', { dishEventId });

    const availableTriggers = getAvailableTriggersForDish(dishEventId);

    logger.info(FILENAME, 'openAddTriggerModal', 'Available triggers for dish', { 
      dishEventId, 
      availableCount: availableTriggers.length,
      allTriggersCount: allTriggers.length 
    });

    setSelectedDishEventId(dishEventId);
    setShowAddTriggerModal(true);
  };

  const addTrigger = (triggerId: string) => {
    if (!selectedDishEventId) return;

    setDishStates((prev) => {
      const newStates = new Map(prev);
      const currentState = newStates.get(selectedDishEventId);
      if (currentState) {
        const newTriggerIds = new Set(currentState.selectedTriggerIds);
        newTriggerIds.add(triggerId);
        newStates.set(selectedDishEventId, {
          ...currentState,
          selectedTriggerIds: newTriggerIds,
        });
      }
      return newStates;
    });
  };

  // TODO: make this faster by removing database query
  const getAvailableTriggersForDish = (dishEventId: string): Trigger[] => {
    logger.info(FILENAME, 'getAvailableTriggersForDish', 'Getting available triggers for dish', { dishEventId });
    const dishState = dishStates.get(dishEventId);
    if (!dishState) {
      return allTriggers;
    }

    const selectedIds = dishState.selectedTriggerIds;
    const result = allTriggers.filter((trigger) => !selectedIds.has(trigger.id));
    return result;
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    setError(null);

    try {
      const confirmedDishes: ConfirmedDish[] = dishes.map((dish) => {
        const dishState = dishStates.get(dish.dish_event_id);
        if (!dishState) {
          throw new Error(`Missing state for dish ${dish.dish_event_id}`);
        }

        return {
          dish_event_id: dish.dish_event_id,
          dish_id: dish.dish_id,
          final_dish_name: dishState.dishName.trim() || dish.dish_name,
          trigger_ids: Array.from(dishState.selectedTriggerIds),
        };
      });

      await confirmFoodEntry(response.entry_id, {
        confirmed_dishes: confirmedDishes,
      });

      // Navigate to DailyLog tab
      logger.info(FILENAME, 'handleConfirm', 'Food entry confirmed, navigating to DailyLog');
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'Main', params: { screen: 'DailyLog' } }],
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to confirm food entry';
      setError(errorMessage);
      console.error('Error confirming food entry:', err);
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoadingTriggers) {
    return (
      <View style={[commonStyles.container, styles.centerContent]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Loading triggers...
        </Text>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineSmall" style={styles.title}>
          Review Your Meal
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Review the dishes and triggers, then confirm to log your meal.
        </Text>

        {dishes.map((dish) => {
          const dishState = dishStates.get(dish.dish_event_id);
          if (!dishState) return null;

          const selectedTriggers = allTriggers.filter((trigger) =>
            dishState.selectedTriggerIds.has(trigger.id)
          );

          return (
            <Card key={dish.dish_event_id} style={styles.dishCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.dishLabel}>
                  Dish Name
                </Text>
                <TextInput
                  value={dishState.dishName}
                  onChangeText={(text) => updateDishName(dish.dish_event_id, text)}
                  style={styles.dishNameInput}
                  mode="outlined"
                  placeholder="Enter dish name"
                />

                <View style={styles.triggersSection}>
                  <View style={styles.triggersHeader}>
                    <Text variant="titleMedium" style={styles.triggersLabel}>
                      Triggers
                    </Text>
                    <Button
                      mode="text"
                      onPress={() => {
                        logger.info(FILENAME, 'handleAddTriggerButtonPress', 'Add trigger button pressed', { dishEventId: dish.dish_event_id });
                        openAddTriggerModal(dish.dish_event_id);
                      }}
                      icon="plus"
                      compact
                    >
                      Add Trigger
                    </Button>
                  </View>

                  {selectedTriggers.length === 0 ? (
                    <Text variant="bodySmall" style={styles.noTriggersText}>
                      No triggers selected
                    </Text>
                  ) : (
                    <View style={styles.triggersContainer}>
                      {selectedTriggers.map((trigger) => (
                        <Chip
                          key={trigger.id}
                          style={styles.triggerChip}
                          onClose={() => removeTrigger(dish.dish_event_id, trigger.id)}
                          mode="flat"
                        >
                          {trigger.triggerName}
                        </Chip>
                      ))}
                    </View>
                  )}

                  {showAddTriggerModal && selectedDishEventId === dish.dish_event_id && (
                    <View style={styles.addTriggerContainer}>
                      <Text variant="bodySmall" style={styles.addTriggerTitle}>
                        Select a trigger to add:
                      </Text>
                      {getAvailableTriggersForDish(dish.dish_event_id).length === 0 ? (
                        <Text variant="bodySmall" style={styles.noTriggersText}>
                          All triggers are already added
                        </Text>
                      ) : (
                        <View style={styles.availableTriggersContainer}>
                          {getAvailableTriggersForDish(dish.dish_event_id).map((trigger) => (
                            <Button
                              key={trigger.id}
                              mode="outlined"
                              onPress={() => {
                                addTrigger(trigger.id);
                              }}
                              style={styles.triggerButton}
                              compact
                            >
                              {trigger.triggerName}
                            </Button>
                          ))}
                        </View>
                      )}
                      <Button
                        mode="text"
                        onPress={() => {
                          setShowAddTriggerModal(false);
                          setSelectedDishEventId(null);
                        }}
                        style={styles.cancelButton}
                        compact
                      >
                        Cancel
                      </Button>
                    </View>
                  )}
                </View>
              </Card.Content>
            </Card>
          );
        })}

        {error && (
          <Text variant="bodySmall" style={styles.errorText}>
            {error}
          </Text>
        )}

        <Button
          mode="contained"
          onPress={handleConfirm}
          style={styles.confirmButton}
          loading={isConfirming}
          disabled={isConfirming}
        >
          {isConfirming ? 'Confirming...' : 'Confirm Meal'}
        </Button>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  title: {
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
    color: theme.colors.textHeading,
  },
  subtitle: {
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  dishCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  dishLabel: {
    marginBottom: theme.spacing.xs,
    color: theme.colors.textHeading,
  },
  dishNameInput: {
    marginBottom: theme.spacing.md,
  },
  triggersSection: {
    marginTop: theme.spacing.sm,
  },
  triggersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  triggersLabel: {
    color: theme.colors.textHeading,
  },
  triggersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  triggerChip: {
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  noTriggersText: {
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  confirmButton: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  errorText: {
    color: '#d32f2f',
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  addTriggerContainer: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary + '20',
  },
  addTriggerTitle: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.textHeading,
    fontWeight: '600',
  },
  availableTriggersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  triggerButton: {
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  cancelButton: {
    marginTop: theme.spacing.xs,
  },
});

