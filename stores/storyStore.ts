import { create } from 'zustand';
import {
  fetchActiveStoryGroups,
  uploadStoryImage,
  createStory,
  markStoryViewed,
  type UserStories,
  type CreateStoryParams,
} from '@/lib/stories';
import { track } from '@/lib/analytics';

interface StoryState {
  groups: UserStories[];
  loading: boolean;

  loadStories: (viewerId?: string) => Promise<void>;
  publishStory: (localImageUri: string, params: Omit<CreateStoryParams, 'imageUrl'>) => Promise<boolean>;
  viewStory: (storyId: string, viewerId: string) => void;
  /** Dims the ring immediately once the viewer opens a user's stories, rather than waiting on each story's round trip. */
  markGroupSeen: (userId: string) => void;
}

export const useStoryStore = create<StoryState>((set, get) => ({
  groups: [],
  loading: false,

  loadStories: async (viewerId) => {
    set({ loading: true });
    const groups = await fetchActiveStoryGroups(viewerId);
    set({ groups, loading: false });
  },

  publishStory: async (localImageUri, params) => {
    try {
      const imageUrl = await uploadStoryImage(localImageUri, params.userId);
      await createStory({ ...params, imageUrl });
      await get().loadStories(params.userId);
      track('story_published');
      return true;
    } catch {
      return false;
    }
  },

  // Fire-and-forget — the ring's seen/unseen state is handled optimistically
  // by markGroupSeen below rather than waiting on this round trip.
  viewStory: (storyId, viewerId) => {
    markStoryViewed(storyId, viewerId).catch(() => {});
  },

  markGroupSeen: (userId) => {
    set((state) => ({
      groups: state.groups.map((g) => (g.user_id === userId ? { ...g, hasUnseen: false } : g)),
    }));
  },
}));
