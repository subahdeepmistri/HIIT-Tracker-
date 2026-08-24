import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Body, Label, Strong } from './primitives';
import { ProgressBar } from './ProgressBar';

export function ProgressTrack({
  label,
  detail,
  caption,
  value,
  color,
  accessibilityLabel,
  showAsRecordedOnly,
}: {
  label: string;
  detail: string;
  caption?: string;
  value: number | null;
  color?: string;
  accessibilityLabel?: string;
  showAsRecordedOnly?: boolean;
}) {
  return (
    <ProgressBar
      label={label}
      detail={detail}
      caption={caption}
      value={value}
      color={color}
      accessibilityLabel={accessibilityLabel}
      showAsRecordedOnly={showAsRecordedOnly}
      size="md"
    />
  );
}
