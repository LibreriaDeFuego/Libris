/* @ds-bundle: {"format":4,"namespace":"LibrisDesignSystem_f40bc3","components":[{"name":"Blockquote","sourcePath":"components/content/Blockquote.jsx"},{"name":"BookCard","sourcePath":"components/content/BookCard.jsx"},{"name":"EditorialCard","sourcePath":"components/content/EditorialCard.jsx"},{"name":"SpoilerBlock","sourcePath":"components/content/SpoilerBlock.jsx"},{"name":"VoiceNotePlayer","sourcePath":"components/content/VoiceNotePlayer.jsx"},{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Chip","sourcePath":"components/core/Chip.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Modal","sourcePath":"components/feedback/Modal.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"ProgressBar","sourcePath":"components/forms/ProgressBar.jsx"},{"name":"Slider","sourcePath":"components/forms/Slider.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"FilterPills","sourcePath":"components/navigation/FilterPills.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/content/Blockquote.jsx":"2310288ffddb","components/content/BookCard.jsx":"222a5700af6a","components/content/EditorialCard.jsx":"280d24a8ad7a","components/content/SpoilerBlock.jsx":"fbba4484068c","components/content/VoiceNotePlayer.jsx":"41ab0667dabe","components/core/Avatar.jsx":"ea22a7c69777","components/core/Badge.jsx":"8facfa102190","components/core/Button.jsx":"67445bad3c03","components/core/Chip.jsx":"c6db5aef5a03","components/core/Icon.jsx":"87ce83a21768","components/core/IconButton.jsx":"ee546878a66c","components/feedback/Modal.jsx":"86502dcea7c9","components/forms/Input.jsx":"6f7a418422fd","components/forms/ProgressBar.jsx":"160c1eaad493","components/forms/Slider.jsx":"8401d2674c85","components/forms/Textarea.jsx":"8ae8fd38a830","components/navigation/FilterPills.jsx":"5c2b698f8b20","components/navigation/Tabs.jsx":"4894be8c4485","ui_kits/circulo/ClubDetail.jsx":"939f30a3bd0d","ui_kits/circulo/CommentsFeed.jsx":"4dfd947f0d7c","ui_kits/circulo/Discover.jsx":"128e2309c6c3","ui_kits/circulo/NewsFeed.jsx":"742d288e6281","ui_kits/circulo/UpdateProgressModal.jsx":"8e8953d0b997"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.LibrisDesignSystem_f40bc3 = window.LibrisDesignSystem_f40bc3 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/content/Blockquote.jsx
try { (() => {
function Blockquote({
  children,
  attribution
}) {
  return React.createElement('div', {
    style: {
      borderRadius: 'var(--radius-md)',
      background: 'var(--gold-100)',
      padding: '16px 20px',
      fontFamily: 'var(--font-display)'
    }
  }, React.createElement('div', {
    style: {
      fontSize: 'var(--fs-lg)',
      fontStyle: 'italic',
      color: 'var(--neutral-900)',
      lineHeight: 'var(--lh-snug)'
    }
  }, `"${children}"`), attribution && React.createElement('div', {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--fs-xs)',
      color: 'var(--gold-700)',
      marginTop: 8,
      fontWeight: 600
    }
  }, attribution));
}
Object.assign(__ds_scope, { Blockquote });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/Blockquote.jsx", error: String((e && e.message) || e) }); }

// components/content/BookCard.jsx
try { (() => {
function BookCard({
  title,
  club,
  chapterLabel,
  progress,
  cover
}) {
  return React.createElement('div', {
    style: {
      background: 'var(--neutral-900)',
      color: '#fff',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-md)',
      padding: 16,
      display: 'flex',
      gap: 14,
      fontFamily: 'var(--font-body)'
    }
  }, React.createElement('div', {
    style: {
      width: 64,
      height: 92,
      borderRadius: 'var(--radius-sm)',
      flexShrink: 0,
      background: cover ? `center/cover no-repeat url(${cover})` : 'var(--accent-500)'
    }
  }), React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 4,
      minWidth: 0
    }
  }, React.createElement('div', {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-lg)',
      fontWeight: 700,
      color: '#fff'
    }
  }, title), React.createElement('div', {
    style: {
      fontSize: 'var(--fs-xs)',
      color: '#aaa'
    }
  }, club), React.createElement('div', {
    style: {
      fontSize: 'var(--fs-2xs)',
      color: 'var(--accent-500)',
      fontWeight: 700,
      marginTop: 2
    }
  }, `${chapterLabel} · ${progress}%`)));
}
Object.assign(__ds_scope, { BookCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/BookCard.jsx", error: String((e && e.message) || e) }); }

// components/content/EditorialCard.jsx
try { (() => {
function EditorialCard({
  category,
  title,
  subtitle,
  image
}) {
  const catColor = {
    Guía: 'var(--gold-500)',
    Autor: 'var(--accent-500)',
    Curso: 'var(--success)'
  }[category] || 'var(--gold-500)';
  return React.createElement('div', {
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
      fontFamily: 'var(--font-body)'
    }
  }, React.createElement('div', {
    style: {
      height: 110,
      backgroundImage: image ? `url(${image})` : 'linear-gradient(135deg, var(--neutral-200), var(--gold-300))',
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }
  }), React.createElement('div', {
    style: {
      padding: 14
    }
  }, React.createElement('div', {
    style: {
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 'var(--ls-wide)',
      textTransform: 'uppercase',
      color: catColor,
      marginBottom: 6
    }
  }, category), React.createElement('div', {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-md)',
      fontWeight: 600,
      color: 'var(--text-primary)',
      marginBottom: 4
    }
  }, title), React.createElement('div', {
    style: {
      fontSize: 'var(--fs-xs)',
      color: 'var(--text-secondary)'
    }
  }, subtitle)));
}
Object.assign(__ds_scope, { EditorialCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/EditorialCard.jsx", error: String((e && e.message) || e) }); }

// components/content/VoiceNotePlayer.jsx
try { (() => {
function VoiceNotePlayer({
  duration = '0:42',
  transcript
}) {
  const [open, setOpen] = React.useState(false);
  return React.createElement('div', {
    style: {
      background: 'var(--surface-card-alt)',
      borderRadius: 'var(--radius-md)',
      padding: 12,
      fontFamily: 'var(--font-body)'
    }
  }, React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, React.createElement('button', {
    onClick: () => {},
    style: {
      width: 34,
      height: 34,
      borderRadius: 'var(--radius-round)',
      background: 'var(--accent-500)',
      color: '#fff',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      flexShrink: 0
    }
  }, React.createElement('span', {
    style: {
      width: 0,
      height: 0,
      borderTop: '6px solid transparent',
      borderBottom: '6px solid transparent',
      borderLeft: '9px solid #fff',
      marginLeft: 2
    }
  })), React.createElement('div', {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      height: 20
    }
  }, Array.from({
    length: 24
  }).map((_, i) => React.createElement('div', {
    key: i,
    style: {
      width: 2,
      borderRadius: 1,
      background: 'var(--neutral-300)',
      height: 6 + i * 37 % 14
    }
  }))), React.createElement('span', {
    style: {
      fontSize: 'var(--fs-2xs)',
      color: 'var(--text-tertiary)'
    }
  }, duration)), transcript && React.createElement('button', {
    onClick: () => setOpen(!open),
    style: {
      background: 'none',
      border: 'none',
      color: 'var(--text-link)',
      fontSize: 'var(--fs-2xs)',
      padding: 0,
      marginTop: 8,
      cursor: 'pointer',
      fontWeight: 600
    }
  }, open ? 'Ocultar transcripción' : 'Ver transcripción'), open && transcript && React.createElement('p', {
    style: {
      fontSize: 'var(--fs-sm)',
      color: 'var(--text-secondary)',
      marginTop: 6,
      lineHeight: 'var(--lh-normal)'
    }
  }, transcript));
}
Object.assign(__ds_scope, { VoiceNotePlayer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/VoiceNotePlayer.jsx", error: String((e && e.message) || e) }); }

// components/core/Avatar.jsx
try { (() => {
function Avatar({
  name = '',
  src,
  size = 40
}) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const palette = ['var(--accent-500)', 'var(--gold-500)', 'var(--success)', 'var(--neutral-600)'];
  const idx = name.length % palette.length;
  return src ? React.createElement('img', {
    src,
    alt: name,
    style: {
      width: size,
      height: size,
      borderRadius: 'var(--radius-round)',
      objectFit: 'cover'
    }
  }) : React.createElement('div', {
    style: {
      width: size,
      height: size,
      borderRadius: 'var(--radius-round)',
      background: palette[idx],
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: size * 0.38
    }
  }, initials);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function Badge({
  children,
  tone = 'accent'
}) {
  const tones = {
    accent: {
      bg: 'var(--accent-500)',
      fg: '#fff'
    },
    gold: {
      bg: 'var(--gold-500)',
      fg: '#fff'
    },
    neutral: {
      bg: 'var(--neutral-200)',
      fg: 'var(--text-primary)'
    }
  };
  const t = tones[tone];
  return React.createElement('span', {
    style: {
      background: t.bg,
      color: t.fg,
      borderRadius: 'var(--radius-pill)',
      padding: '2px 9px',
      fontFamily: 'var(--font-body)',
      fontSize: '11px',
      fontWeight: 'var(--fw-semibold)',
      letterSpacing: 'var(--ls-wide)',
      textTransform: 'uppercase'
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function Button({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  disabled = false,
  ...rest
}) {
  const sizes = {
    sm: {
      padding: '8px 14px',
      fontSize: 'var(--fs-sm)'
    },
    md: {
      padding: '11px 20px',
      fontSize: 'var(--fs-base)'
    },
    lg: {
      padding: '14px 26px',
      fontSize: 'var(--fs-md)'
    }
  };
  const variants = {
    primary: {
      background: 'var(--accent-500)',
      color: 'var(--text-on-accent)',
      border: '1px solid transparent'
    },
    secondary: {
      background: 'var(--surface-card)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-default)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--accent-600)',
      border: '1px solid transparent'
    }
  };
  const base = {
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--fw-semibold)',
    borderRadius: 'var(--radius-pill)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'transform var(--duration-fast) var(--ease-standard), opacity var(--duration-fast)'
  };
  return React.createElement('button', {
    disabled,
    ...rest,
    style: {
      ...base,
      ...sizes[size],
      ...variants[variant]
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = 'scale(0.97)';
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = 'scale(1)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = 'scale(1)';
    }
  }, icon, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Chip.jsx
try { (() => {
function Chip({
  children,
  tone = 'neutral',
  selected = false,
  onClick
}) {
  const tones = {
    neutral: {
      bg: selected ? 'var(--accent-500)' : 'var(--surface-card)',
      fg: selected ? 'var(--text-on-accent)' : 'var(--text-secondary)',
      border: selected ? 'transparent' : 'var(--border-default)'
    },
    gold: {
      bg: 'var(--gold-100)',
      fg: 'var(--gold-700)',
      border: 'transparent'
    }
  };
  const t = tones[tone];
  return React.createElement('button', {
    onClick,
    style: {
      background: t.bg,
      color: t.fg,
      border: `1px solid ${t.border}`,
      borderRadius: 'var(--radius-pill)',
      padding: '6px 14px',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--fs-xs)',
      fontWeight: 'var(--fw-medium)',
      cursor: onClick ? 'pointer' : 'default',
      whiteSpace: 'nowrap'
    }
  }, children);
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Chip.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function Icon({
  name,
  size = 20,
  color = 'currentColor',
  strokeWidth = 1.75
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (window.lucide && ref.current) {
      ref.current.innerHTML = '';
      const el = document.createElement('i');
      el.setAttribute('data-lucide', name);
      ref.current.appendChild(el);
      window.lucide.createIcons({
        nameAttr: 'data-lucide'
      });
    }
  }, [name]);
  return React.createElement('span', {
    ref,
    style: {
      width: size,
      height: size,
      display: 'inline-flex',
      color,
      lineHeight: 0
    }
  });
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/content/SpoilerBlock.jsx
try { (() => {
function SpoilerBlock({
  children
}) {
  const [revealed, setRevealed] = React.useState(false);
  if (revealed) return React.createElement('div', {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--fs-base)',
      color: 'var(--text-primary)',
      lineHeight: 'var(--lh-normal)'
    }
  }, children);
  return React.createElement('button', {
    onClick: () => setRevealed(true),
    style: {
      width: '100%',
      textAlign: 'left',
      background: 'var(--surface-sunken)',
      border: '1px dashed var(--border-strong)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 16px',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--fs-sm)',
      color: 'var(--text-secondary)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, React.createElement(__ds_scope.Icon, {
    name: 'eye-off',
    size: 16
  }), 'Este comentario tiene spoiler · toca para ver');
}
Object.assign(__ds_scope, { SpoilerBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/SpoilerBlock.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function IconButton({
  children,
  size = 40,
  active = false,
  ...rest
}) {
  return React.createElement('button', {
    ...rest,
    style: {
      width: size,
      height: size,
      borderRadius: 'var(--radius-round)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: active ? '1px solid var(--accent-500)' : '1px solid var(--border-default)',
      background: active ? 'var(--accent-50)' : 'var(--surface-card)',
      color: active ? 'var(--accent-600)' : 'var(--text-secondary)',
      cursor: 'pointer',
      transition: 'background var(--duration-fast)'
    }
  }, children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Modal.jsx
try { (() => {
function Modal({
  title,
  children,
  onClose
}) {
  return React.createElement('div', {
    style: {
      position: 'fixed',
      inset: 0,
      background: 'var(--surface-overlay)',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      zIndex: 50
    }
  }, React.createElement('div', {
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
      width: '100%',
      maxWidth: 480,
      maxHeight: '85vh',
      overflowY: 'auto',
      padding: 24,
      fontFamily: 'var(--font-body)',
      boxShadow: 'var(--shadow-lg)'
    }
  }, React.createElement('div', {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 18
    }
  }, React.createElement('div', {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-xl)',
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, title), React.createElement('button', {
    onClick: onClose,
    style: {
      background: 'var(--surface-sunken)',
      border: 'none',
      borderRadius: 'var(--radius-round)',
      width: 32,
      height: 32,
      cursor: 'pointer',
      color: 'var(--text-secondary)',
      fontSize: 16
    }
  }, '×')), children));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Modal.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function Input({
  placeholder,
  value,
  onChange,
  ...rest
}) {
  return React.createElement('input', {
    placeholder,
    value,
    onChange,
    ...rest,
    style: {
      width: '100%',
      padding: '12px 16px',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-default)',
      background: 'var(--surface-card)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--fs-base)',
      outline: 'none'
    },
    onFocus: e => {
      e.currentTarget.style.borderColor = 'var(--accent-500)';
    },
    onBlur: e => {
      e.currentTarget.style.borderColor = 'var(--border-default)';
    }
  });
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/ProgressBar.jsx
try { (() => {
function ProgressBar({
  value = 0,
  label
}) {
  return React.createElement('div', null, label && React.createElement('div', {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 'var(--fs-xs)',
      color: 'var(--text-secondary)',
      marginBottom: 6,
      fontFamily: 'var(--font-body)'
    }
  }, React.createElement('span', null, label), React.createElement('span', null, `${value}%`)), React.createElement('div', {
    style: {
      height: 8,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--surface-sunken)',
      overflow: 'hidden'
    }
  }, React.createElement('div', {
    style: {
      width: `${value}%`,
      height: '100%',
      background: 'var(--accent-500)',
      borderRadius: 'var(--radius-pill)',
      transition: 'width var(--duration-base) var(--ease-standard)'
    }
  })));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/forms/Slider.jsx
try { (() => {
function Slider({
  value = 0,
  max = 100,
  onChange
}) {
  return React.createElement('input', {
    type: 'range',
    min: 0,
    max,
    value,
    onChange: e => onChange && onChange(Number(e.target.value)),
    style: {
      width: '100%',
      accentColor: 'var(--accent-500)',
      height: 6,
      borderRadius: 'var(--radius-pill)'
    }
  });
}
Object.assign(__ds_scope, { Slider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Slider.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function Textarea({
  placeholder,
  value,
  onChange,
  rows = 3,
  ...rest
}) {
  return React.createElement('textarea', {
    placeholder,
    value,
    onChange,
    rows,
    ...rest,
    style: {
      width: '100%',
      padding: '12px 16px',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-default)',
      background: 'var(--surface-card)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--fs-base)',
      outline: 'none',
      resize: 'vertical',
      lineHeight: 'var(--lh-normal)'
    },
    onFocus: e => {
      e.currentTarget.style.borderColor = 'var(--accent-500)';
    },
    onBlur: e => {
      e.currentTarget.style.borderColor = 'var(--border-default)';
    }
  });
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/navigation/FilterPills.jsx
try { (() => {
function FilterPills({
  options,
  active,
  onChange
}) {
  return React.createElement('div', {
    style: {
      display: 'flex',
      gap: 8,
      fontFamily: 'var(--font-body)'
    }
  }, options.map(opt => React.createElement('button', {
    key: opt,
    onClick: () => onChange(opt),
    style: {
      padding: '7px 16px',
      borderRadius: 'var(--radius-pill)',
      border: opt === active ? '1px solid transparent' : '1px solid var(--border-default)',
      background: opt === active ? 'var(--accent-500)' : 'var(--surface-card)',
      color: opt === active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
      fontSize: 'var(--fs-sm)',
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, opt)));
}
Object.assign(__ds_scope, { FilterPills });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/FilterPills.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function Tabs({
  items,
  active,
  onChange
}) {
  return React.createElement('div', {
    style: {
      display: 'flex',
      gap: 24,
      borderBottom: '1px solid var(--border-subtle)',
      fontFamily: 'var(--font-body)'
    }
  }, items.map(item => React.createElement('button', {
    key: item,
    onClick: () => onChange(item),
    style: {
      background: 'none',
      border: 'none',
      padding: '10px 2px',
      cursor: 'pointer',
      fontSize: 'var(--fs-base)',
      fontWeight: item === active ? 700 : 500,
      color: item === active ? 'var(--text-primary)' : 'var(--text-tertiary)',
      borderBottom: item === active ? '2px solid var(--accent-500)' : '2px solid transparent',
      marginBottom: -1
    }
  }, item)));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/circulo/ClubDetail.jsx
try { (() => {
function ClubDetail({
  onUpdateProgress,
  onOpenComments
}) {
  const {
    BookCard,
    Button,
    IconButton,
    Icon,
    Avatar
  } = window.LibrisDesignSystem_f40bc3;
  const previews = [{
    type: 'text',
    name: 'Julián Pérez',
    time: 'hace 1 h',
    body: 'La parte del faro me dejó pensando toda la noche.'
  }, {
    type: 'quote',
    name: 'Martina Solís',
    time: 'hace 2 h',
    body: '"Un libro que se lee de un tirón."'
  }, {
    type: 'voice',
    name: 'Cande Ibarra',
    time: 'hace 4 h',
    body: '0:38'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      padding: '20px 18px 100px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-xl)',
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, "Letras en Vela"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--fs-xs)',
      color: 'var(--text-secondary)'
    }
  }, "Club privado \xB7 14 miembros")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(IconButton, null, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 18
  })), /*#__PURE__*/React.createElement(IconButton, null, /*#__PURE__*/React.createElement(Icon, {
    name: "share-2",
    size: 18
  })))), /*#__PURE__*/React.createElement(BookCard, {
    title: "Rayuela",
    club: "Julio Cort\xE1zar",
    chapterLabel: "Cap. 14 de 20",
    progress: 68
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "md",
    onClick: onUpdateProgress
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "book-open",
    size: 16
  }), "Actualizar progreso")), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "md",
    onClick: onOpenComments
  }, "Comentarios")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--success)',
      borderRadius: 'var(--radius-lg)',
      padding: 14,
      display: 'flex',
      gap: 12,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex'
    }
  }, ['Sol', 'Bea', 'Nico'].map((n, i) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      marginLeft: i > 0 ? -10 : 0,
      border: '2px solid var(--success)',
      borderRadius: '50%'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: n,
    size: 30
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--fs-xs)',
      color: '#fff',
      fontWeight: 600,
      lineHeight: 'var(--lh-snug)'
    }
  }, "3 clubes m\xE1s est\xE1n leyendo Rayuela esta semana")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-lg)',
      fontWeight: 600,
      color: 'var(--text-primary)',
      marginBottom: 12
    }
  }, "Impresiones recientes"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, previews.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-md)',
      padding: 12,
      display: 'flex',
      gap: 10,
      boxShadow: 'var(--shadow-sm)'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: p.name,
    size: 34
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--fs-xs)',
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, p.name, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      color: 'var(--text-tertiary)'
    }
  }, "\xB7 ", p.time)), p.type === 'voice' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
      color: 'var(--text-secondary)',
      fontSize: 'var(--fs-xs)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "mic",
    size: 14
  }), "Nota de voz \xB7 ", p.body) : /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--fs-sm)',
      color: p.type === 'quote' ? 'var(--gold-700)' : 'var(--text-secondary)',
      fontStyle: p.type === 'quote' ? 'italic' : 'normal',
      marginTop: 2
    }
  }, p.body)))))));
}
window.ClubDetail = ClubDetail;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/circulo/ClubDetail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/circulo/CommentsFeed.jsx
try { (() => {
function CommentsFeed({
  onBack
}) {
  const {
    IconButton,
    Icon,
    Avatar,
    Blockquote,
    VoiceNotePlayer,
    SpoilerBlock
  } = window.LibrisDesignSystem_f40bc3;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      padding: '20px 18px 100px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    onClick: onBack
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-xl)',
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, "Comentarios")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Juli\xE1n P\xE9rez",
    size: 36
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--fs-xs)',
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, "Juli\xE1n P\xE9rez ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      color: 'var(--text-tertiary)'
    }
  }, "\xB7 Cap. 13 \xB7 hace 1 h")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--fs-base)',
      color: 'var(--text-primary)',
      lineHeight: 'var(--lh-normal)',
      margin: '4px 0 0'
    }
  }, "La parte del faro me dej\xF3 pensando toda la noche. No esperaba que Elena tomara esa decisi\xF3n."))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Martina Sol\xEDs",
    size: 36
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--fs-xs)',
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, "Martina Sol\xEDs ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      color: 'var(--text-tertiary)'
    }
  }, "\xB7 Cap. 14 \xB7 hace 2 h")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(Blockquote, null, "Un libro que se lee de un tir\xF3n.")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Cande Ibarra",
    size: 36
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--fs-xs)',
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, "Cande Ibarra ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      color: 'var(--text-tertiary)'
    }
  }, "\xB7 Cap. 14 \xB7 hace 4 h")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(VoiceNotePlayer, {
    duration: "0:38",
    transcript: "Che, este cap\xEDtulo me vol\xF3 la cabeza, sobre todo el final con Elena en el muelle."
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Nico Duarte",
    size: 36
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--fs-xs)',
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, "Nico Duarte ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      color: 'var(--text-tertiary)'
    }
  }, "\xB7 Cap. 16 \xB7 hace 5 h")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(SpoilerBlock, null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "Al final del cap\xEDtulo 16, el faro se derrumba y Elena decide quedarse en el pueblo."))))));
}
window.CommentsFeed = CommentsFeed;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/circulo/CommentsFeed.jsx", error: String((e && e.message) || e) }); }

