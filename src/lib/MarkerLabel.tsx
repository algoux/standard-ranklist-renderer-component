import classnames from 'classnames';
import type * as srk from '@algoux/standard-ranklist';
import { resolveText, EnumTheme, resolveStyle } from '@algoux/standard-ranklist-utils';

export interface MarkerLabelProps {
  marker: srk.Marker;
  theme: EnumTheme;
  className?: string;
  style?: React.CSSProperties;
}

export function MarkerLabel(props: MarkerLabelProps) {
  if (!props.marker) {
    return null;
  }
  const { marker, theme } = props;
  const calcClassName = typeof marker.style === 'string' ? `srk-preset-marker-${marker.style}` : '';
  const calcStyle =
    typeof marker.style === 'object'
      ? {
          backgroundColor: resolveStyle(marker.style).backgroundColor[theme],
        }
      : undefined;

  return (
    <span
      className={classnames(calcClassName, props.className)}
      style={{
        ...calcStyle,
        ...props.style,
      }}
    >
      {resolveText(marker.label)}
    </span>
  );
}
