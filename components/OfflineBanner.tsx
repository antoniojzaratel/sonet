import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '@/constants/colors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

/** App-shell-level connectivity banner — cheaper and more reliable than retrofitting every screen's error handling. */
export function OfflineBanner() {
  const isOnline = useNetworkStatus();
  if (isOnline) return null;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.banner} accessibilityRole="alert" accessibilityLabel="Sin conexión a internet">
        <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
        <Text style={styles.text}>Sin conexión</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.error,
    paddingVertical: 6,
  },
  text: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
