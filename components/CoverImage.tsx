import { View, Text, StyleSheet, type StyleProp, type ViewStyle, type ImageStyle } from 'react-native';
import { Image } from 'expo-image';

interface Props {
  uri?: string | null;
  /** Used for both the deterministic fallback color and the fallback letter. */
  seed: string;
  size: number;
  radius?: number;
  /** Caller styles (margins, etc.) — applied to whichever element actually renders. */
  style?: StyleProp<ViewStyle & ImageStyle>;
}

const PALETTE = ['#A855F7', '#F43F5E', '#84CC16', '#F59E0B', '#06B6D4', '#8B5CF6', '#EC4899', '#10B981'];

function fallbackColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

/**
 * Real cover art when a URL is available (cached + blurhash-style fade-in via
 * expo-image), falling back to a deterministic colored initial tile when it
 * isn't — every screen in this app used to skip straight to the fallback
 * even when a real Spotify/story image URL existed.
 */
export function CoverImage({ uri, seed, size, radius = 8, style }: Props) {
  const dimStyle = { width: size, height: size, borderRadius: radius };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, dimStyle, style]}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
      />
    );
  }

  return (
    <View style={[styles.fallback, dimStyle, { backgroundColor: fallbackColor(seed) }, style]}>
      <Text style={[styles.fallbackText, { fontSize: Math.max(12, size * 0.4) }]}>
        {seed.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: '#2A2A2A' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  fallbackText: { color: '#FFFFFF', fontWeight: '700' },
});
