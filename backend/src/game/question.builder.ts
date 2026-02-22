import { PrismaClient } from '@prisma/client';

export type Question = {
  dtmf: number;
  attrKey: string;
  text: string;
  answerType: 'YESNO' | 'VALUE';
};

function defaultTemplate(key: string, type: 'YESNO' | 'VALUE'): string {
  // v1: simple mapping. Later: template library + AI paraphrase.
  if (type === 'VALUE') {
    if (key === 'sport') return 'Which sport are they associated with?';
    return `What is the value of ${key}?`;
  }

  // YESNO
  if (key === 'gender') return 'Is the personality male?';
  if (key === 'region') return 'Is the personality from Asia?';
  if (key === 'active_status') return 'Are they currently active?';
  if (key === 'award_level') return 'Have they won international-level awards?';
  if (key === 'bollywood')
    return 'Is this personality associated with Bollywood?';
  if (key === 'hollywood')
    return 'Is this personality associated with Hollywood?';
  if (key === 'oscar_winner') return 'Have they won an Oscar?';
  if (key === 'scientist') return 'Is this person a scientist?';
  if (key === 'royalty') return 'Is this person from a royal family?';
  if (key === 'political_leader') return 'Are they a political leader?';

  return `Is the ${key} attribute true?`;
}

export async function generateQuestionSetFromDb(
  prisma: PrismaClient,
  themeId: string,
  usedAttrKeys: string[],
): Promise<Question[]> {
  const configs = await prisma.themeAttributeConfig.findMany({
    where: { themeId, enabled: true, key: { notIn: usedAttrKeys } },
    orderBy: { strength: 'asc' },
  });

  // Random pick 4 from available configs (fixed randomness)
  const available = configs.map((c) => ({
    attrKey: c.key,
    answerType: c.type === 'VALUE' ? ('VALUE' as const) : ('YESNO' as const),
    text: defaultTemplate(c.key, c.type === 'VALUE' ? 'VALUE' : 'YESNO'),
  }));

  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  const picked = available.slice(0, 4);
  return picked.map((q, idx) => ({ dtmf: idx + 1, ...q }));
}
