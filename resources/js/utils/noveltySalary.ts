export const NOVELTY_SALARY_LABEL = 'Булочка з сосискою';

export const NOVELTY_SALARY_POSITIONS = [
  'Майстер на всі руки',
  'Майстер на всю голову',
] as const;

export function hasNoveltySalary(position?: string): boolean {
  const normalized = (position ?? '').trim().toLocaleLowerCase('uk-UA');
  return NOVELTY_SALARY_POSITIONS.some(
    (item) => item.toLocaleLowerCase('uk-UA') === normalized,
  );
}
