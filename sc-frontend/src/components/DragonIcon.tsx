import React from 'react';
import logo from '../assets/logo.png';

interface DragonIconProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

const DragonIcon: React.FC<DragonIconProps> = ({ size = 24, className, style }) => {
  return (
    <img 
      src={logo} 
      alt="Ancalagon Dragon Icon" 
      className={className}
      style={{
        width: size === 'auto' ? 'auto' : size,
        height: size === 'auto' ? 'auto' : size,
        display: 'inline-block',
        verticalAlign: 'middle',
        objectFit: 'contain',
        ...style
      }}
    />
  );
};

export default DragonIcon;
