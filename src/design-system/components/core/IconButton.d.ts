import React from 'react';
export interface IconButtonProps {
  children: React.ReactNode;
  size?: number;
  active?: boolean;
  tone?: 'light' | 'glass';
  onClick?: () => void;
}
