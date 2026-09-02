import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TabIconProps {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
}

function TabIcon({ iconName, label, focused }: TabIconProps) {
  const color = focused ? '#A855F7' : '#555555';
  return (
    <View style={styles.tabItem}>
      <Ionicons name={iconName} size={22} color={color} />
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#A855F7',
        tabBarInactiveTintColor: '#555555',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName={focused ? 'home' : 'home-outline'}
              label="Feed"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName={focused ? 'search' : 'search-outline'}
              label="Buscar"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="date"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName={focused ? 'heart' : 'heart-outline'}
              label="Matches"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName={focused ? 'calendar' : 'calendar-outline'}
              label="Eventos"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName={focused ? 'game-controller' : 'game-controller-outline'}
              label="Juegos"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName={focused ? 'person' : 'person-outline'}
              label="Perfil"
              focused={focused}
            />
          ),
        }}
      />
      {/* Not a tab — /soundmatch/settings is pushed from the Matches (date.tsx) screen. */}
      <Tabs.Screen name="soundmatch" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0D0D0D',
    borderTopColor: '#2A2A2A',
    borderTopWidth: 1,
    height: 86,
    paddingBottom: 0,
    paddingTop: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 10,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
