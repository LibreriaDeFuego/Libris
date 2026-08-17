import React from 'react';
export interface BookCardProps {
  title: string;
  club: string;
  chapterLabel: string;
  progress: number;
  cover?: string;
}
