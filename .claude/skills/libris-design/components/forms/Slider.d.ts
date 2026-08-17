import React from 'react';
export interface SliderProps {
  value: number;
  max?: number;
  onChange?: (v: number) => void;
}
