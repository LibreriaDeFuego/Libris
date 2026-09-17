import { PrivacidadScreen } from '@/screens/PrivacidadScreen.jsx';

export const metadata = { title: 'Privacidad · Libris' };

// Pública, sin sesión — a propósito: la ficha de Play Store/App Store la
// linkea directo, sin pasar por el login, y así tiene que quedar.
export default function Page() {
  return <PrivacidadScreen />;
}
