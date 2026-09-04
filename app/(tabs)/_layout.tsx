import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius } from '@/constants/colors';

interface TabIconProps {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
}

// Active tab gets a filled pill behind the icon (Instagram/Airbnb-style) —
// reads clearly at a glance even for someone who's never seen the app,
// which matters more for a demo audience than for a returning user.
function TabIcon({ iconName, label, focused }: TabIconProps) {
  return (
    <View style={styles.tabItem}>
      <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
        <Ionicons name={iconName} size={20} color={focused ? '#FFFFFF' : Colors.textSecondary} />
      </View>
      <Text
        style={[styles.tabLabel, focused && styles.tabLabelActive]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const barHeight = 58 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { height: barHeight, paddingBottom: insets.bottom }],
        tabBarShowLabel: false,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon iconName={focused ? 'home' : 'home-outline'} label="Feed" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon iconName={focused ? 'search' : 'search-outline'} label="Buscar" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="date"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon iconName={focused ? 'heart' : 'heart-outline'} label="Matches" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon iconName={focused ? 'calendar' : 'calendar-outline'} label="Eventos" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName={focused ? 'game-controller' : 'game-controller-outline'} label="Juegos" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon iconName={focused ? 'person' : 'person-outline'} label="Perfil" focused={focused} />,
        }}
      />
      {/* Not a tab — /soundmatch/settings is pushed from the Matches (date.tsx) screen.
          soundmatch/ has only settings.tsx, no index.tsx, so it doesn't collapse to a
          bare "soundmatch" route (same fix as the three routes in app/_layout.tsx). */}
      <Tabs.Screen name="soundmatch/settings" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.background,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingTop: 6,
    elevation: 0,
  },
  tabBarItem: {
    paddingTop: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 52,
  },
  iconWrap: {
    width: 44,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: Colors.primary,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: Colors.text,
    fontWeight: '700',
  },
});
