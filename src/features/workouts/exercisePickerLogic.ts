export function toggleSelection<T>(selected: T[], id: T): T[] {
  const index = selected.indexOf(id);
  if (index >= 0) return selected.filter((item) => item !== id);
  return [...selected, id];
}

export function addExercisesLabel(count: number): string {
  if (count <= 0) return 'Add exercises';
  if (count === 1) return 'Add 1 exercise';
  return `Add ${count} exercises`;
}
