import React from 'react';
export interface IconButtonProps {
  children: React.ReactNode;
  size?: number;
  active?: boolean;
  onClick?: () => void;
}
