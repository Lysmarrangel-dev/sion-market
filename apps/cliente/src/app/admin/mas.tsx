import { router } from 'expo-router';
import { Platform } from 'react-native';

import { MenuList, Row } from '@/components/menu-row';
import { PanelScreen } from '@/components/panel-screen';
import { Text } from '@/components/text';
import { setTheme, theme } from '@/constants/theme';
import { auth } from '@/lib/api';
import { afterLogout } from '@/lib/auth-gate';
import { MODE_LABEL, useMode } from '@/lib/mode';
import { useProfile } from '@/store/profile';

export default function AdminMas() {
  const { profile } = useProfile();
  const { modes, setMode } = useMode();
  return (
    <PanelScreen title="Más" subtitle={profile.email || profile.name}>
      <MenuList>
        <Row icon="people-outline" label="Cuentas y roles" detail="restaurantes, repartidores, admins" onPress={() => router.push('/admin/usuarios')} />
        <Row icon="mail-unread-outline" label="Solicitudes de comercios" detail="del formulario de la web" onPress={() => router.push('/admin/solicitudes')} />
        <Row icon="add-circle-outline" label="Registrar un restaurante" onPress={() => router.push('/panel/editar')} />
      </MenuList>
      <Text variant="label">Cambiar de vista</Text>
      <MenuList>
        {modes
          .filter((m) => m !== 'admin')
          .map((m) => (
            <Row key={m} icon={m === 'restaurante' ? 'storefront-outline' : 'bag-handle-outline'} label={MODE_LABEL[m]} onPress={() => setMode(m)} />
          ))}
      </MenuList>
      <MenuList>
        {Platform.OS === 'web' ? (
          <Row
            icon={theme === 'dark' ? 'sunny-outline' : 'moon-outline'}
            label={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
            onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
        ) : null}
        <Row
          icon="log-out-outline"
          label="Cerrar sesión"
          danger
          onPress={async () => {
            await auth.logout();
            afterLogout();
          }}
        />
      </MenuList>
    </PanelScreen>
  );
}
