import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import NearbyIncidentsScreen from '../screens/NearbyIncidentsScreen';
import AlertsScreen from '../screens/AlertsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();
const HomeStackNav = createNativeStackNavigator();
const ProfileStackNav = createNativeStackNavigator();

const stackHeaderOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontWeight: '700', fontSize: 16 },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
};

function HomeStack() {
  return (
    <HomeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <HomeStackNav.Screen name="HomeMain" component={HomeScreen} />
      <HomeStackNav.Screen
        name="NearbyIncidents"
        component={NearbyIncidentsScreen}
        options={{ ...stackHeaderOptions, title: 'Nearby Incidents' }}
      />
    </HomeStackNav.Navigator>
  );
}

function ProfileStack() {
  return (
    <ProfileStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStackNav.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStackNav.Screen name="Settings" component={SettingsScreen} options={{ ...stackHeaderOptions, title: 'Settings' }} />
    </ProfileStackNav.Navigator>
  );
}

const ICONS = {
  Home: 'home',
  Alerts: 'notifications',
  History: 'time',
  Profile: 'person',
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingTop: 7,
          paddingBottom: 9,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 1 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={focused ? ICONS[route.name] : `${ICONS[route.name]}-outline`} size={size - 2} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}
