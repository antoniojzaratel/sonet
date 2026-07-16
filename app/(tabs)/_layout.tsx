import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';

interface TabIconProps {
  iconName: any;
  label: string;
  focused: boolean;
}

function TabIcon({ iconName, label, focused }: TabIconProps) {
  const color = focused ? Colors.primary : '#555';
  return (
    <View style={styles.tabItem}>
      <Ionicons
        name={focused ? iconName : (`${iconName}-outline` as any)}
        size={22}
        color={color}
      />
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </View>
  );
}

function CenterIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.centerWrapper}>
      <LinearGradient
        colors={['#A855F7', '#7C3AED']}
        style={styles.centerButton}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </LinearGradient>
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
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#555',
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="person" label="Perfil" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="ticket" label="Eventos" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          tabBarIcon: ({ focused }) => <CenterIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="list" label="Feed" focused={focused} />
          ),
        }}
      />
      {/* Hidden screens */}
      <Tabs.Screen name="date" options={{ href: null }} />
      <Tabs.Screen name="games" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: '#1F1F1F',
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
  centerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  centerButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
});
