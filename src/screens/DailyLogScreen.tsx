import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Divider, SegmentedButtons } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '@/store';
import { SymptomEntry } from '@/types/symptoms';
import { BowelEntry } from '@/types/bowel';
import { theme } from '@/styles';
import { fetchSymptomEntries, deleteSymptomEntryAsync } from '@/store/symptomsSlice';
import { fetchBowelEntries, deleteBowelEntryAsync } from '@/store/bowelSlice';
import { getFoodEntriesForUser } from '@/data/foodEntryService';
import { updateDishEventDeletedAt } from '@/data/foodEntryRepo';
import {
  MealDetailModal,
  SymptomDetailModal,
  BowelDetailModal,
} from '@/components';
import { formatTime, formatDate } from '@/utils/dateTime';

interface DayEntry {
  date: string;
  dateObj: Date;
  symptomEntries: SymptomEntry[];
  bowelEntries: BowelEntry[];
  foodEntries: Array<{
    dishEventId: string;
    dishName: string;
    occurredAt: number;
  }>;
}

type ViewMode = 'all' | 'today' | 'week';

export default function DailyLogScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [foodEntries, setFoodEntries] = useState<Awaited<ReturnType<typeof getFoodEntriesForUser>>>([]);
  const [isLoadingFood, setIsLoadingFood] = useState(true);
  
  // Modal states
  const [selectedMeal, setSelectedMeal] = useState<{
    dishEventId: string;
    dishName: string;
    occurredAt: number;
  } | null>(null);
  const [selectedSymptom, setSelectedSymptom] = useState<SymptomEntry | null>(null);
  const [selectedBowel, setSelectedBowel] = useState<BowelEntry | null>(null);
  
  const dispatch = useAppDispatch();
  const symptomEntries = useAppSelector((state) => state.symptoms.entries);
  const bowelEntries = useAppSelector((state) => state.bowel.entries);

  useEffect(() => {
    dispatch(fetchSymptomEntries());
    dispatch(fetchBowelEntries());
    
    // Fetch food entries
    const loadFoodEntries = async () => {
      try {
        setIsLoadingFood(true);
        const entries = await getFoodEntriesForUser();
        setFoodEntries(entries);
      } catch (error) {
        console.error('Error loading food entries:', error);
      } finally {
        setIsLoadingFood(false);
      }
    };
    loadFoodEntries();
  }, [dispatch]);

  const organizedEntries = useMemo(() => {
    // Combine all entries with their types
    const allEntries = [
      ...symptomEntries.map((entry: SymptomEntry) => ({ ...entry, type: 'symptom' as const })),
      ...bowelEntries.map((entry: BowelEntry) => ({ ...entry, type: 'bowel' as const }))
    ];

    // Group by date
    const entriesByDate = new Map<string, DayEntry>();

    allEntries.forEach(entry => {
      const date = new Date(entry.occurredAt);
      const dateKey = date.toDateString();
      
      if (!entriesByDate.has(dateKey)) {
        entriesByDate.set(dateKey, {
          date: dateKey,
          dateObj: date,
          symptomEntries: [],
          bowelEntries: [],
          foodEntries: []
        });
      }

      const dayEntry = entriesByDate.get(dateKey)!;
      
      if (entry.type === 'symptom') {
        dayEntry.symptomEntries.push(entry as SymptomEntry);
      } else if (entry.type === 'bowel') {
        dayEntry.bowelEntries.push(entry as BowelEntry);
      }
    });

    // Add food entries grouped by date
    foodEntries.forEach((foodEntry) => {
      const date = new Date(foodEntry.occurredAt);
      const dateKey = date.toDateString();
      
      if (!entriesByDate.has(dateKey)) {
        entriesByDate.set(dateKey, {
          date: dateKey,
          dateObj: date,
          symptomEntries: [],
          bowelEntries: [],
          foodEntries: []
        });
      }

      const dayEntry = entriesByDate.get(dateKey)!;
      dayEntry.foodEntries.push({
        dishEventId: foodEntry.dishEventId,
        dishName: foodEntry.dishName,
        occurredAt: foodEntry.occurredAt
      });
    });

    // Convert to array and sort by date (newest first)
    const sortedEntries = Array.from(entriesByDate.values()).sort(
      (a, b) => b.dateObj.getTime() - a.dateObj.getTime()
    );

    // Filter based on view mode
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    switch (viewMode) {
      case 'today':
        return sortedEntries.filter(entry => 
          entry.dateObj.toDateString() === today.toDateString()
        );
      case 'week':
        return sortedEntries.filter(entry => 
          entry.dateObj >= weekAgo
        );
      default:
        return sortedEntries;
    }
  }, [symptomEntries, bowelEntries, foodEntries, viewMode]);

  const handleDeleteMeal = async () => {
    if (!selectedMeal) return;
    
    try {
      await updateDishEventDeletedAt(selectedMeal.dishEventId, new Date());
      // Refresh food entries
      const entries = await getFoodEntriesForUser();
      setFoodEntries(entries);
      setSelectedMeal(null);
    } catch (error) {
      console.error('Error deleting meal:', error);
    }
  };

  const handleDeleteSymptom = async () => {
    if (!selectedSymptom) return;
    
    try {
      await dispatch(deleteSymptomEntryAsync(selectedSymptom.id)).unwrap();
      setSelectedSymptom(null);
    } catch (error) {
      console.error('Error deleting symptom:', error);
    }
  };

  const handleDeleteBowel = async () => {
    if (!selectedBowel) return;
    
    try {
      await dispatch(deleteBowelEntryAsync(selectedBowel.id)).unwrap();
      setSelectedBowel(null);
    } catch (error) {
      console.error('Error deleting bowel entry:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={viewMode}
          onValueChange={value => setViewMode(value as ViewMode)}
          buttons={[
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'This Week' },
            { value: 'all', label: 'All Time' },
          ]}
        />
      </View>

      <ScrollView style={styles.scrollContainer}>
        {organizedEntries.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="bodyLarge" style={styles.emptyText}>
                No entries found for the selected time period.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          organizedEntries.map((dayEntry) => (
            <Card key={dayEntry.date} style={styles.dayCard}>
              <Card.Content>
                <Text variant="headlineSmall" style={styles.dateHeader}>
                  {formatDate(dayEntry.dateObj)}
                </Text>
                <Text variant="bodyMedium" style={styles.dateSubheader}>
                  {dayEntry.date}
                </Text>

                {/* Show all entries chronologically (newest first) */}
                {(() => {
                  const allDayEntries = [
                    ...dayEntry.symptomEntries.map(entry => ({ ...entry, type: 'symptom' as const })),
                    ...dayEntry.bowelEntries.map(entry => ({ ...entry, type: 'bowel' as const })),
                    ...dayEntry.foodEntries.map(foodEntry => ({
                      type: 'food' as const,
                      dishEventId: foodEntry.dishEventId,
                      dishName: foodEntry.dishName,
                      occurredAt: foodEntry.occurredAt
                    }))
                  ].sort((a, b) => b.occurredAt - a.occurredAt);

                  return allDayEntries.map((entry, index) => (
                    <TouchableOpacity
                      key={`${entry.type}-${entry.type === 'food' ? entry.dishEventId : entry.id}`}
                      style={styles.entryItem}
                      onPress={() => {
                        if (entry.type === 'food') {
                          setSelectedMeal({
                            dishEventId: entry.dishEventId,
                            dishName: entry.dishName,
                            occurredAt: entry.occurredAt,
                          });
                        } else if (entry.type === 'symptom') {
                          setSelectedSymptom(entry as SymptomEntry);
                        } else if (entry.type === 'bowel') {
                          setSelectedBowel(entry as BowelEntry);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.entryRow}>
                        <Text variant="bodySmall" style={styles.entryTime}>
                          {formatTime(entry.occurredAt)}
                        </Text>                        
                        {entry.type === 'symptom' && (
                          <Text variant="bodyMedium" style={styles.entryText}>
                            {(entry as SymptomEntry).name}
                          </Text>
                        )}
                        
                        {entry.type === 'bowel' && (
                          <Text variant="bodyMedium" style={styles.entryText}>
                            Bowel Movement
                          </Text>
                        )}

                        {entry.type === 'food' && (
                          <Text variant="bodyMedium" style={styles.entryText}>
                            {entry.dishName}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ));
                })()}

                {/* Summary */}
                <Divider style={styles.divider} />
                <View style={styles.summaryContainer}>
                  <Text variant="bodySmall" style={styles.summaryText}>
                    {dayEntry.symptomEntries.length} symptoms • {' '}
                    {dayEntry.bowelEntries.length} bowel movements • {' '}
                    {dayEntry.foodEntries.length} meals
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Detail Modals */}
      <MealDetailModal
        visible={selectedMeal !== null}
        onDismiss={() => setSelectedMeal(null)}
        dishEventId={selectedMeal?.dishEventId || ''}
        dishName={selectedMeal?.dishName || ''}
        occurredAt={selectedMeal?.occurredAt || 0}
        onDelete={handleDeleteMeal}
      />

      <SymptomDetailModal
        visible={selectedSymptom !== null}
        onDismiss={() => setSelectedSymptom(null)}
        entry={selectedSymptom}
        onDelete={handleDeleteSymptom}
      />

      <BowelDetailModal
        visible={selectedBowel !== null}
        onDismiss={() => setSelectedBowel(null)}
        entry={selectedBowel}
        onDelete={handleDeleteBowel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  filterContainer: {
    margin: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  dayCard: {
    marginBottom: theme.spacing.md,
    elevation: 2,
  },
  emptyCard: {
    marginTop: theme.spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  dateHeader: {
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  dateSubheader: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  entryItem: {
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryText: {
    color: theme.colors.text,
    flex: 1,
  },
  entryTime: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
    minWidth: 70,
    marginRight: theme.spacing.md,
  },
  divider: {
    marginVertical: 12,
  },
  summaryContainer: {
    alignItems: 'center',
  },
  summaryText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
}); 