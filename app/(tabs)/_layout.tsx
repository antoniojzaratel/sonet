import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';

function TabIcon({ name, focused }: { name: any; focused: boolean }) {
  return (
    <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
      <Ionicons
        name={focused ? name : (`${name}-outline` as any)}
        size={22}
        color={focused ? Colors.primary : Colors.textMuted}
      />
    </View>
  );
}

function CenterIcon({ focused }: { focused: boolean }) {
  return (
    <LinearGradient
      colors={focused ? [Colors.accent, '#C026D3'] : [Colors.primary, Colors.primaryDark]}
      style={styles.centerButton}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Ionicons name="heart" size={26} color="#fff" />
    </LinearGradient>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }}
      />
      <Tabs.Screen
        name="discover"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="people" focused={focused} /> }}
      />
      <Tabs.Screen
        name="date"
        options={{
          tabBarIcon: ({ focused }) => <CenterIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="map" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} /> }}
      />
      {/* Hidden screens - accessible via navigation */}
      <Tabs.Screen name="games" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 82,
    paddingBottom: 22,
    paddingTop: 8,
  },
  iconWrapper: {
    width: 44,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  iconWrapperActive: { backgroundColor: `${Colors.primary}18` },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
});
