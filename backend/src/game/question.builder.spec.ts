import { generateQuestionSetFromDb } from './question.builder';

describe('question.builder', () => {
  let prisma: any;

  beforeEach(() => {
    prisma = {
      themeAttributeConfig: {
        findMany: jest.fn(),
      },
    };
  });

  // Test Case: Should query only enabled and unused theme attribute configs.
  it('requests configs with notIn filter using usedAttrKeys', async () => {
    prisma.themeAttributeConfig.findMany.mockResolvedValue([]);

    await generateQuestionSetFromDb(prisma, 'sports', ['gender', 'region']);

    expect(prisma.themeAttributeConfig.findMany).toHaveBeenCalledWith({
      where: {
        themeId: 'sports',
        enabled: true,
        key: { notIn: ['gender', 'region'] },
      },
      orderBy: { strength: 'asc' },
    });
  });

  // Test Case: Should generate at most four DTMF options with sequential digits.
  it('returns a max of 4 questions with dtmf values 1..n', async () => {
    prisma.themeAttributeConfig.findMany.mockResolvedValue([
      { key: 'gender', type: 'YESNO', strength: 1 },
      { key: 'region', type: 'YESNO', strength: 2 },
      { key: 'sport', type: 'VALUE', strength: 3 },
      { key: 'active_status', type: 'YESNO', strength: 4 },
      { key: 'award_level', type: 'YESNO', strength: 5 },
    ]);

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.25);
    const result = await generateQuestionSetFromDb(prisma, 'sports', []);
    randomSpy.mockRestore();

    expect(result).toHaveLength(4);
    expect(result.map((r: any) => r.dtmf)).toEqual([1, 2, 3, 4]);
    result.forEach((q: any) => {
      expect(q).toEqual(
        expect.objectContaining({
          attrKey: expect.any(String),
          text: expect.any(String),
          answerType: expect.stringMatching(/YESNO|VALUE/),
        }),
      );
    });
  });
});
