import React from 'react';
import { View, Text, ScrollView, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Box } from '../primitives/Box';
import { TextPrimitive } from '../primitives/Text';

export interface Column<T> {
  key: string;
  header: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  style?: ViewStyle;
  headerStyle?: ViewStyle;
  cellStyle?: ViewStyle;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onRowPress?: (row: T, index: number) => void;
  emptyState?: React.ReactNode;
  loading?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  compact?: boolean;
  stickyHeader?: boolean;
  style?: ViewStyle;
  rowStyle?: (row: T, index: number) => ViewStyle;
}

function TableHeader<T>({
  columns,
  sortBy,
  sortDirection,
  onSort,
  compact,
  stickyHeader,
}: {
  columns: Column<T>[];
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  compact?: boolean;
  stickyHeader?: boolean;
}) {
  const theme = useTheme();
  const padding = compact ? 8 : 12;

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: theme.color.surface2,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.color.line,
          ...(stickyHeader ? { position: 'sticky', top: 0, zIndex: 1 } : {}),
        },
      ]}>
      {columns.map((column) => (
        <Pressable
          key={column.key}
          onPress={column.sortable && onSort ? () => onSort(column.key, sortBy === column.key && sortDirection === 'asc' ? 'desc' : 'asc') : undefined}
          disabled={!column.sortable}
          style={[
            {
              flex: column.width ? 0 : 1,
              width: column.width,
              paddingHorizontal: padding,
              paddingVertical: padding,
              alignItems: column.align === 'center' ? 'center' : column.align === 'right' ? 'flex-end' : 'flex-start',
              minWidth: 60,
            },
            column.headerStyle,
          ]}>
          <Box flexDirection="row" alignItems="center" gap={4}>
            <TextPrimitive variant="label2" weight="semibold" color={theme.color.muted}>
              {column.header}
            </TextPrimitive>
            {column.sortable && sortBy === column.key && (
              <TextPrimitive variant="caption1" color={theme.color.accent}>
                {sortDirection === 'asc' ? '↑' : '↓'}
              </TextPrimitive>
            )}
          </Box>
        </Pressable>
      ))}
    </View>
  );
}

function TableRow<T>({
  row,
  index,
  columns,
  compact,
  bordered,
  onPress,
  rowStyle,
  theme,
}: {
  row: T;
  index: number;
  columns: Column<T>[];
  compact?: boolean;
  bordered?: boolean;
  onPress?: (row: T, index: number) => void;
  rowStyle?: (row: T, index: number) => ViewStyle;
  theme: ReturnType<typeof useTheme>;
}) {
  const padding = compact ? 8 : 12;
  const bgColor = index % 2 === 1 ? theme.color.surface2 : theme.color.surface;

  return (
    <Pressable
      onPress={onPress ? () => onPress(row, index) : undefined}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          backgroundColor: pressed ? theme.color.surface2 : bgColor,
          borderBottomWidth: bordered ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: theme.color.line,
        },
        rowStyle?.(row, index),
      ]}>
      {columns.map((column) => {
        const value = (row as any)[column.key];
        const rendered = column.render ? column.render(value, row, index) : String(value ?? '—');
        return (
          <View
            key={column.key}
            style={[
              {
                flex: column.width ? 0 : 1,
                width: column.width,
                paddingHorizontal: padding,
                paddingVertical: padding,
                alignItems: column.align === 'center' ? 'center' : column.align === 'right' ? 'flex-end' : 'flex-start',
                minWidth: 60,
              },
              column.cellStyle,
            ]}>
            {typeof rendered === 'string' ? (
              <TextPrimitive variant={compact ? 'body3' : 'body2'} color={theme.color.text}>{rendered}</TextPrimitive>
            ) : (
              rendered
            )}
          </View>
        );
      })}
    </Pressable>
  );
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  sortBy,
  sortDirection,
  onSort,
  onRowPress,
  emptyState,
  loading = false,
  striped = true,
  hoverable = false,
  bordered = true,
  compact = false,
  stickyHeader = true,
  style,
  rowStyle,
}: TableProps<T>) {
  const theme = useTheme();

  if (loading) {
    return (
      <Box style={{ backgroundColor: theme.color.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.color.line, overflow: 'hidden', ...style }}>
        <TableSkeleton columns={columns.length} compact={compact} />
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Box style={{ backgroundColor: theme.color.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.color.line, overflow: 'hidden', ...style }}>
        {emptyState ?? (
          <Box style={{ padding: 48, alignItems: 'center', gap: 12 }}>
            <TextPrimitive variant="title3" weight="semibold">No data</TextPrimitive>
            <TextPrimitive variant="body2" color={theme.color.muted}>There are no items to display.</TextPrimitive>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box style={{ backgroundColor: theme.color.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.color.line, overflow: 'hidden', ...style }}>
      <TableHeader columns={columns} sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} compact={compact} stickyHeader={stickyHeader} />
      <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ paddingBottom: 20 }}>
        {data.map((row, index) => (
          <TableRow
            key={keyExtractor(row, index)}
            row={row}
            index={index}
            columns={columns}
            compact={compact}
            bordered={bordered}
            onPress={onRowPress}
            rowStyle={rowStyle}
            theme={theme}
          />
        ))}
      </ScrollView>
    </Box>
  );
}

