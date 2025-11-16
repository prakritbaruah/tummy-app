import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Divider, SegmentedButtons } from 'react-native-paper';
import { useAppSelector } from '../store';
import { FoodEntry } from '../types/food';
import { SymptomEntry } from '../types/symptoms';
import { BowelEntry } from '../types/bowel';
import { theme, commonStyles } from '../styles';

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
  
  const foodEntries = useAppSelector((state) => state.food.entries);
  const symptomEntries = useAppSelector((state) => state.symptoms.entries);
  const bowelEntries = useAppSelector((state) => state.bowel.entries);

  const organizedEntries = useMemo(() => {
    // Combine all entries with their types
    const allEntries = [
      ...foodEntries.map(entry => ({ ...entry, type: 'food' as const })),
      ...symptomEntries.map(entry => ({ ...entry, type: 'symptom' as const })),
      ...bowelEntries.map(entry => ({ ...entry, type: 'bowel' as const }))
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

                {/* Organize entries by timing */}
                {['evening', 'afternoon', 'morning'].map((timingPeriod) => {
                  // Get all entries for this timing period
                  const periodFoodEntries = dayEntry.foodEntries.filter(entry => {
                    const hour = new Date(entry.timestamp).getHours();
                    if (timingPeriod === 'morning') return hour >= 5 && hour < 12;
                    if (timingPeriod === 'afternoon') return hour >= 12 && hour < 18;
                    return hour >= 18 || hour < 5; // evening
                  });
                  
                  const periodSymptomEntries = dayEntry.symptomEntries.filter(entry => 
                    entry.timing === timingPeriod
                  );
                  
                  const periodBowelEntries = dayEntry.bowelEntries.filter(entry => 
                    entry.timing === timingPeriod
                  );

                  // Combine all entries for this period and sort by timestamp (newest first)
                  const allPeriodEntries = [
                    ...periodFoodEntries.map(entry => ({ ...entry, type: 'food' as const })),
                    ...periodSymptomEntries.map(entry => ({ ...entry, type: 'symptom' as const })),
                    ...periodBowelEntries.map(entry => ({ ...entry, type: 'bowel' as const }))
                  ].sort((a, b) => b.timestamp - a.timestamp);

                  if (allPeriodEntries.length === 0) return null;

                  return (
                    <View key={timingPeriod} style={styles.timingSection}>
                      <Text variant="titleMedium" style={styles.timingTitle}>
                        {timingPeriod.charAt(0).toUpperCase() + timingPeriod.slice(1)}
                      </Text>
                      
                        {allPeriodEntries.map((entry) => (
                         <View key={`${entry.type}-${entry.id}`} style={styles.entryItem}>
                           <View style={styles.entryRow}>
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
                             
                             <Text variant="bodySmall" style={styles.entryTime}>
                               {formatTime(entry.timestamp)}
                             </Text>
                           </View>
                         </View>
                       ))}
                    </View>
                  );
                })}

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
  timingSection: {
    marginBottom: theme.spacing.md,
  },
  timingTitle: {
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
    color: theme.colors.primary,
    fontSize: 16,
  },
  entryItem: {
    marginBottom: theme.spacing.xs,
    paddingLeft: theme.spacing.md,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryText: {
    color: theme.colors.textTertiary,
    flex: 1,
  },
  entryTime: {
    color: theme.colors.textSecondary,
    fontSize: 12,
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