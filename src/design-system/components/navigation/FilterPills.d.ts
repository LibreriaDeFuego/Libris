import React from 'react';
export interface FilterPillsProps {
  options: string[];
  active: string;
  onChange: (opt: string) => void;
}
