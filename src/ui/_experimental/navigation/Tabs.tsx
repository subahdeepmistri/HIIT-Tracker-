import React from 'react';
import { View, ScrollView, Pressable, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Box } from '../primitives/Box';
import { TextPrimitive } from '../primitives/Text';
import { PressablePrimitive } from '../primitives/Pressable';
import { Badge } from '../display/Badge';

export interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  variant?: 'line' | 'enclosed' | 'soft' | 'pills';
  size?: 'sm' | 'md' | 'lg';
  scrollable?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  indicatorColor?: string;
}

const variantStyles = (theme: ReturnType<typeof useTheme>) => ({
  line: {
    container: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.color.line },
    tab: { borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: theme.color.accent },
    label: { color: theme.color.muted },
    activeLabel: { color: theme.color.accent },
  },
  enclosed: {
    container: { backgroundColor: theme.color.surface2, borderRadius: theme.radius.pill, padding: 4, gap: 4 },
    tab: { borderRadius: theme.radius.pill },
    activeTab: { backgroundColor: theme.color.surface },
    label: { color: theme.color.muted },
    activeLabel: { color: theme.color.text },
  },
  soft: {
    container: { gap: 8 },
    tab: { borderRadius: theme.radius.md, paddingVertical: 8, paddingHorizontal: 16 },
    activeTab: { backgroundColor: theme.color.accent },
    label: { color: theme.color.muted },
    activeLabel: { color: theme.color.accentInk },
  },
  pills: {
    container: { backgroundColor: theme.color.surface2, borderRadius: theme.radius.pill, padding: 4, gap: 4 },
    tab: { borderRadius: theme.radius.pill, paddingVertical: 8, paddingHorizontal: 16 },
    activeTab: { backgroundColor: theme.color.accent },
    label: { color: theme.color.muted },
    activeLabel: { color: theme.color.accentInk },
  },
});

const sizeTokens = {
  sm: { paddingVertical: 8, paddingHorizontal: 12, fontSize: 12, iconSize: 16, gap: 6 },
  md: { paddingVertical: 12, paddingHorizontal: 16, fontSize: 14, iconSize: 18, gap: 8 },
  lg: { paddingVertical: 16, paddingHorizontal: 20, fontSize: 16, iconSize: 20, gap: 10 },
};

import { StyleSheet } from 'react-native';

export function Tabs({
  items,
  activeKey,
  onChange,
  variant = 'line',
  size = 'md',
  scrollable = false,
  fullWidth = false,
  style,
  contentContainerStyle,
  indicatorColor,
}: TabsProps) {
  const theme = useTheme();
  const variants = variantStyles(theme);
  const tokens = sizeTokens[size];
  const activeIndicatorColor = indicatorColor ?? theme.color.accent;

  const TabButton = ({ item, index }: { item: TabItem; index: number }) => {
    const isActive = item.key === activeKey;
    const variantStyle = variants[variant];

    return (
      <PressablePrimitive
        variant="ghost"
        disabled={item.disabled}
        onPress={() => !item.disabled && onChange(item.key)}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive, disabled: item.disabled }}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.gap,
            paddingVertical: tokens.paddingVertical,
            paddingHorizontal: tokens.paddingHorizontal,
            flex: fullWidth ? 1 : undefined,
            ...variantStyle.tab,
            ...(isActive ? variantStyle.activeTab : {}),
            opacity: item.disabled ? 0.38 : pressed ? 0.8 : 1,
          },
        ]}>
        {item.icon}
        <TextPrimitive
          variant="label1"
          weight={isActive ? 'semibold' : 'medium'}
          style={{ fontSize: tokens.fontSize, color: isActive ? variantStyle.activeLabel.color : variantStyle.label.color }}>
          {item.label}
        </TextPrimitive>
        {item.badge && <Badge variant="primary" size="sm">{item.badge}</Badge>}
      </PressablePrimitive>
    );
  };

  const renderTabs = () => items.map((item, index) => <TabButton key={item.key} item={item} index={index} />);

  return (
    <Box style={style}>
      <Box style={[{ flexDirection: 'row', alignItems: 'center', ...variants.container }, contentContainerStyle]}>
        {scrollable ? (
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: variant === 'line' ? 0 : 4 }}>
            {renderTabs()}
          </ScrollView>
        ) : (
          renderTabs()
        )}
      </Box>
      {variant === 'line' && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: activeIndicatorColor,
          }}
        />
      )}
    </Box>
  );
}

export interface SegmentedControlProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function SegmentedControl({ items, activeKey, onChange, size = 'md', fullWidth = true, style }: SegmentedControlProps) {
  const theme = useTheme();
  const tokens = sizeTokens[size];

