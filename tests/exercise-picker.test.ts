import { describe, expect, it } from 'vitest';

import { addExercisesLabel, toggleSelection } from '../src/features/workouts/exercisePickerLogic';

describe('exercise picker selection', () => {
  it('keeps tap order when selecting and deselecting', () => {
    let selected: string[] = [];
    selected = toggleSelection(selected, 'a');
    selected = toggleSelection(selected, 'c');
    selected = toggleSelection(selected, 'b');
    expect(selected).toEqual(['a', 'c', 'b']);
    selected = toggleSelection(selected, 'c');
    expect(selected).toEqual(['a', 'b']);
  });

  it('labels the add action by count', () => {
    expect(addExercisesLabel(0)).toBe('Add exercises');
    expect(addExercisesLabel(1)).toBe('Add 1 exercise');
    expect(addExercisesLabel(4)).toBe('Add 4 exercises');
  });
});
