import React from 'react';
import { View, Image, type ViewStyle, type ImageStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Box } from '../primitives/Box';
import { TextPrimitive } from '../primitives/Text';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

const sizeMap: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
  xxl: 96,
};

export interface AvatarProps {
  source?: { uri: string } | number;
  name?: string;
  size?: AvatarSize;
  shape?: 'circle' | 'square';
  status?: 'online' | 'offline' | 'busy' | 'away' | null;
  statusPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  alt?: string;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getColorFromName(name: string): string {
  const colors = [
    '#E8FF3D', '#FF5A5A', '#3DDC97', '#60A5FA', '#F5A524',
    '#A855F7', '#EC4899', '#06B6D4', '#84CC16', '#F97316',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({
  source,
  name,
  size = 'md',
  shape = 'circle',
  status = null,
  statusPosition = 'bottom-right',
  alt,
  style,
  imageStyle,
}: AvatarProps) {
  const theme = useTheme();
  const diameter = sizeMap[size];
  const borderRadius = shape === 'circle' ? diameter / 2 : theme.radius.md;
  const statusSize = Math.max(10, diameter * 0.22);
  const fontSize = diameter * 0.35;

  const positionStyles: Record<string, ViewStyle> = {
    'bottom-right': { bottom: -2, right: -2 },
    'bottom-left': { bottom: -2, left: -2 },
    'top-right': { top: -2, right: -2 },
    'top-left': { top: -2, left: -2 },
  };

  const statusColors = {
    online: theme.color.success,
    offline: theme.color.muted,
    busy: theme.color.danger,
    away: theme.color.warn,
  };

  let content: React.ReactNode;

  if (source) {
    content = (
      <Image
        source={source}
        style={[
          { width: diameter, height: diameter, borderRadius },
          imageStyle,
        ]}
        accessibilityLabel={alt ?? name ?? 'Avatar'}
        resizeMode="cover"
      />
    );
  } else if (name) {
    const bgColor = getColorFromName(name);
    content = (
      <Box
        style={{
          width: diameter,
          height: diameter,
          borderRadius,
          backgroundColor: bgColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <TextPrimitive variant="body1" weight="semibold" color="#111318" style={{ fontSize }}>
          {getInitials(name)}
        </TextPrimitive>
      </Box>
    );
  } else {
    content = (
      <Box
        style={{
          width: diameter,
          height: diameter,
          borderRadius,
          backgroundColor: theme.color.surface2,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <TextPrimitive variant="body1" color={theme.color.muted} style={{ fontSize }}>
          ?
        </TextPrimitive>
      </Box>
    );
  }

  return (
    <Box position="relative" style={{ width: diameter, height: diameter, ...style }}>
      {content}
      {status && (
        <View
          style={[
            {
              position: 'absolute',
              width: statusSize,
              height: statusSize,
              borderRadius: statusSize / 2,
              backgroundColor: statusColors[status],
              borderWidth: 2,
              borderColor: theme.color.surface,
              ...positionStyles[statusPosition],
            },
          ]}
        />
      )}
    </Box>
  );
}

export interface AvatarGroupProps {
  avatars: Array<{ source?: { uri: string } | number; name?: string; size?: AvatarSize }>;
  max?: number;
  overlap?: number;
  size?: AvatarSize;
  style?: ViewStyle;
}

export function AvatarGroup({ avatars, max = 5, overlap = 8, size = 'md', style }: AvatarGroupProps) {
  const diameter = sizeMap[size];
  const visibleAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <Box flexDirection="row" style={style}>
      {visibleAvatars.map((avatar, index) => (
        <View key={index} style={{ marginLeft: index === 0 ? 0 : -overlap, zIndex: max - index }}>
          <Avatar {...avatar} size={size} />
        </View>
      ))}
      {remaining > 0 && (
        <View style={{ marginLeft: -overlap, zIndex: 0 }}>
          <Avatar name={`+${remaining}`} size={size} />
        </View>
      )}
    </Box>
  );
}

export interface AvatarStackProps {
  avatars: Array<{ source?: { uri: string } | number; name?: string; label?: string }>;
  size?: AvatarSize;
  style?: ViewStyle;
}

export function AvatarStack({ avatars, size = 'md', style }: AvatarStackProps) {
  return (
    <Box flexDirection="column" gap={8} style={style}>
      {avatars.map((avatar, index) => (
        <Box key={index} flexDirection="row" alignItems="center" gap={12}>
          <Avatar {...avatar} size={size} />
          {avatar.label && <TextPrimitive variant="body2">{avatar.label}</TextPrimitive>}
        </Box>
      ))}
    </Box>
  );
}