  return (
    <Box style={[{ backgroundColor: theme.color.surface2, borderRadius: theme.radius.pill, padding: 4, gap: 4, flexDirection: 'row' }, style]}>
      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <PressablePrimitive
            key={item.key}
            variant="ghost"
            disabled={item.disabled}
            onPress={() => !item.disabled && onChange(item.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive, disabled: item.disabled }}
            style={({ pressed }) => [
              {
                flex: fullWidth ? 1 : undefined,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: tokens.gap,
                paddingVertical: tokens.paddingVertical,
                paddingHorizontal: tokens.paddingHorizontal,
                borderRadius: theme.radius.pill,
                backgroundColor: isActive ? theme.color.accent : pressed ? theme.color.surface : 'transparent',
              },
            ]}>
            {item.icon}
            <TextPrimitive variant="label1" weight={isActive ? 'semibold' : 'medium'} style={{ fontSize: tokens.fontSize, color: isActive ? theme.color.accentInk : theme.color.muted }}>
              {item.label}
            </TextPrimitive>
            {item.badge && <Badge variant={isActive ? 'default' : 'primary'} size="sm">{item.badge}</Badge>}
          </PressablePrimitive>
        );
      })}
    </Box>
  );
}

export interface TabViewProps {
  children: React.ReactNode;
  activeKey: string;
  style?: ViewStyle;
}

export function TabView({ children, activeKey, style }: TabViewProps) {
  const childrenArray = React.Children.toArray(children);
  const activeChild = childrenArray.find((child) => React.isValidElement(child) && (child.props as any).key === activeKey);
  return <Box style={style}>{activeChild}</Box>;
}

export interface TabPanelProps {
  key: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function TabPanel({ key, children, style }: TabPanelProps) {
  return <Box key={key} style={style}>{children}</Box>;
}

export interface BreadCrumbItem {
  label: string;
  href?: string;
  onPress?: () => void;
  disabled?: boolean;
}

export interface BreadcrumbsProps {
  items: BreadCrumbItem[];
  separator?: React.ReactNode;
  maxItems?: number;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export function Breadcrumbs({ items, separator = '/', maxItems = 5, size = 'md', style }: BreadcrumbsProps) {
  const theme = useTheme();
  const tokens = sizeTokens[size];

  const visibleItems = items.length > maxItems
    ? [items[0], { label: '...', disabled: true } as BreadCrumbItem, ...items.slice(-maxItems + 2)]
    : items;

  return (
    <Box flexDirection="row" alignItems="center" flexWrap="wrap" gap={tokens.gap} style={style}>
      {visibleItems.map((item, index) => (
        <Box key={index} flexDirection="row" alignItems="center" gap={tokens.gap}>
          {item.onPress || item.href ? (
            <PressablePrimitive
              variant="ghost"
              size={size}
              disabled={item.disabled}
              onPress={item.onPress}
              accessibilityRole="link"
              accessibilityState={{ disabled: item.disabled }}>
              <TextPrimitive variant="label2" color={item.disabled ? theme.color.muted : index === visibleItems.length - 1 ? theme.color.text : theme.color.accent} style={{ fontSize: tokens.fontSize }}>
                {item.label}
              </TextPrimitive>
            </PressablePrimitive>
          ) : (
            <TextPrimitive variant="label2" color={theme.color.text} style={{ fontSize: tokens.fontSize }}>{item.label}</TextPrimitive>
          )}
          {index < visibleItems.length - 1 && (
            <TextPrimitive variant="label2" color={theme.color.muted} style={{ fontSize: tokens.fontSize }}>{separator}</TextPrimitive>
          )}
        </Box>
      ))}
    </Box>
  );
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  size?: 'sm' | 'md' | 'lg';
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  maxVisiblePages?: number;
  style?: ViewStyle;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  size = 'md',
  showFirstLast = true,
  showPrevNext = true,
  maxVisiblePages = 5,
  style,
}: PaginationProps) {
  const theme = useTheme();
  const tokens = sizeTokens[size];

  const pages: (number | 'ellipsis')[] = [];
  const half = Math.floor(maxVisiblePages / 2);

  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > half + 1) pages.push('ellipsis');

    const start = Math.max(2, currentPage - half);
    const end = Math.min(totalPages - 1, currentPage + half);

    for (let i = start; i <= end; i++) pages.push(i);

