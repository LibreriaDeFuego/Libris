import React from 'react';
export function EditorialCard({category, title, subtitle, image}) {
  const catColor = {Guía:'var(--gold-500)', Autor:'var(--accent-500)', Curso:'var(--success)'}[category] || 'var(--gold-500)';
  return React.createElement('div', {
    style:{ background:'var(--surface-card)', borderRadius:'var(--radius-lg)', boxShadow:'var(--shadow-sm)', overflow:'hidden', fontFamily:'var(--font-body)' }
  },
    React.createElement('div', {style:{ height:110, backgroundImage: image ? `url(${image})` : 'linear-gradient(135deg, var(--neutral-200), var(--gold-300))', backgroundSize:'cover', backgroundPosition:'center' }}),
    React.createElement('div', {style:{padding:14}},
      React.createElement('div', {style:{fontSize:11, fontWeight:700, letterSpacing:'var(--ls-wide)', textTransform:'uppercase', color:catColor, marginBottom:6}}, category),
      React.createElement('div', {style:{fontFamily:'var(--font-display)', fontSize:'var(--fs-md)', fontWeight:600, color:'var(--text-primary)', marginBottom:4}}, title),
      React.createElement('div', {style:{fontSize:'var(--fs-xs)', color:'var(--text-secondary)'}}, subtitle)
    )
  );
}
