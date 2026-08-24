import React from 'react';
import { View, type ViewStyle, type ViewProps } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export interface BoxProps extends Omit<ViewProps, 'style'> {
  as?: 'view' | 'scroll';
  children?: React.ReactNode;
  style?: ViewStyle;
  p?: keyof typeof import('../../theme/tokens').space | number;
  px?: keyof typeof import('../../theme/tokens').space | number;
  py?: keyof typeof import('../../theme/tokens').space | number;
  pt?: keyof typeof import('../../theme/tokens').space | number;
  pb?: keyof typeof import('../../theme/tokens').space | number;
  pl?: keyof typeof import('../../theme/tokens').space | number;
  pr?: keyof typeof import('../../theme/tokens').space | number;
  m?: keyof typeof import('../../theme/tokens').space | number;
  mx?: keyof typeof import('../../theme/tokens').space | number;
  my?: keyof typeof import('../../theme/tokens').space | number;
  mt?: keyof typeof import('../../theme/tokens').space | number;
  mb?: keyof typeof import('../../theme/tokens').space | number;
  ml?: keyof typeof import('../../theme/tokens').space | number;
  mr?: keyof typeof import('../../theme/tokens').space | number;
  bg?: string;
  borderRadius?: keyof typeof import('../../theme/tokens').radius | number;
  borderWidth?: number;
  borderColor?: string;
  shadow?: keyof typeof import('../../theme/tokens').motion;
  flex?: number;
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  gap?: number;
  width?: string | number;
  height?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  minHeight?: string | number;
  maxHeight?: string | number;
  overflow?: 'visible' | 'hidden' | 'scroll';
  position?: 'absolute' | 'relative';
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  zIndex?: number;
  opacity?: number;
}

function getSpaceValue(value: keyof typeof import('../../theme/tokens').space | number | undefined, theme: ReturnType<typeof useTheme>): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;
  return theme.space[value];
}

function getRadiusValue(value: keyof typeof import('../../theme/tokens').radius | number | undefined, theme: ReturnType<typeof useTheme>): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;
  return theme.radius[value];
}

export function Box({
  as = 'view',
  children,
  style,
  p,
  px,
  py,
  pt,
  pb,
  pl,
  pr,
  m,
  mx,
  my,
  mt,
  mb,
  ml,
  mr,
  bg,
  borderRadius,
  borderWidth,
  borderColor,
  flex,
  flexDirection,
  alignItems,
  justifyContent,
  gap,
  width,
  height,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  overflow,
  position,
  top,
  right,
  bottom,
  left,
  zIndex,
  opacity,
  ...rest
}: BoxProps) {
  const theme = useTheme();

  const computedStyle: ViewStyle = {
    ...(flex !== undefined && { flex }),
    ...(flexDirection && { flexDirection }),
    ...(alignItems && { alignItems }),
    ...(justifyContent && { justifyContent }),
    ...(gap !== undefined && { gap }),
    ...(width !== undefined && { width }),
    ...(height !== undefined && { height }),
    ...(minWidth !== undefined && { minWidth }),
    ...(maxWidth !== undefined && { maxWidth }),
    ...(minHeight !== undefined && { minHeight }),
    ...(maxHeight !==undefined && { maxHeight }),
    ...(overflow && { overflow }),
    ...(position && { position }),
    ...(top !== undefined && { top }),
    ...(right !== undefined && { right }),
    ...(bottom !== undefined && { bottom }),
    ...(left !== undefined && { left }),
    ...(zIndex !== undefined && { zIndex }),
    ...(opacity !== undefined && { opacity }),
    ...(bg && { backgroundColor: bg }),
    ...(borderRadius !== undefined && { borderRadius: getRadiusValue(borderRadius, theme) }),
    ...(borderWidth !== undefined && { borderWidth }),
    ...(borderColor && { borderColor }),
    padding: getSpaceValue(p, theme),
    paddingHorizontal: getSpaceValue(px, theme),
    paddingVertical: getSpaceValue(py, theme),
    paddingTop: getSpaceValue(pt, theme),
    paddingBottom: getSpaceValue(pb, theme),
    paddingLeft: getSpaceValue(pl, theme),
    paddingRight: getSpaceValue(pr, theme),
    margin: getSpaceValue(m, theme),
    marginHorizontal: getSpaceValue(mx, theme),
    marginVertical: getSpaceValue(my, theme),
    marginTop: getSpaceValue(mt, theme),
    marginBottom: getSpaceValue(mb, theme),
    marginLeft: getSpaceValue(ml, theme),
    marginRight: getSpaceValue(mr, theme),
  };

  const Component = as === 'scroll' ? View : View;

  return <Component style={[computedStyle, style]} {...rest}>{children}</Component>;
}

export function Flex({
  children,
  style,
  direction = 'column',
  align = 'stretch',
  justify = 'flex-start',
  gap = 0,
  wrap = 'nowrap',
  flex = 1,
  ...rest
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  gap?: number;
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
  flex?: number;
} & Omit<ViewProps, 'style'>) {
  return (
    <Box
      flex={flex}
      flexDirection={direction}
      alignItems={align}
      justifyContent={justify}
      gap={gap}
      style={[{ flexWrap: wrap }, style]}
      {...rest}
    >
      {children}
    </Box>
  );
}

export function Stack({
  children,
  space: spaceSize = 16,
  direction = 'column',
  divider,
  ...rest
}: {
  children: React.ReactNode;
  space?: keyof typeof import('../../theme/tokens').space | number;
  direction?: 'row' | 'column';
  divider?: React.ReactNode;
  style?: ViewStyle;
} & Omit<ViewProps, 'style'>) {
  const theme = useTheme();
  const spaceValue = getSpaceValue(spaceSize, theme);

  const childrenArray = React.Children.toArray(children).filter((c): c is React.ReactElement => React.isValidElement(c));

  return (
    <Flex direction={direction} gap={spaceValue} {...rest}>
      {childrenArray.map((child, index) => (
        <React.Fragment key={child.key ?? index}>
          {child}
          {divider && index < childrenArray.length - 1 && divider}
        </React.Fragment>
      ))}
    </Flex>
  );
}

export function Center({
  children,
  ...props
}: {
  children: React.ReactNode;
} & Omit<BoxProps, 'alignItems' | 'justifyContent'>) {
  return <Box alignItems="center" justifyContent="center" {...props}>{children}</Box>;
}

export function AbsoluteFill({
  children,
  ...props
}: {
  children: React.ReactNode;
} & Omit<BoxProps, 'position' | 'top' | 'right' | 'bottom' | 'left'>) {
  return <Box position="absolute" top={0} right={0} bottom={0} left={0} {...props}>{children}</Box>;
}