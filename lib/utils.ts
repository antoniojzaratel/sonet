import { Colors } from '@/constants/colors';

export function formatScore(score: number): string {
  return score.toFixed(1);
}

export function scoreToColor(score: number): string {
  if (score >= 9) return Colors.secondary;
  if (score >= 7) return Colors.primary;
  if (score >= 5) return Colors.warning;
  return Colors.error;
}

export function tasteMatchToLabel(score: number): string {
  if (score >= 90) return 'Soul Twin';
  if (score >= 75) return 'Vibes Match';
  if (score >= 60) return 'Music Buddy';
  if (score >= 45) return 'Similar Taste';
  return 'Different Vibes';
}

export function tasteMatchToColor(score: number): string {
  if (score >= 90) return Colors.secondary;
  if (score >= 75) return Colors.primaryLight;
  if (score >= 60) return Colors.primary;
  if (score >= 45) return Colors.warning;
  return Colors.textMuted;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function genreToColor(index: number): string {
  const palette = [
    Colors.primary,
    Colors.secondary,
    Colors.accent,
    Colors.primaryLight,
    Colors.warning,
    Colors.spotify,
    '#3B82F6',
    '#EC4899',
  ];
  return palette[index % palette.length];
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return 'justo ahora';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return formatDate(dateStr);
}
