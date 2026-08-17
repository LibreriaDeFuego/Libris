import React from 'react';
export interface EditorialCardProps {
  category: 'Guía' | 'Autor' | 'Curso';
  title: string;
  subtitle: string;
  image?: string;
}
