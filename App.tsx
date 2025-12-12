import React from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, IconButton } from 'react-native-paper';
import { Provider as StoreProvider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import FoodLogScreen from './src/screens/FoodLogScreen';
import SymptomsScreen from './src/screens/SymptomsScreen';
import BowelScreen from './src/screens/BowelScreen';
import DailyLogScreen from './src/screens/DailyLogScreen';
import AddScreen from './src/screens/AddScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AddTabPlaceholder() {
  return null;
}

function TabNavigator() {
  const navigation = useNavigation();

  return (
    <Tab.Navigator>
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="home-outline" size={size} iconColor={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Add" 
        component={AddTabPlaceholder}
        options={{
          title: 'Add',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="plus" size={size} iconColor={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('AddModal');
          },
        })}
      />
      <Tab.Screen 
        name="DailyLog" 
        component={DailyLogScreen}
        options={{
          title: 'Daily Log',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="clipboard-text-outline" size={size} iconColor={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <StoreProvider store={store}>
      <SafeAreaProvider>
        <PaperProvider>
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen 
                name="Main" 
                component={TabNavigator}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="AddModal" 
                component={AddScreen}
                options={{ 
                  presentation: 'transparentModal',
                  headerShown: false,
                  animation: 'slide_from_bottom'
                }}
              />
              <Stack.Screen 
                name="FoodLog" 
                component={FoodLogScreen}
                options={{ title: 'Add Meal' }}
              />
              <Stack.Screen 
                name="Symptoms" 
                component={SymptomsScreen}
                options={{ title: 'Add Symptoms' }}
              />
              <Stack.Screen 
                name="Bowel" 
                component={BowelScreen}
                options={{ title: 'Add Bowel Movement' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </StoreProvider>
  );
}
