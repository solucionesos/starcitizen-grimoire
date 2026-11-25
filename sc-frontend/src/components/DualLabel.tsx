import React, { useId } from 'react';

export interface DualLabelProps {
  sacred: string;
  tactical: string;
  size?: 'sm' | 'md' | 'lg';
  inline?: boolean;
  align?: 'left' | 'center';
  tooltip?: string;
  tooltipFocusable?: boolean;
  className?: string;
  sacredColor?: string;
}

export interface TacticalTooltipProps {
  text?: string;
  tactical?: string;
  children: React.ReactNode;
  className?: string;
  focusable?: boolean;
}

export const TacticalTooltip: React.FC<TacticalTooltipProps> = ({
  text,
  tactical,
  children,
  className,
  focusable = true,
}) => {
  const tooltipId = useId();
  const resolvedText = text ?? tactical ?? '';
  if (!resolvedText) {
    return <>{children}</>;
  }

  const wrapClass = ['tactical-tooltip-wrap', className ?? ''].filter(Boolean).join(' ');

  return (
    <span
      className={wrapClass}
      tabIndex={focusable ? 0 : undefined}
      title={resolvedText}
      aria-describedby={tooltipId}
    >
      {children}
      <span id={tooltipId} role="tooltip" className="tactical-tooltip-bubble">
        {resolvedText}
      </span>
    </span>
  );
};

export const DualLabel: React.FC<DualLabelProps> = ({
  sacred,
  tactical,
  size = 'md',
  inline = false,
  align = 'left',
  tooltip,
  tooltipFocusable = false,
  className,
  sacredColor,
}) => {
  const classes = [
    'dual-label',
    `dual-label--${size}`,
    inline ? 'dual-label--inline' : 'dual-label--stacked',
    align === 'center' ? 'dual-label--center' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <span className={classes}>
      <span
        className="dual-label__sacred"
        style={sacredColor ? { color: sacredColor } : undefined}
      >
        {sacred}
      </span>
      {inline && (
        <span aria-hidden="true" className="dual-label__sep">
          ·
        </span>
      )}
      <span className="dual-label__tactical">{tactical}</span>
    </span>
  );

  if (tooltip) {
    return (
      <TacticalTooltip text={tooltip} focusable={tooltipFocusable}>
        {content}
      </TacticalTooltip>
    );
  }

  return content;
};

export default DualLabel;
