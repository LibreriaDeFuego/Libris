import React from 'react';
import * as LucideIcons from 'lucide-react';

// Design system ships icon names in kebab-case (Lucide's CDN convention, e.g.
// "book-open"); lucide-react exports PascalCase components (BookOpen).
function toPascalCase(name) {
  return name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

// "fill" es opcional — por default los íconos de línea van sin relleno
// (fill="none" es lo que ya trae Lucide), pero el corazón de "Me gusta"
// marcado necesita ir relleno.
export function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 1.75, fill }) {
  const LucideIcon = LucideIcons[toPascalCase(name)];
  if (!LucideIcon) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`Icon: unknown lucide icon "${name}"`);
    }
    return React.createElement('span', { style: { width: size, height: size, display: 'inline-flex' } });
  }
  return React.createElement(LucideIcon, { size, color, strokeWidth, ...(fill && { fill }) });
}
