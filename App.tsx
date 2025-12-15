import React, { useEffect } from 'react';
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
import { store } from './src/store';
import { paperTheme, navigationTheme } from './src/styles';
import { AuthProvider, useAuth } from './src/contexts';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import FoodLogScreen from './src/screens/FoodLogScreen';
import SymptomsScreen from './src/screens/SymptomsScreen';
import BowelScreen from './src/screens/BowelScreen';
import DailyLogScreen from './src/screens/DailyLogScreen';
import AddScreen from './src/screens/AddScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import EmailConfirmationScreen from './src/screens/EmailConfirmationScreen';
import AuthLoadingScreen from './src/screens/AuthLoadingScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AddTabPlaceholder() {
  return null;
}

function TabNavigator() {
  const { signOut } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
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
          headerRight: () => (
            <IconButton
              icon="logout"
              iconColor={paperTheme.colors.onSurface}
              onPress={signOut}
            />
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
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }

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
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    NunitoRegular: Nunito_400Regular,
    NunitoSemiBold: Nunito_600SemiBold,
    NunitoBold: Nunito_700Bold,
    LeagueSpartanSemiBold: LeagueSpartan_600SemiBold,
    LeagueSpartanBold: LeagueSpartan_700Bold,
  });

  useEffect(() => {
    void SplashScreen.preventAutoHideAsync();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <StoreProvider store={store}>
      <AuthProvider>
        <SafeAreaProvider>
          <PaperProvider theme={paperTheme}>
            <NavigationContainer theme={navigationTheme}>
              <AuthNavigator />
            </NavigationContainer>
          </PaperProvider>
        </SafeAreaProvider>
      </AuthProvider>
    </StoreProvider>
  );
}
