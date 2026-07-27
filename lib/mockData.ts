// Mock community data — realistic demo content

export interface MockUser {
  id: string;
  username: string;
  displayName: string;
  initials: string;
  avatarColor: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  ratingsCount: number;
  isFollowing: boolean;
}

export interface MockRating {
  id: string;
  userId: string;
  contentId: string;
  contentType: 'track' | 'album' | 'artist';
  contentName: string;
  artistName: string;
  coverColor: string;
  coverInitial: string;
  score: number;
  review?: string;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
}

export const MOCK_USERS: MockUser[] = [
  { id: 'u1', username: 'rodrigo_mty', displayName: 'Rodrigo Garza', initials: 'RG', avatarColor: '#A855F7', bio: 'Rock, indie y lo que suene bien.', followersCount: 312, followingCount: 145, ratingsCount: 89, isFollowing: true },
  { id: 'u2', username: 'ana_flores', displayName: 'Ana Flores', initials: 'AF', avatarColor: '#F43F5E', bio: 'Corridos, reggaeton y pop. Monterrey.', followersCount: 540, followingCount: 220, ratingsCount: 134, isFollowing: false },
  { id: 'u3', username: 'diego_rmz', displayName: 'Diego Ramirez', initials: 'DR', avatarColor: '#84CC16', bio: 'Si no es en vivo no cuenta.', followersCount: 198, followingCount: 310, ratingsCount: 56, isFollowing: true },
  { id: 'u4', username: 'sofia_trev', displayName: 'Sofia Treviño', initials: 'ST', avatarColor: '#F59E0B', bio: 'Indie, jazz y café.', followersCount: 421, followingCount: 180, ratingsCount: 203, isFollowing: false },
  { id: 'u5', username: 'carlos_vz', displayName: 'Carlos Vázquez', initials: 'CV', avatarColor: '#06B6D4', bio: 'Todo lo que tenga guitarra.', followersCount: 87, followingCount: 95, ratingsCount: 41, isFollowing: false },
  { id: 'u6', username: 'mariana_g', displayName: 'Mariana García', initials: 'MG', avatarColor: '#8B5CF6', bio: 'Escucho todo menos reguetón viejo.', followersCount: 263, followingCount: 140, ratingsCount: 77, isFollowing: true },
  { id: 'u7', username: 'luis_sn', displayName: 'Luis Serna', initials: 'LS', avatarColor: '#EC4899', bio: 'Metal, punk y un poco de cumbia.', followersCount: 155, followingCount: 210, ratingsCount: 98, isFollowing: false },
  { id: 'u8', username: 'valeria_h', displayName: 'Valeria Hernández', initials: 'VH', avatarColor: '#10B981', bio: 'K-pop y rock en español. No hay contradicción.', followersCount: 891, followingCount: 430, ratingsCount: 312, isFollowing: false },
];

