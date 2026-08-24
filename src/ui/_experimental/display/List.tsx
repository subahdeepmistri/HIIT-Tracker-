import React from 'react';
import { View, Pressable, FlatList, type ViewStyle, type FlatListProps } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Box } from '../primitives/Box';
import { TextPrimitive } from '../primitives/Text';
import { Divider } from './Divider';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { PressablePrimitive } from '../primitives/Pressable';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  description?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  meta?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
  divider?: boolean;
  dividerInset?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function ListItem({
  title,
  subtitle,
  description,
  leading,
  trailing,
  meta,
  onPress,
  onLongPress,
  disabled = false,
  selected = false,
  divider = true,
  dividerInset = true,
  style,
  accessibilityLabel,
}: ListItemProps) {
  const theme = useTheme();

  const content = (
    <Box flexDirection="row" alignItems="center" gap={12} style={{ paddingVertical: 12, ...style }}>
      {leading && <Box style={{ flexShrink: 0 }}>{leading}</Box>}
      <Box flex={1} minWidth={0} gap={2}>
        <TextPrimitive variant="body1" weight={selected ? 'semibold' : 'medium'} color={disabled ? theme.color.muted : theme.color.text} numberOfLines={1}>
          {title}
        </TextPrimitive>
        {subtitle && <TextPrimitive variant="caption1" color={theme.color.muted} numberOfLines={1}>{subtitle}</TextPrimitive>}
        {description && <TextPrimitive variant="body2" color={disabled ? theme.color.muted : theme.color.text} numberOfLines={2}>{description}</TextPrimitive>}
      </Box>
      {meta && <Box style={{ flexShrink: 0, marginRight: 8 }}>{meta}</Box>}
      {trailing && <Box style={{ flexShrink: 0 }}>{trailing}</Box>}
    </Box>
  );

  if (onPress) {
    return (
      <PressablePrimitive
        variant="ghost"
        style={({ pressed }) => [
          { backgroundColor: selected ? theme.color.accent : pressed ? theme.color.surface2 : 'transparent', borderRadius: 0 },
          style,
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled, selected }}
        accessibilityLabel={accessibilityLabel}>
        {content}
        {divider && <Divider inset={dividerInset} />}
      </PressablePrimitive>
    );
  }

  return (
    <Box style={style}>
      {content}
      {divider && <Divider inset={dividerInset} />}
    </Box>
  );
}

