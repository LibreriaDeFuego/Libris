import React from 'react';
export interface TabsProps {
  items: string[];
  active: string;
  onChange: (item: string) => void;
}
