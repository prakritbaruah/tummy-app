import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, IconButton } from 'react-native-paper';
import { Provider as StoreProvider } from 'react-redux';
import { store } from './src/store';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import FoodLogScreen from './src/screens/FoodLogScreen';
import SymptomsScreen from './src/screens/SymptomsScreen';
import BowelScreen from './src/screens/BowelScreen';
import DailyLogScreen from './src/screens/DailyLogScreen';
import AddScreen from './src/screens/AddScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

// Import authentication components
import { AuthGuard } from './src/components/auth/AuthGuard';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
      }}
    >
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
        component={AddScreen}
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
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="account-outline" size={size} iconColor={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <StoreProvider store={store}>
      <PaperProvider>
        <NavigationContainer>
          <AuthGuard>
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
          </AuthGuard>
        </NavigationContainer>
      </PaperProvider>
    </StoreProvider>
  );
}
