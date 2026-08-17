import React from 'react';
export interface ChipProps {
  children: React.ReactNode;
  tone?: 'neutral' | 'gold';
  selected?: boolean;
  onClick?: () => void;
}