// ui_kits/circulo/Discover.jsx
try { (() => {
function Discover() {
  const {
    Tabs,
    EditorialCard
  } = window.LibrisDesignSystem_f40bc3;
  const [tab, setTab] = React.useState('Guías');
  const items = {
    'Guías': [{
      title: 'Cómo armar un club de lectura',
      subtitle: '8 pasos para empezar bien'
    }, {
      title: 'Manejar spoilers sin pelear',
      subtitle: 'Reglas simples para el grupo'
    }],
    'Autores': [{
      title: 'Julio Cortázar',
      subtitle: 'Modera el club "Rayuela en voz alta"'
    }, {
      title: 'Samanta Schweblin',
      subtitle: 'Lee junto a 3 clubes esta temporada'
    }],
    'Cursos': [{
      title: 'Taller de lectura crítica',
      subtitle: '4 semanas · con certificado'
    }, {
      title: 'Cómo escribir reseñas',
      subtitle: 'Curso corto · 3 clases'
    }]
  };
  const cat = {
    'Guías': 'Guía',
    'Autores': 'Autor',
    'Cursos': 'Curso'
  }[tab];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      padding: '20px 18px 100px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-xl)',
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, "Descubrir"), /*#__PURE__*/React.createElement(Tabs, {
    items: ['Guías', 'Autores', 'Cursos'],
    active: tab,
    onChange: setTab
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12
    }
  }, items[tab].map((it, i) => /*#__PURE__*/React.createElement(EditorialCard, {
    key: i,
    category: cat,
    title: it.title,
    subtitle: it.subtitle
  }))));
}
window.Discover = Discover;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/circulo/Discover.jsx", error: String((e && e.message) || e) }); }

