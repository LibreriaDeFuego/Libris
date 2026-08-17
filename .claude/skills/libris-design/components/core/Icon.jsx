import React from 'react';
export function Icon({name, size=20, color='currentColor', strokeWidth=1.75}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (window.lucide && ref.current) {
      ref.current.innerHTML = '';
      const el = document.createElement('i');
      el.setAttribute('data-lucide', name);
      ref.current.appendChild(el);
      window.lucide.createIcons({ nameAttr: 'data-lucide' });
    }
  }, [name]);
  return React.createElement('span', { ref, style:{ width:size, height:size, display:'inline-flex', color, lineHeight:0 } });
}
