import { bestMatch, normalize, scoreGuess } from './guess.matcher';

describe('guess.matcher', () => {
  // Test Case: Should lowercase, strip punctuation, and collapse spaces.
  it('normalizes input text', () => {
    expect(normalize('  MS.  Dhoni!!  ')).toBe('ms dhoni');
  });

  // Test Case: Should return 100 for exact normalized match.
  it('returns exact match score as 100', () => {
    expect(scoreGuess('Virat Kohli', 'virat kohli')).toBe(100);
  });

  // Test Case: Should return high score when candidate contains input.
  it('returns containment score when candidate includes input', () => {
    expect(scoreGuess('kohli', 'virat kohli')).toBe(85);
  });

  // Test Case: Should return token-overlap based score for partial matches.
  it('returns overlap score for partial token match', () => {
    expect(scoreGuess('lionel', 'lionel messi')).toBe(85);
    expect(scoreGuess('messi lionel', 'lionel messi')).toBe(70);
    expect(scoreGuess('roger nadal', 'roger federer')).toBe(35);
  });

  // Test Case: Should pick highest-scoring candidate from candidate list.
  it('returns bestMatch with top scoring candidate', () => {
    const result = bestMatch('ronaldo', [
      { personalityId: 'p1', name: 'Lionel Messi' },
      { personalityId: 'p2', name: 'Cristiano Ronaldo' },
      { personalityId: 'p3', name: 'Neymar' },
    ]);

    expect(result).toEqual({
      personalityId: 'p2',
      name: 'Cristiano Ronaldo',
      score: expect.any(Number),
    });
  });

  // Test Case: Should return null when candidates are empty.
  it('returns null when there are no candidates', () => {
    expect(bestMatch('anything', [])).toBeNull();
  });
});