// ui_kits/circulo/NewsFeed.jsx
try { (() => {
function NewsFeed() {
  const {
    FilterPills,
    Icon,
    Avatar
  } = window.LibrisDesignSystem_f40bc3;
  const [filter, setFilter] = React.useState('Mis clubes');
  const events = [{
    icon: 'check-circle-2',
    color: 'var(--success)',
    title: 'Letras en Vela terminó "Los detectives salvajes"',
    time: 'hoy',
    club: 'Mis clubes'
  }, {
    icon: 'message-circle',
    color: 'var(--accent-500)',
    title: 'Martina comentó en Rayuela',
    time: 'hace 2 h',
    club: 'Mis clubes'
  }, {
    icon: 'users',
    color: 'var(--gold-500)',
    title: 'Café y Páginas también empezó Rayuela',
    time: 'hace 5 h',
    club: 'Otros clubes'
  }, {
    icon: 'sparkles',
    color: 'var(--gold-500)',
    title: 'Nueva guía: "Cómo armar un club de lectura"',
    time: 'ayer',
    club: 'Otros clubes'
  }, {
    icon: 'book-open',
    color: 'var(--accent-500)',
    title: 'Julián actualizó su progreso a Cap. 13',
    time: 'ayer',
    club: 'Mis clubes'
  }];
  const filtered = events.filter(e => e.club === filter);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      padding: '20px 18px 100px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-xl)',
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, "Novedades"), /*#__PURE__*/React.createElement(FilterPills, {
    options: ['Mis clubes', 'Otros clubes'],
    active: filter,
    onChange: setFilter
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, filtered.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-md)',
      padding: 14,
      boxShadow: 'var(--shadow-sm)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: '50%',
      background: 'var(--surface-sunken)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: e.color,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: e.icon,
    size: 16,
    color: e.color
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--fs-sm)',
      color: 'var(--text-primary)',
      lineHeight: 'var(--lh-snug)'
    }
  }, e.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--fs-2xs)',
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, e.time)))), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-tertiary)',
      fontSize: 'var(--fs-sm)',
      padding: '20px 0',
      textAlign: 'center'
    }
  }, "Sin novedades por ahora.")));
}
window.NewsFeed = NewsFeed;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/circulo/NewsFeed.jsx", error: String((e && e.message) || e) }); }

