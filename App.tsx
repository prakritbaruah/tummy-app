import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, IconButton } from 'react-native-paper';
import { Provider as StoreProvider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import {
  LeagueSpartan_600SemiBold,
  LeagueSpartan_700Bold,
} from '@expo-google-fonts/league-spartan';
import * as SplashScreen from 'expo-splash-screen';
import { store } from '@/store';
import { paperTheme, navigationTheme } from '@/styles';
import { AuthProvider, useAuth } from '@/contexts';
import { useAppInitialization } from '@/hooks/useAppInitialization';

// Import screens
import HomeScreen from '@/screens/HomeScreen';
import FoodLogScreen from '@/screens/FoodLogScreen';
import ConfirmFoodEntryScreen from '@/screens/ConfirmFoodEntryScreen';
import SymptomsScreen from '@/screens/SymptomsScreen';
import BowelScreen from '@/screens/BowelScreen';
import DailyLogScreen from '@/screens/DailyLogScreen';
import AddScreen from '@/screens/AddScreen';
import LoginScreen from '@/screens/LoginScreen';
import SignUpScreen from '@/screens/SignUpScreen';
import EmailConfirmationScreen from '@/screens/EmailConfirmationScreen';
import AppLoadingScreen from '@/screens/AppLoadingScreen';
import ProfileScreen from '@/screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AddTabPlaceholder() {
  return null;
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ navigation }) => ({
        tabBarActiveTintColor: paperTheme.colors.primary,
        tabBarInactiveTintColor: paperTheme.colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: paperTheme.colors.surface },
        tabBarLabelStyle: {
          fontFamily: paperTheme.fonts.labelMedium.fontFamily,
        },
        headerStyle: { backgroundColor: paperTheme.colors.surface },
        headerTitleStyle: {
          fontFamily: paperTheme.fonts.titleMedium.fontFamily,
          color: paperTheme.colors.onSurface,
        },
        headerLeft: () => (
          <IconButton
            icon="account-circle-outline"
            iconColor={paperTheme.colors.onSurface}
            onPress={() => {
              const parentNav = navigation.getParent();
              if (parentNav) {
                parentNav.navigate('Profile');
              } else {
                navigation.navigate('Profile');
              }
            }}
            accessibilityLabel="Open profile"
          />
        ),
      })}
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

function AuthNavigator() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen 
          name="EmailConfirmation" 
          component={EmailConfirmationScreen}
          options={{ 
            headerShown: true,
            title: 'Confirm Email',
          }}
        />
      </Stack.Navigator>
    );
  }

  return (
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
        name="ConfirmFoodEntry" 
        component={ConfirmFoodEntryScreen}
        options={{ title: 'Confirm Meal' }}
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
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          presentation: 'modal',
          headerShown: false,
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
}

function AppContent() {
  const [fontsLoaded] = useFonts({
    NunitoRegular: Nunito_400Regular,
    NunitoSemiBold: Nunito_600SemiBold,
    NunitoBold: Nunito_700Bold,
    LeagueSpartanSemiBold: LeagueSpartan_600SemiBold,
    LeagueSpartanBold: LeagueSpartan_700Bold,
  });
  const { user, loading: authLoading } = useAuth();
  const { isLoading: appDataLoading } = useAppInitialization();
  const [startTime] = useState(() => Date.now());
  const [showApp, setShowApp] = useState(false);

  useEffect(() => {
    void SplashScreen.preventAutoHideAsync();
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      // Wait for fonts, auth, and data to all be ready
      if (fontsLoaded && !authLoading && !appDataLoading) {
        // Ensure minimum delay from start (use the longer of the two delays)
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 2000 - elapsed);
        await new Promise(resolve => setTimeout(resolve, remaining));
        void SplashScreen.hideAsync();
        setShowApp(true);
      }
    };

    void initializeApp();
  }, [fontsLoaded, authLoading, appDataLoading, startTime]);

  // Show loading screen until everything is ready
  if (!fontsLoaded || authLoading || appDataLoading || !showApp) {
    return <AppLoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <NavigationContainer theme={navigationTheme}>
          <AuthNavigator />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <StoreProvider store={store}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </StoreProvider>
  );
}
