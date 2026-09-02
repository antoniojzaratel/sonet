import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Colors, Spacing, Radius } from '@/constants/colors';

export interface DuelItem {
  contentId: string;
  contentName: string;
  artistName: string;
  imageUrl?: string;
}

interface Props {
  itemA: DuelItem;
  itemB: DuelItem;
  onPick: (winner: 'a' | 'b') => void;
}

function DuelCard({ item, onPress }: { item: DuelItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverFallback]}>
          <Text style={styles.coverFallbackText}>{item.contentName.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.name} numberOfLines={2}>{item.contentName}</Text>
      <Text style={styles.artist} numberOfLines={1}>{item.artistName}</Text>
    </TouchableOpacity>
  );
}

export function CompareDuel({ itemA, itemB, onPick }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>¿Cuál prefieres?</Text>
      <View style={styles.row}>
        <DuelCard item={itemA} onPress={() => onPick('a')} />
        <DuelCard item={itemB} onPress={() => onPick('b')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: Spacing.lg },
  title: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: Spacing.lg },
  row: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  cover: { width: 96, height: 96, borderRadius: Radius.md, marginBottom: 4 },
  coverFallback: { backgroundColor: Colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  coverFallbackText: { color: Colors.text, fontSize: 32, fontWeight: '800' },
  name: { color: Colors.text, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  artist: { color: Colors.textSecondary, fontSize: 12, textAlign: 'center' },
});