function TableSkeleton({ columns, compact }: { columns: number; compact?: boolean }) {
  const padding = compact ? 8 : 12;
  return (
    <Box gap={compact ? 4 : 8} style={{ padding: 16 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Box key={i} flexDirection="row" gap={12} style={{ paddingVertical: padding }}>
          {Array.from({ length: columns }).map((_, j) => (
            <Box key={j} flex={1} style={{ minWidth: 60 }}>
              <Skeleton variant="text" width="80%" height={compact ? 12 : 16} animation="wave" />
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}

import { Skeleton } from '../../feedback/Spinner';
import { StyleSheet } from 'react-native';

export interface SimpleTableProps {
  headers: string[];
  rows: (string | number | React.ReactNode)[][];
  align?: ('left' | 'center' | 'right')[];
  striped?: boolean;
  bordered?: boolean;
  compact?: boolean;
  style?: ViewStyle;
}

export function SimpleTable({ headers, rows, align, striped = true, bordered = true, compact = false, style }: SimpleTableProps) {
  const theme = useTheme();
  const padding = compact ? 8 : 12;

  return (
    <Box style={{ backgroundColor: theme.color.surface, borderRadius: theme.radius.lg, borderWidth: bordered ? 1 : 0, borderColor: theme.color.line, overflow: 'hidden', ...style }}>
      <View style={{ flexDirection: 'row', backgroundColor: theme.color.surface2, borderBottomWidth: bordered ? StyleSheet.hairlineWidth : 0, borderBottomColor: theme.color.line }}>
        {headers.map((header, i) => (
          <View key={i} style={{ flex: 1, paddingHorizontal: padding, paddingVertical: padding, alignItems: align?.[i] === 'center' ? 'center' : align?.[i] === 'right' ? 'flex-end' : 'flex-start', minWidth: 80 }}>
            <TextPrimitive variant="label2" weight="semibold" color={theme.color.muted}>{header}</TextPrimitive>
          </View>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={{
            flexDirection: 'row',
            backgroundColor: striped && rowIndex % 2 === 1 ? theme.color.surface2 : theme.color.surface,
            borderBottomWidth: bordered && rowIndex < rows.length - 1 ? StyleSheet.hairlineWidth : 0,
            borderBottomColor: theme.color.line,
          }}>
          {row.map((cell, cellIndex) => (
            <View key={cellIndex} style={{ flex: 1, paddingHorizontal: padding, paddingVertical: padding, alignItems: align?.[cellIndex] === 'center' ? 'center' : align?.[cellIndex] === 'right' ? 'flex-end' : 'flex-start', minWidth: 80 }}>
              {typeof cell === 'string' || typeof cell === 'number' ? (
                <TextPrimitive variant={compact ? 'body3' : 'body2'}>{String(cell)}</TextPrimitive>
              ) : (
                cell
              )}
            </View>
          ))}
        </View>
      ))}
    </Box>
  );
}