export const MOCK_RATINGS: MockRating[] = [
  { id: 'r1', userId: 'u1', contentId: 's1', contentType: 'album', contentName: 'Génesis', artistName: 'Peso Pluma', coverColor: '#A855F7', coverInitial: 'G', score: 8.5, review: 'Cambió el juego del regional mexicano. Producción impecable.', likeCount: 34, likedByMe: true, createdAt: '2026-07-16T10:30:00Z' },
  { id: 'r2', userId: 'u2', contentId: 's2', contentType: 'track', contentName: 'La Forma en que Me Quieres', artistName: 'Carin León', coverColor: '#F43F5E', coverInitial: 'L', score: 9.0, review: 'La voz de Carin no tiene comparación.', likeCount: 67, likedByMe: false, createdAt: '2026-07-16T09:15:00Z' },
  { id: 'r3', userId: 'u3', contentId: 's3', contentType: 'album', contentName: 'Dreamers', artistName: 'Zoé', coverColor: '#84CC16', coverInitial: 'D', score: 9.5, review: 'Obra maestra. Cada canción es un universo.', likeCount: 89, likedByMe: true, createdAt: '2026-07-15T22:00:00Z' },
  { id: 'r4', userId: 'u4', contentId: 's4', contentType: 'track', contentName: 'Sublime Gracia', artistName: 'Zoé', coverColor: '#F59E0B', coverInitial: 'S', score: 8.0, review: 'De sus mejores canciones en vivo.', likeCount: 12, likedByMe: false, createdAt: '2026-07-15T20:45:00Z' },
  { id: 'r5', userId: 'u6', contentId: 's5', contentType: 'album', contentName: 'Un Verano Sin Ti', artistName: 'Bad Bunny', coverColor: '#EC4899', coverInitial: 'U', score: 7.5, review: 'Bueno pero esperaba más experimentación.', likeCount: 45, likedByMe: false, createdAt: '2026-07-15T18:30:00Z' },
  { id: 'r6', userId: 'u5', contentId: 's6', contentType: 'track', contentName: 'R U Mine?', artistName: 'Arctic Monkeys', coverColor: '#06B6D4', coverInitial: 'R', score: 9.5, review: 'El mejor riff de la última década. Sin discusión.', likeCount: 78, likedByMe: true, createdAt: '2026-07-15T16:00:00Z' },
  { id: 'r7', userId: 'u7', contentId: 's7', contentType: 'album', contentName: 'AM', artistName: 'Arctic Monkeys', coverColor: '#F97316', coverInitial: 'A', score: 10.0, review: 'Perfecto. No hay otro calificativo.', likeCount: 156, likedByMe: false, createdAt: '2026-07-15T14:20:00Z' },
  { id: 'r8', userId: 'u8', contentId: 's8', contentType: 'track', contentName: 'Quevedo: Bzrp Session 52', artistName: 'Bizarrap', coverColor: '#8B5CF6', coverInitial: 'Q', score: 7.0, likeCount: 23, likedByMe: false, createdAt: '2026-07-15T12:00:00Z' },
  { id: 'r9', userId: 'u1', contentId: 's9', contentType: 'album', contentName: 'Caras Vemos', artistName: 'Caifanes', coverColor: '#64748B', coverInitial: 'C', score: 9.5, review: 'La cumbre del rock mexicano de los 90.', likeCount: 44, likedByMe: false, createdAt: '2026-07-14T21:00:00Z' },
  { id: 'r10', userId: 'u2', contentId: 's10', contentType: 'track', contentName: 'Natalie', artistName: 'Bruno Mars', coverColor: '#EAB308', coverInitial: 'N', score: 8.5, likeCount: 31, likedByMe: true, createdAt: '2026-07-14T19:30:00Z' },
  { id: 'r11', userId: 'u4', contentId: 's11', contentType: 'album', contentName: 'The Colour and The Shape', artistName: 'Foo Fighters', coverColor: '#3B82F6', coverInitial: 'T', score: 8.0, review: 'Everlong sola vale el disco entero.', likeCount: 19, likedByMe: false, createdAt: '2026-07-14T17:00:00Z' },
  { id: 'r12', userId: 'u3', contentId: 's12', contentType: 'track', contentName: 'Eres', artistName: 'Café Tacvba', coverColor: '#22C55E', coverInitial: 'E', score: 9.0, review: 'Canción que no envejece.', likeCount: 62, likedByMe: true, createdAt: '2026-07-14T14:00:00Z' },
  { id: 'r13', userId: 'u6', contentId: 's13', contentType: 'album', contentName: 'OK Computer', artistName: 'Radiohead', coverColor: '#6366F1', coverInitial: 'O', score: 10.0, review: 'No es música, es experiencia.', likeCount: 201, likedByMe: false, createdAt: '2026-07-13T22:00:00Z' },
  { id: 'r14', userId: 'u5', contentId: 's14', contentType: 'track', contentName: 'Ojitos Lindos', artistName: 'Bad Bunny ft. Bomba Estéreo', coverColor: '#FB923C', coverInitial: 'O', score: 8.0, likeCount: 38, likedByMe: false, createdAt: '2026-07-13T20:00:00Z' },
  { id: 'r15', userId: 'u8', contentId: 's15', contentType: 'album', contentName: 'El Último Tour Del Mundo', artistName: 'Bad Bunny', coverColor: '#DC2626', coverInitial: 'E', score: 6.5, review: 'Buenas ideas pero no llegó a su potencial.', likeCount: 14, likedByMe: false, createdAt: '2026-07-13T18:00:00Z' },
];

export function getUserById(id: string): MockUser | undefined {
  return MOCK_USERS.find(u => u.id === id);
}

export function getRatingsForUser(userId: string): MockRating[] {
  return MOCK_RATINGS.filter(r => r.userId === userId);
}

export function scoreColor(score: number): string {
  if (score >= 8) return '#22C55E';
  if (score >= 6) return '#F59E0B';
  return '#EF4444';
}

export function formatScore(score: number): string {
  return score % 1 === 0 ? `${score}.0` : `${score}`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Ahora';
  if (h < 24) return `Hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Hace ${d}d`;
  return `Hace ${Math.floor(d / 7)}sem`;
}

