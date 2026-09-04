import { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { useAuthStore } from '@/stores/authStore';
import { useStoryStore } from '@/stores/storyStore';
import { Colors } from '@/constants/colors';

const STORY_DURATION_MS = 5000;

export default function StoryViewerScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { groups, loading, loadStories, viewStory, markGroupSeen } = useStoryStore();

  const [groupIndex, setGroupIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const startRef = useRef(Date.now());
  const seededForUserId = useRef<string | null>(null);

  useEffect(() => {
    if (groups.length === 0) loadStories(user?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Seed the starting position exactly once per distinct `userId` route
  // param — deliberately NOT re-running on every `groups` update (e.g. a
  // realtime insert or markGroupSeen's own state change), which would
  // otherwise reset the viewer's progress mid-story.
  useEffect(() => {
    if (!userId || groups.length === 0 || seededForUserId.current === userId) return;
    const idx = groups.findIndex((g) => g.user_id === userId);
    if (idx < 0) return;
    seededForUserId.current = userId;
    setGroupIndex(idx);
    setStoryIndex(0);
    if (groups[idx].hasUnseen) markGroupSeen(groups[idx].user_id);
  }, [groups, userId, markGroupSeen]);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];
  const player = useAudioPlayer(story?.audio_url ?? null);

  const goNextStory = useCallback(() => {
    const g = groups[groupIndex];
    if (!g) return;
    if (storyIndex < g.stories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((i) => i + 1);
      setStoryIndex(0);
    } else {
      router.back();
    }
  }, [groups, groupIndex, storyIndex, router]);

  const goPrevStory = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
      return;
    }
    if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setStoryIndex(prevGroup.stories.length - 1);
      setGroupIndex((i) => i - 1);
    }
  }, [storyIndex, groupIndex, groups]);

  // Mark viewed + restart the progress timer whenever the visible story changes.
  useEffect(() => {
    if (!story || !user?.id) return;
    viewStory(story.id, user.id);
    setProgress(0);
    startRef.current = Date.now();
    if (story.audio_url) player.play();
    return () => {
      if (story.audio_url) player.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  useEffect(() => {
    if (paused || !story) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(1, elapsed / STORY_DURATION_MS);
      setProgress(pct);
      if (pct >= 1) goNextStory();
    }, 50);
    return () => clearInterval(interval);
  }, [paused, story?.id, goNextStory]);

  // If loading finished and this user simply has no active story group
  // (expired, or a stale link), bail back out — done as an effect, not
  // during render, since navigating is a side effect.
  const notFound = !loading && groups.length > 0 && !story;
  useEffect(() => {
    if (notFound) router.back();
  }, [notFound, router]);

  if (!story) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={{ uri: story.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={styles.scrim} />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.progressRow}>
          {group.stories.map((s, i) => (
            <View key={s.id} style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${i < storyIndex ? 100 : i === storyIndex ? progress * 100 : 0}%` },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={styles.headerRow}>
          <Text style={styles.headerName}>{group.display_name}</Text>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {!!story.track_name && (
          <View style={styles.trackBadge}>
            <Ionicons name="musical-notes" size={14} color="#fff" />
            <Text style={styles.trackBadgeText} numberOfLines={1}>
              {story.track_name} · {story.artist_name}
            </Text>
          </View>
        )}

        {!!story.caption && <Text style={styles.caption}>{story.caption}</Text>}
      </SafeAreaView>

      <View style={styles.tapZones} pointerEvents="box-none">
        <Pressable
          style={styles.tapLeft}
          onPress={goPrevStory}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
        />
        <Pressable
          style={styles.tapRight}
          onPress={goNextStory}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.25)' },
  overlay: { flex: 1, padding: 12 },
  progressRow: { flexDirection: 'row', gap: 4 },
  progressTrack: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  headerName: { color: '#fff', fontWeight: '700', fontSize: 15 },
  trackBadge: {
    position: 'absolute',
    bottom: 60,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  trackBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600', flex: 1 },
  caption: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  tapZones: { ...StyleSheet.absoluteFill, flexDirection: 'row' },
  tapLeft: { flex: 1 },
  tapRight: { flex: 2 },
});
