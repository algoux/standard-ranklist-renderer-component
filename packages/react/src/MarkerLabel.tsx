import classnames from 'classnames';
import type * as srk from '@algoux/standard-ranklist';
import { resolveText, EnumTheme } from '@algoux/standard-ranklist-utils';
import { getMarkerPresentation } from '@algoux/standard-ranklist-renderer-component-core';

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
  const markerPresentation = getMarkerPresentation(marker, theme);

  return (
    <span
      className={classnames(markerPresentation.className, props.className)}
      style={{
        ...markerPresentation.style,
        ...props.style,
      }}
    >
      {resolveText(marker.label)}
    </span>
  );
}