export interface CatalogItem {
  id: string;
  type: 'track' | 'album';
  name: string;
  artist: string;
  coverColor: string;
  coverInitial: string;
}

export const POPULAR_CATALOG: CatalogItem[] = [
  { id: 'c1', type: 'album', name: 'Génesis', artist: 'Peso Pluma', coverColor: '#A855F7', coverInitial: 'G' },
  { id: 'c2', type: 'track', name: 'La Bebé', artist: 'Yng Lvcas & Peso Pluma', coverColor: '#F43F5E', coverInitial: 'L' },
  { id: 'c3', type: 'album', name: 'Un Verano Sin Ti', artist: 'Bad Bunny', coverColor: '#06B6D4', coverInitial: 'U' },
  { id: 'c4', type: 'track', name: 'Tití Me Preguntó', artist: 'Bad Bunny', coverColor: '#EC4899', coverInitial: 'T' },
  { id: 'c5', type: 'album', name: 'AM', artist: 'Arctic Monkeys', coverColor: '#1C1C1C', coverInitial: 'A' },
  { id: 'c6', type: 'track', name: 'R U Mine?', artist: 'Arctic Monkeys', coverColor: '#F97316', coverInitial: 'R' },
  { id: 'c7', type: 'album', name: 'Dreamers', artist: 'Zoé', coverColor: '#84CC16', coverInitial: 'D' },
  { id: 'c8', type: 'track', name: 'Eres', artist: 'Café Tacvba', coverColor: '#22C55E', coverInitial: 'E' },
  { id: 'c9', type: 'album', name: 'OK Computer', artist: 'Radiohead', coverColor: '#6366F1', coverInitial: 'O' },
  { id: 'c10', type: 'track', name: 'Creep', artist: 'Radiohead', coverColor: '#8B5CF6', coverInitial: 'C' },
  { id: 'c11', type: 'album', name: 'Caras Vemos', artist: 'Caifanes', coverColor: '#64748B', coverInitial: 'C' },
  { id: 'c12', type: 'track', name: 'La Negra Tomasa', artist: 'Caifanes', coverColor: '#475569', coverInitial: 'N' },
  { id: 'c13', type: 'album', name: 'The Colour and The Shape', artist: 'Foo Fighters', coverColor: '#3B82F6', coverInitial: 'T' },
  { id: 'c14', type: 'track', name: 'Everlong', artist: 'Foo Fighters', coverColor: '#2563EB', coverInitial: 'E' },
  { id: 'c15', type: 'track', name: 'La Forma en que Me Quieres', artist: 'Carin León', coverColor: '#F59E0B', coverInitial: 'F' },
  { id: 'c16', type: 'album', name: 'Colmillo de Leche', artist: 'Carin León', coverColor: '#D97706', coverInitial: 'C' },
  { id: 'c17', type: 'track', name: 'Quevedo: Bzrp Session 52', artist: 'Bizarrap', coverColor: '#10B981', coverInitial: 'Q' },
  { id: 'c18', type: 'album', name: 'El Último Tour Del Mundo', artist: 'Bad Bunny', coverColor: '#DC2626', coverInitial: 'E' },
  { id: 'c19', type: 'track', name: 'Natalie', artist: 'Bruno Mars', coverColor: '#EAB308', coverInitial: 'N' },
  { id: 'c20', type: 'album', name: '24K Magic', artist: 'Bruno Mars', coverColor: '#D4AF37', coverInitial: '2' },
  { id: 'c21', type: 'track', name: 'Blinding Lights', artist: 'The Weeknd', coverColor: '#EF4444', coverInitial: 'B' },
  { id: 'c22', type: 'album', name: 'After Hours', artist: 'The Weeknd', coverColor: '#B91C1C', coverInitial: 'A' },
  { id: 'c23', type: 'track', name: 'Ojitos Lindos', artist: 'Bad Bunny ft. Bomba Estéreo', coverColor: '#FB923C', coverInitial: 'O' },
  { id: 'c24', type: 'album', name: 'Sublime', artist: 'Natalia Lafourcade', coverColor: '#A3E635', coverInitial: 'S' },
  { id: 'c25', type: 'track', name: 'En El 2000', artist: 'Natalia Lafourcade', coverColor: '#86EFAC', coverInitial: 'E' },
];

export function searchCatalog(query: string): CatalogItem[] {
  if (!query.trim()) return POPULAR_CATALOG;
  const q = query.toLowerCase();
  return POPULAR_CATALOG.filter(
    (item) =>
      item.name.toLowerCase().includes(q) || item.artist.toLowerCase().includes(q),
  );
}
