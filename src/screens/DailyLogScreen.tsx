import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Divider, SegmentedButtons } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../store';
import { FoodEntry } from '../types/food';
import { SymptomEntry } from '../types/symptoms';
import { BowelEntry } from '../types/bowel';
import { theme } from '../styles';
import { fetchFoodEntries } from '../store/foodSlice';
import { fetchSymptomEntries } from '../store/symptomsSlice';
import { fetchBowelEntries } from '../store/bowelSlice';

interface DayEntry {
  date: string;
  dateObj: Date;
  foodEntries: FoodEntry[];
  symptomEntries: SymptomEntry[];
  bowelEntries: BowelEntry[];
}

type ViewMode = 'all' | 'today' | 'week';

export default function DailyLogScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  
  const dispatch = useAppDispatch();
  const foodEntries = useAppSelector((state) => state.food.entries);
  const symptomEntries = useAppSelector((state) => state.symptoms.entries);
  const bowelEntries = useAppSelector((state) => state.bowel.entries);

  useEffect(() => {
    dispatch(fetchFoodEntries());
    dispatch(fetchSymptomEntries());
    dispatch(fetchBowelEntries());
  }, [dispatch]);

  const organizedEntries = useMemo(() => {
    // Combine all entries with their types
    const allEntries = [
      ...foodEntries.map((entry: FoodEntry) => ({ ...entry, type: 'food' as const })),
      ...symptomEntries.map((entry: SymptomEntry) => ({ ...entry, type: 'symptom' as const })),
      ...bowelEntries.map((entry: BowelEntry) => ({ ...entry, type: 'bowel' as const }))
    ];

    // Group by date
    const entriesByDate = new Map<string, DayEntry>();

    allEntries.forEach(entry => {
      const date = new Date(entry.timestamp);
      const dateKey = date.toDateString();
      
      if (!entriesByDate.has(dateKey)) {
        entriesByDate.set(dateKey, {
          date: dateKey,
          dateObj: date,
          foodEntries: [],
          symptomEntries: [],
          bowelEntries: []
        });
      }

      const dayEntry = entriesByDate.get(dateKey)!;
      
      if (entry.type === 'food') {
        dayEntry.foodEntries.push(entry as FoodEntry);
      } else if (entry.type === 'symptom') {
        dayEntry.symptomEntries.push(entry as SymptomEntry);
      } else if (entry.type === 'bowel') {
        dayEntry.bowelEntries.push(entry as BowelEntry);
      }
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
  }, [foodEntries, symptomEntries, bowelEntries, viewMode]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
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
                  {formatDate(dayEntry.date)}
                </Text>
                <Text variant="bodyMedium" style={styles.dateSubheader}>
                  {dayEntry.date}
                </Text>

                {/* Show all entries chronologically (newest first) */}
                {(() => {
                  const allDayEntries = [
                    ...dayEntry.foodEntries.map(entry => ({ ...entry, type: 'food' as const })),
                    ...dayEntry.symptomEntries.map(entry => ({ ...entry, type: 'symptom' as const })),
                    ...dayEntry.bowelEntries.map(entry => ({ ...entry, type: 'bowel' as const }))
                  ].sort((a, b) => b.timestamp - a.timestamp);

                  return allDayEntries.map((entry) => (
                    <View key={`${entry.type}-${entry.id}`} style={styles.entryItem}>
                      <View style={styles.entryRow}>
                        <Text variant="bodySmall" style={styles.entryTime}>
                          {formatTime(entry.timestamp)}
                        </Text>
                        {entry.type === 'food' && (
                          <Text variant="bodyMedium" style={styles.entryText}>
                            {(entry as FoodEntry).name}
                          </Text>
                        )}
                        
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
                      </View>
                    </View>
                  ));
                })()}

                {/* Summary */}
                <Divider style={styles.divider} />
                <View style={styles.summaryContainer}>
                  <Text variant="bodySmall" style={styles.summaryText}>
                    {dayEntry.foodEntries.length} food entries • {' '}
                    {dayEntry.symptomEntries.length} symptoms • {' '}
                    {dayEntry.bowelEntries.length} bowel movements
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
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