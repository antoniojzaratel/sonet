import { scoreLineup, type LineupChoice } from '../lineupScore';
import type { LineupArtist } from '../lineupPool';

function artist(name: string, genre: string, popularity: number): LineupArtist {
  return { name, genre, popularity };
}

describe('scoreLineup', () => {
  it('scores a well-formed lineup (strong headliner, matching genre, believable gradient) highly', () => {
    const choice: LineupChoice = {
      headliner: artist('Headliner', 'Corridos', 95),
      support: [artist('Support A', 'Corridos', 70), artist('Support B', 'Corridos', 55), artist('Support C', 'Urbano', 60)],
    };
    const result = scoreLineup(choice);
    expect(result.total).toBeGreaterThan(70);
  });

  it('penalizes a support act upstaging the headliner in popularity', () => {
    const upstaged: LineupChoice = {
      headliner: artist('Headliner', 'Rock', 60),
      support: [artist('Bigger Than Headliner', 'Rock', 95)],
    };
    const balanced: LineupChoice = {
      headliner: artist('Headliner', 'Rock', 60),
      support: [artist('Believable Support', 'Rock', 35)],
    };
    expect(scoreLineup(upstaged).popularityBalance).toBeLessThan(scoreLineup(balanced).popularityBalance);
  });

  it('penalizes mismatched genres versus matching ones', () => {
    const mismatched: LineupChoice = {
      headliner: artist('Headliner', 'Rock', 80),
      support: [artist('Support', 'Corridos', 50)],
    };
    const matched: LineupChoice = {
      headliner: artist('Headliner', 'Rock', 80),
      support: [artist('Support', 'Rock', 50)],
    };
    expect(scoreLineup(mismatched).genreCohesion).toBeLessThan(scoreLineup(matched).genreCohesion);
  });

  it('gives partial credit to genres in the same family, not full and not zero', () => {
    const sameFamily: LineupChoice = {
      headliner: artist('Headliner', 'Corridos', 80),
      support: [artist('Support', 'Urbano', 50)],
    };
    const result = scoreLineup(sameFamily);
    expect(result.genreCohesion).toBeGreaterThan(15); // better than an unrelated genre
    expect(result.genreCohesion).toBeLessThan(100); // but not as good as an exact match
  });

  it('never produces a total outside 0-100 even for a hostile input', () => {
    const choice: LineupChoice = {
      headliner: artist('Weak Headliner', 'Rock', 5),
      support: [artist('Way Bigger', 'Corridos', 100), artist('Also Bigger', 'Pop', 90)],
    };
    const result = scoreLineup(choice);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it('scores zero cohesion/balance for a lineup with no support acts, not a crash', () => {
    const result = scoreLineup({ headliner: artist('Solo Headliner', 'Pop', 80), support: [] });
    expect(result.genreCohesion).toBe(0);
    expect(result.popularityBalance).toBe(0);
    expect(Number.isFinite(result.total)).toBe(true);
  });
});