// ui_kits/circulo/UpdateProgressModal.jsx
try { (() => {
function UpdateProgressModal({
  onClose
}) {
  const {
    Modal,
    Chip,
    Slider,
    Input,
    Textarea,
    Button,
    Icon
  } = window.LibrisDesignSystem_f40bc3;
  const [chapter, setChapter] = React.useState('Cap. 14');
  const [progress, setProgress] = React.useState(55);
  const [reaction, setReaction] = React.useState(null);
  const chapters = ['Cap. 12', 'Cap. 13', 'Cap. 14', 'Cap. 15'];
  return /*#__PURE__*/React.createElement(Modal, {
    title: "Actualizar progreso",
    onClose: onClose
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--fs-xs)',
      color: 'var(--text-secondary)',
      marginBottom: 8,
      fontWeight: 600
    }
  }, "Cap\xEDtulo"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, chapters.map(c => /*#__PURE__*/React.createElement(Chip, {
    key: c,
    selected: c === chapter,
    onClick: () => setChapter(c)
  }, c)), /*#__PURE__*/React.createElement(Chip, {
    onClick: () => {}
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }), " Nuevo"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 'var(--fs-xs)',
      color: 'var(--text-secondary)',
      marginBottom: 8,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement("span", null, "Avance en el cap\xEDtulo"), /*#__PURE__*/React.createElement("span", null, progress, "%")), /*#__PURE__*/React.createElement(Slider, {
    value: progress,
    onChange: setProgress
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--fs-xs)',
      color: 'var(--text-secondary)',
      marginBottom: 8,
      fontWeight: 600
    }
  }, "\xBFC\xF3mo estuvo?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Chip, {
    selected: reaction === 'great',
    onClick: () => setReaction('great')
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "thumbs-up",
    size: 13
  }), " Genial cap\xEDtulo"), /*#__PURE__*/React.createElement(Chip, {
    selected: reaction === 'slow',
    onClick: () => setReaction('slow')
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "thumbs-down",
    size: 13
  }), " Cap\xEDtulo lento"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--fs-xs)',
      color: 'var(--text-secondary)',
      marginBottom: 8,
      fontWeight: 600
    }
  }, "Cita destacada"), /*#__PURE__*/React.createElement(Input, {
    placeholder: "Escribe una cita destacada..."
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--fs-xs)',
      color: 'var(--text-secondary)',
      marginBottom: 8,
      fontWeight: 600
    }
  }, "Nota (opcional)"), /*#__PURE__*/React.createElement(Textarea, {
    placeholder: "\xBFQu\xE9 te pareci\xF3 este tramo del libro?"
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: onClose
  }, "Guardar progreso")));
}
window.UpdateProgressModal = UpdateProgressModal;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/circulo/UpdateProgressModal.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Blockquote = __ds_scope.Blockquote;

__ds_ns.BookCard = __ds_scope.BookCard;

__ds_ns.EditorialCard = __ds_scope.EditorialCard;

__ds_ns.SpoilerBlock = __ds_scope.SpoilerBlock;

__ds_ns.VoiceNotePlayer = __ds_scope.VoiceNotePlayer;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.Slider = __ds_scope.Slider;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.FilterPills = __ds_scope.FilterPills;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