export interface ListSectionProps {
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function ListSection({ title, children, style }: ListSectionProps) {
  const theme = useTheme();
  return (
    <Box style={style}>
      <Box style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <TextPrimitive variant="label1" color={theme.color.muted}>{title}</TextPrimitive>
      </Box>
      {children}
    </Box>
  );
}

export interface ListProps<T> extends Omit<FlatListProps<T>, 'renderItem' | 'ItemSeparatorComponent' | 'ListEmptyComponent'> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  emptyState?: React.ReactNode;
  loading?: boolean;
  sectioned?: boolean;
  sections?: Array<{ title: string; data: T[] }>;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

export function List<T>({
  data,
  renderItem,
  keyExtractor = (_, i) => String(i),
  emptyState,
  loading = false,
  sectioned = false,
  sections,
  style,
  contentContainerStyle,
  ...props
}: ListProps<T>) {
  const theme = useTheme();

  if (loading) {
    return (
      <Box style={{ flex: 1, ...style }}>
        <ListSkeleton />
      </Box>
    );
  }

  const itemsToRender = sectioned && sections ? sections : [{ title: '', data }];

  if (itemsToRender.every((s) => s.data.length === 0)) {
    return (
      <Box style={{ flex: 1, ...style }}>
        {emptyState ?? (
          <Box style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 }}>
            <TextPrimitive variant="title3" weight="semibold">No items</TextPrimitive>
            <TextPrimitive variant="body2" color={theme.color.muted}>There are no items to display.</TextPrimitive>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box style={{ flex: 1, ...style }}>
      <FlatList
        data={itemsToRender}
        keyExtractor={(section) => section.title}
        renderItem={({ item: section, index }) => (
          <Box>
            {section.title && <ListSection title={section.title} />}
            {section.data.map((item, itemIndex) => (
              <View key={keyExtractor(item, itemIndex)}>{renderItem(item, itemIndex)}</View>
            ))}
          </Box>
        )}
        contentContainerStyle={{ paddingBottom: 20, ...contentContainerStyle }}
        {...props}
      />
    </Box>
  );
}

function ListSkeleton() {
  return (
    <Box gap={12} style={{ padding: 16 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Box key={i} flexDirection="row" alignItems="center" gap={12} style={{ paddingVertical: 12 }}>
          <Skeleton variant="avatar" size="md" animation="wave" />
          <Box flex={1} gap={8}>
            <Skeleton variant="text" width="60%" animation="wave" />
            <Skeleton variant="text" width="40%" animation="wave" />
          </Box>
          <Skeleton variant="rectangular" width={80} height={36} borderRadius={999} animation="wave" />
        </Box>
      ))}
    </Box>
  );
}

import { Skeleton } from '../../feedback/Spinner';

export interface SelectableListProps<T> {
  data: T[];
  renderItem: (item: T, index: number, selected: boolean) => React.ReactNode;
  selectedKeys: Set<string>;
  onSelectionChange: (keys: Set<string>) => void;
  keyExtractor: (item: T) => string;
  selectAll?: boolean;
  onSelectAll?: () => void;
  emptyState?: React.ReactNode;
  style?: ViewStyle;
}

export function SelectableList<T>({
  data,
  renderItem,
  selectedKeys,
  onSelectionChange,
  keyExtractor,
  selectAll = false,
  onSelectAll,
  emptyState,
  style,
}: SelectableListProps<T>) {
  const theme = useTheme();
  const allSelected = data.length > 0 && data.every((item) => selectedKeys.has(keyExtractor(item)));

  const handleToggleAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(keyExtractor)));
    }
  };

  return (
    <Box style={{ flex: 1, ...style }}>
      {selectAll && (
        <PressablePrimitive
          variant="ghost"
          style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.color.line }}
          onPress={handleToggleAll}>
          <View style={{ width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: allSelected ? theme.color.accent : theme.color.line, backgroundColor: allSelected ? theme.color.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            {allSelected && <TextPrimitive style={{ color: theme.color.accentInk, fontSize: 14 }}>✓</TextPrimitive>}
          </View>
          <TextPrimitive variant="body2" weight="medium">{allSelected ? 'Deselect all' : 'Select all'} ({selectedKeys.size}/{data.length})</TextPrimitive>
        </PressablePrimitive>
      )}
      {data.length === 0 ? (
        emptyState ?? (
          <Box style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 }}>
            <TextPrimitive variant="title3" weight="semibold">No items</TextPrimitive>
            <TextPrimitive variant="body2" color={theme.color.muted}>There are no items to display.</TextPrimitive>
          </Box>
        )
      ) : (
        <FlatList
          data={data}
          keyExtractor={keyExtractor}
          renderItem={({ item, index }) => {
            const key = keyExtractor(item);
            const selected = selectedKeys.has(key);
            return <PressablePrimitive variant="ghost" style={({ pressed }) => [{ backgroundColor: selected ? theme.color.accent : pressed ? theme.color.surface2 : 'transparent' }]} onPress={() => { const next = new Set(selectedKeys); selected ? next.delete(key) : next.add(key); onSelectionChange(next); }}>{renderItem(item, index, selected)}</PressablePrimitive>;
          }}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </Box>
  );
}

export interface VirtualizedListProps<T> extends Omit<ListProps<T>, 'data'> {
  data: T[];
  itemHeight: number | ((item: T, index: number) => number);
  overscan?: number;
}

export function VirtualizedList<T>({
  data,
  renderItem,
  keyExtractor = (_, i) => String(i),
  itemHeight,
  overscan = 5,
  emptyState,
  loading = false,
  style,
  contentContainerStyle,
  ...props
}: VirtualizedListProps<T>) {
  const theme = useTheme();

  if (loading) {
    return <Box style={{ flex: 1, ...style }}><ListSkeleton /></Box>;
  }

  if (data.length === 0) {
    return (
      <Box style={{ flex: 1, ...style }}>
        {emptyState ?? (
          <Box style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 }}>
            <TextPrimitive variant="title3" weight="semibold">No items</TextPrimitive>
            <TextPrimitive variant="body2" color={theme.color.muted}>There are no items to display.</TextPrimitive>
          </Box>
        )}
      </Box>
    );
  }

  const getItemHeight = (index: number) => typeof itemHeight === 'function' ? itemHeight(data[index], index) : itemHeight;
  const totalHeight = data.reduce((sum, _, i) => sum + getItemHeight(i), 0);

  return (
    <Box style={{ flex: 1, ...style }}>
      <ScrollView contentContainerStyle={{ height: totalHeight, ...contentContainerStyle }} {...props}>
        {data.map((item, index) => (
          <View key={keyExtractor(item, index)} style={{ height: getItemHeight(index), position: 'absolute', top: data.slice(0, index).reduce((sum, _, i) => sum + getItemHeight(i), 0), left: 0, right: 0 }}>
            {renderItem(item, index)}
          </View>
        ))}
      </ScrollView>
    </Box>
  );
}