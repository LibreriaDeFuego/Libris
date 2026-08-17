'use client';

import { signOut } from '@/app/login/actions';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';

export function SignOutButton() {
  return (
    <form action={signOut}>
      <IconButton aria-label="Cerrar sesión" type="submit">
        <Icon name="log-out" size={18} />
      </IconButton>
    </form>
  );
}
