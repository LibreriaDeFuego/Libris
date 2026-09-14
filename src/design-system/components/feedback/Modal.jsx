import React from 'react';
import { createPortal } from 'react-dom';

// Antes esto se montaba como un `<div position:fixed>` más, adentro del
// árbol normal de la página — casi siempre alcanza, pero en el broche "+"
// de Tu camino (y en cualquier otro lugar anidado bien adentro de
// AppShell) el tab bar de abajo (`position: sticky`, su propio contexto de
// apilamiento) terminaba pintándose ENCIMA del modal, tapando buena parte
// del botón principal — "Publicar" quedaba como una tira naranja apenas
// asomando arriba del tab bar. `createPortal` saca este `<div>` entero del
// árbol de AppShell y lo cuelga directo de `document.body`: ya no importa
// en qué parte de la página se dispare el modal, ni qué contexto de
// apilamiento tenga alrededor — siempre pinta por encima de todo.
export function Modal({title, children, onClose}) {
  if (typeof document === 'undefined') return null;
  return createPortal(React.createElement('div', {
    style:{ position:'fixed', inset:0, background:'var(--surface-overlay)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:50 }
  },
    React.createElement('div', {
      style:{ background:'var(--surface-card)', borderRadius:'var(--radius-xl) var(--radius-xl) 0 0', width:'100%', maxWidth:480, maxHeight:'85vh', overflowY:'auto', padding:24, fontFamily:'var(--font-body)', boxShadow:'var(--shadow-lg)' }
    },
      React.createElement('div', {style:{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18}},
        React.createElement('div', {style:{fontFamily:'var(--font-display)', fontSize:'var(--fs-xl)', fontWeight:600, color:'var(--text-primary)'}}, title),
        React.createElement('button', {onClick:onClose, style:{background:'var(--surface-sunken)', border:'none', borderRadius:'var(--radius-round)', width:32, height:32, cursor:'pointer', color:'var(--text-secondary)', fontSize:16}}, '×')
      ),
      children
    )
  ), document.body);
}
