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
import { getAllTriggers, createDishEvent, updateDishEventDeletedAt } from '@/data/foodEntryRepo';
import { findOrCreateDishForUser } from '@/data/dishHelpers';
import { getAuthenticatedUserId } from '@/data/utils';
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
  const [isAddingDish, setIsAddingDish] = useState(false);
  const [isDeletingDish, setIsDeletingDish] = useState<string | null>(null);

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

  const handleAddDish = async () => {
    setIsAddingDish(true);
    setError(null);

    try {
      const userId = await getAuthenticatedUserId();
      const rawEntryId = response.entry_id;

      // Find or create dish with a default name
      const dish = await findOrCreateDishForUser({
        userId,
        dishNameSuggestion: 'New Dish',
      });

      // Create dish_event
      const dishEvent = await createDishEvent({
        userId,
        dishId: dish.id,
        predictedDishId: null,
        rawEntryId,
        confirmedByUser: false,
        deletedAt: null,
      });

      // Create new DishWithTriggers object
      const newDish: DishWithTriggers = {
        dish_event_id: dishEvent.id,
        dish_id: dish.id,
        dish_name: dish.dishName,
        predicted_triggers: [],
      };

      // Update state
      setDishes((prev) => [...prev, newDish]);
      setDishStates((prev) => {
        const newStates = new Map(prev);
        newStates.set(dishEvent.id, {
          dishName: dish.dishName,
          selectedTriggerIds: new Set(),
        });
        return newStates;
      });

      logger.info(FILENAME, 'handleAddDish', 'Dish added successfully', {
        dishEventId: dishEvent.id,
        dishId: dish.id,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add dish';
      setError(errorMessage);
      logger.error(FILENAME, 'handleAddDish', 'Error adding dish', err);
      console.error('Error adding dish:', err);
    } finally {
      setIsAddingDish(false);
    }
  };

  const handleDeleteDish = async (dishEventId: string) => {
    // Prevent deleting if it's the last dish
    if (dishes.length <= 1) {
      setError('Cannot delete the last dish. At least one dish is required.');
      return;
    }

    setIsDeletingDish(dishEventId);
    setError(null);

    try {
      // Soft delete in database
      await updateDishEventDeletedAt(dishEventId, new Date());

      // Remove from state
      setDishes((prev) => prev.filter((dish) => dish.dish_event_id !== dishEventId));
      setDishStates((prev) => {
        const newStates = new Map(prev);
        newStates.delete(dishEventId);
        return newStates;
      });

      // Close trigger modal if it was open for this dish
      if (selectedDishEventId === dishEventId) {
        setShowAddTriggerModal(false);
        setSelectedDishEventId(null);
      }

      logger.info(FILENAME, 'handleDeleteDish', 'Dish deleted successfully', { dishEventId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete dish';
      setError(errorMessage);
      logger.error(FILENAME, 'handleDeleteDish', 'Error deleting dish', err);
      console.error('Error deleting dish:', err);
    } finally {
      setIsDeletingDish(null);
    }
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

        <Button
          mode="outlined"
          onPress={handleAddDish}
          icon="plus"
          style={styles.addDishButton}
          loading={isAddingDish}
          disabled={isAddingDish}
        >
          Add Dish
        </Button>

        {dishes.map((dish) => {
          const dishState = dishStates.get(dish.dish_event_id);
          if (!dishState) return null;

          const selectedTriggers = allTriggers.filter((trigger) =>
            dishState.selectedTriggerIds.has(trigger.id)
          );

          return (
            <Card key={dish.dish_event_id} style={styles.dishCard}>
              <Card.Content>
                <View style={styles.dishHeader}>
                  <Text variant="titleMedium" style={styles.dishLabel}>
                    Dish Name
                  </Text>
                  <Button
                    mode="text"
                    onPress={() => handleDeleteDish(dish.dish_event_id)}
                    icon="delete"
                    compact
                    loading={isDeletingDish === dish.dish_event_id}
                    disabled={isDeletingDish === dish.dish_event_id}
                    textColor={theme.colors.error}
                  >
                    Delete
                  </Button>
                </View>
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
  addDishButton: {
    marginBottom: theme.spacing.md,
  },
  dishCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  dishHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  dishLabel: {
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
    color: theme.colors.error,
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

