import React from 'react';
import { View } from 'react-native';

import type { IntervalProgressModel, ProgressTrackModel, WorkRestModel } from '../../engine/analytics/sessionProgress';
import { useTheme } from '../theme/ThemeProvider';
import { Body, Card, Label, Strong } from './primitives';
import { ProgressTrack } from './ProgressTrack';
import { WorkRestSplit } from './WorkRestSplit';

export function RecordedCompletionCard({
  title = 'Recorded completion',
  footnote = 'Every bar is recorded session math. Missing inputs stay empty.',
  tracks,
  scoreParts,
  workRest,
  intervals,
  compact,
  hideEmpty,
}: {
  title?: string;
  footnote?: string;
  tracks: ProgressTrackModel[];
  scoreParts?: ProgressTrackModel[];
  workRest?: WorkRestModel;
  intervals?: IntervalProgressModel[];
  compact?: boolean;
  hideEmpty?: boolean;
}) {
  const theme = useTheme();
  const visibleTracks = hideEmpty ? tracks.filter((track) => track.value != null) : tracks;
  const visibleParts = hideEmpty
    ? (scoreParts ?? []).filter((track) => track.value != null)
    : (scoreParts ?? []);

  const isRecordedOnly = (track: ProgressTrackModel) => track.caption === 'Recorded (no target)';

  return (
    <Card>
      <Label>{title}</Label>
      <Body style={{ color: theme.color.muted, fontSize: 13, marginTop: 6, marginBottom: compact ? 12 : 14 }}>
        {footnote}
      </Body>
      <View style={{ gap: compact ? 12 : 16 }}>
        {visibleTracks.map((track) => (
          <ProgressTrack
            key={track.key}
            label={track.label}
            detail={track.detail}
            caption={compact ? undefined : track.caption}
            value={track.value}
            showAsRecordedOnly={isRecordedOnly(track)}
          />
        ))}
      </View>
      {visibleParts.length > 0 ? (
        <View style={{ marginTop: compact ? 14 : 18, gap: 12 }}>
          <Label>Score parts</Label>
          <Body style={{ color: theme.color.muted, fontSize: 13 }}>
            Dropped parts had no recorded data. Remaining weights are renormalized.
          </Body>
          {visibleParts.map((part) => (
            <ProgressTrack
              key={part.key}
              label={part.label}
              detail={part.detail}
              value={part.value}
            />
          ))}
        </View>
      ) : null}
      {workRest ? <WorkRestBlock workRest={workRest} /> : null}
      {intervals && intervals.length > 0 && !compact ? <IntervalTracks intervals={intervals} /> : null}
    </Card>
  );
}

function WorkRestBlock({ workRest }: { workRest: WorkRestModel }) {
  const theme = useTheme();
  return (
    <View style={{ marginTop: 18, gap: 8 }}>
      <Label>Work : Rest</Label>
      <Strong style={{ fontFamily: theme.type.display, fontSize: 32 }}>{workRest.display}</Strong>
      {workRest.label ? <Body style={{ color: theme.color.muted }}>{workRest.label}</Body> : null}
      <WorkRestSplit workSeconds={workRest.workSeconds} restSeconds={workRest.restSeconds} />
    </View>
  );
}

function IntervalTracks({ intervals }: { intervals: IntervalProgressModel[] }) {
  const theme = useTheme();
  const isRecordedOnly = (track: ProgressTrackModel) => track.caption === 'Recorded (no target)';
  return (
    <View style={{ marginTop: 18, gap: 16 }}>
      <Label>Each work interval</Label>
      <Body style={{ color: theme.color.muted, fontSize: 13 }}>
        Planned versus what this session actually recorded.
      </Body>
      {intervals.map((interval) => (
        <View key={interval.id} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Strong style={{ flex: 1 }}>{interval.title.toUpperCase()}</Strong>
            <Body style={{ color: theme.color.muted, fontSize: 13 }}>{interval.outcome}</Body>
          </View>
          {interval.tracks.map((track) => (
            <ProgressTrack
              key={`${interval.id}-${track.key}`}
              label={track.label}
              detail={track.detail}
              caption={track.caption}
              value={track.value}
              showAsRecordedOnly={isRecordedOnly(track)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