    if (currentPage < totalPages - half) pages.push('ellipsis');
    pages.push(totalPages);
  }

  return (
    <Box flexDirection="row" alignItems="center" justifyContent="center" gap={4} style={style}>
      {showFirstLast && (
        <PressablePrimitive
          variant="ghost"
          size={size}
          disabled={currentPage === 1}
          onPress={() => onPageChange(1)}
          accessibilityLabel="First page">
          <TextPrimitive variant="caption1" weight="semibold">««</TextPrimitive>
        </PressablePrimitive>
      )}
      {showPrevNext && (
        <PressablePrimitive
          variant="ghost"
          size={size}
          disabled={currentPage === 1}
          onPress={() => onPageChange(currentPage - 1)}
          accessibilityLabel="Previous page">
          <TextPrimitive variant="caption1" weight="semibold">«</TextPrimitive>
        </PressablePrimitive>
      )}
      {pages.map((page, index) =>
        page === 'ellipsis' ? (
          <TextPrimitive key={index} variant="caption1" color={theme.color.muted}>…</TextPrimitive>
        ) : (
          <PressablePrimitive
            key={index}
            variant={page === currentPage ? 'primary' : 'ghost'}
            size={size}
            onPress={() => onPageChange(page)}
            accessibilityLabel={`Page ${page}`}
            accessibilityState={{ selected: page === currentPage }}
            style={{ minWidth: tokens.paddingHorizontal * 2 }}>
            <TextPrimitive variant="label2" weight={page === currentPage ? 'semibold' : 'medium'} style={{ fontSize: tokens.fontSize }}>
              {page}
            </TextPrimitive>
          </PressablePrimitive>
        )
      )}
      {showPrevNext && (
        <PressablePrimitive
          variant="ghost"
          size={size}
          disabled={currentPage === totalPages}
          onPress={() => onPageChange(currentPage + 1)}
          accessibilityLabel="Next page">
          <TextPrimitive variant="caption1" weight="semibold">»</TextPrimitive>
        </PressablePrimitive>
      )}
      {showFirstLast && (
        <PressablePrimitive
          variant="ghost"
          size={size}
          disabled={currentPage === totalPages}
          onPress={() => onPageChange(totalPages)}
          accessibilityLabel="Last page">
          <TextPrimitive variant="caption1" weight="semibold">»»</TextPrimitive>
        </PressablePrimitive>
      )}
    </Box>
  );
}

export interface StepperNavProps {
  steps: Array<{ label: string; description?: string; completed?: boolean; current?: boolean; error?: boolean }>;
  onStepClick?: (index: number) => void;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function StepperNav({ steps, onStepClick, orientation = 'horizontal', size = 'md', style }: StepperNavProps) {
  const theme = useTheme();
  const iconSize = size === 'sm' ? 20 : 28;
  const iconRadius = iconSize / 2;
  const lineWidth = size === 'sm' ? 2 : 3;
  const gap = size === 'sm' ? 8 : 12;
  const labelFontSize = size === 'sm' ? 11 : 13;

  return (
    <Box flexDirection={orientation} gap={gap} style={style}>
      {steps.map((step, index) => (
        <PressablePrimitive
          key={index}
          variant="ghost"
          onPress={() => onStepClick?.(index)}
          style={({ pressed }) => ({
            flexDirection: orientation,
            alignItems: 'center',
            gap: gap,
            opacity: pressed ? 0.8 : 1,
          })}
          accessibilityRole="button"
          accessibilityState={{ selected: step.current }}
          accessibilityLabel={`${step.label}${step.completed ? ', completed' : step.current ? ', current' : step.error ? ', error' : ''}`}>
          <Box
            style={{
              width: iconSize,
              height: iconSize,
              borderRadius: iconRadius,
              borderWidth: lineWidth,
              borderColor: step.completed || step.current ? theme.color.accent : step.error ? theme.color.danger : theme.color.line,
              backgroundColor: step.completed ? theme.color.accent : step.current ? theme.color.surface : step.error ? 'rgba(255,90,90,0.1)' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}>
            {step.completed ? (
              <TextPrimitive style={{ color: theme.color.accentInk, fontSize: iconSize * 0.5 }}>✓</TextPrimitive>
            ) : step.error ? (
              <TextPrimitive style={{ color: theme.color.danger, fontSize: iconSize * 0.5 }}>✕</TextPrimitive>
            ) : step.current ? (
              <View style={{ width: iconSize * 0.4, height: iconSize * 0.4, borderRadius: iconSize * 0.2, backgroundColor: theme.color.accent }} />
            ) : null}
          </Box>
          <Box style={{ minWidth: 0 }}>
            <TextPrimitive variant="body2" weight={step.current ? 'semibold' : 'regular'} color={step.error ? theme.color.danger : step.completed || step.current ? theme.color.text : theme.color.muted} style={{ fontSize: labelFontSize }}>
              {step.label}
            </TextPrimitive>
            {step.description && <TextPrimitive variant="caption1" color={theme.color.muted} style={{ fontSize: labelFontSize - 1 }}>{step.description}</TextPrimitive>}
          </Box>
          {index < steps.length - 1 && (
            <Box
              style={{
                flex: orientation === 'horizontal' ? 1 : 0,
                width: orientation === 'horizontal' ? undefined : lineWidth,
                height: orientation === 'vertical' ? undefined : lineWidth,
                backgroundColor: step.completed ? theme.color.accent : theme.color.line,
              }}
            />
          )}
        </PressablePrimitive>
      ))}
    </Box>
  );
}