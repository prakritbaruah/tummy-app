import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated, Dimensions, TouchableWithoutFeedback, PanResponder } from 'react-native';
import { Button, Text, Card } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../styles';

const { height: screenHeight } = Dimensions.get('window');

const addScreenHeightRatio: number = 0.37;

export default function AddScreen() {
  const [slideAnim] = useState(new Animated.Value(screenHeight));
  const navigation = useNavigation();

  // Pan responder for swipe down to dismiss
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to vertical swipes down
      return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 0;
    },
    onPanResponderMove: (evt, gestureState) => {
      // Update animation value based on gesture
      if (gestureState.dy > 0) {
        slideAnim.setValue(screenHeight * (1 - addScreenHeightRatio) + gestureState.dy);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      // If swiped down enough, close the modal
      if (gestureState.dy > 100 || gestureState.vy > 0.5) {
        handleClose();
      } else {
        // Snap back to original position
        Animated.timing(slideAnim, {
          toValue: screenHeight * (1 - addScreenHeightRatio),
          duration: 100,
          useNativeDriver: false,
        }).start();
      }
    },
  });

  useEffect(() => {
    // Slide up animation when component mounts
    Animated.timing(slideAnim, {
      toValue: screenHeight * (1 - addScreenHeightRatio),
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, []);

  const handleClose = () => {
    // Slide down animation before navigating back
    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: 100,
      useNativeDriver: false,
    }).start(() => {
      navigation.goBack();
    });
  };

  const handleAddMeal = () => {
    // Navigate directly without animation conflicts
    navigation.navigate('FoodLog' as never);
  };

  const handleAddSymptoms = () => {
    // Navigate directly without animation conflicts
    navigation.navigate('Symptoms' as never);
  };

  const handleAddBowelMovement = () => {
    // Navigate directly without animation conflicts
    navigation.navigate('Bowel' as never);
  };

  return (
    <View style={styles.container}>
      {/* Background overlay - touchable to close */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      
      {/* Sliding panel */}
      <Animated.View style={[styles.panel, { top: slideAnim }]} {...panResponder.panHandlers}>
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text variant="headlineSmall" style={styles.title}>
              What would you like to add?
            </Text>
            
            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={handleAddMeal}
                style={styles.button}
                icon="food"
              >
                Add Meal
              </Button>
              
              <Button
                mode="contained"
                onPress={handleAddSymptoms}
                style={styles.button}
                icon="medical-bag"
              >
                Add Symptoms
              </Button>
              
              <Button
                mode="contained"
                onPress={handleAddBowelMovement}
                style={styles.button}
                icon="clipboard-pulse"
              >
                Add Bowel Movement
              </Button>
            </View>
          </Card.Content>
        </Card>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: screenHeight * addScreenHeightRatio,
    backgroundColor: 'transparent',
  },
  card: {
    flex: 1,
    marginHorizontal: 0, // Remove horizontal margins for full width
    marginTop: 0,
    marginBottom: 0,
    borderTopLeftRadius: theme.spacing.xl,
    borderTopRightRadius: theme.spacing.xl,
    borderBottomLeftRadius: 0, // Remove bottom radius for full bottom coverage
    borderBottomRightRadius: 0,
  },
  cardContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl, // Extra padding at bottom for tab bar clearance
  },
  title: {
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  buttonContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  button: {
    paddingVertical: theme.spacing.sm,
  },
}); 