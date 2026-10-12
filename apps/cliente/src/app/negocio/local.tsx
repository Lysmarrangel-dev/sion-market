import Ionicons from '@expo/vector-icons/Ionicons';
import type { RestaurantDetail } from '@sionmarket/contracts';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { formStyles } from '@/components/form';
import { MenuList, Row } from '@/components/menu-row';
import { NegocioHeader, NegocioScreen } from '@/components/negocio-gate';
import { formatUsd } from '@/components/price';
import { Text } from '@/components/text';
import { Colors, setTheme, theme } from '@/constants/theme';
import { auth } from '@/lib/api';
import { afterLogout } from '@/lib/auth-gate';
import { MODE_LABEL, useMode } from '@/lib/mode';
import { enableWebAlerts, testAlert, webAlertsState, type WebAlerts } from '@/lib/order-alert';

const ALERT_TEXT: Record<WebAlerts, string> = {
  granted: 'Activas: suena un aviso y te llega una notificación aunque estés en otra pestaña.',
  default: 'Actívalas para que el navegador te avise aunque estés en otra pestaña.',
  denied: 'El navegador las bloqueó. Permítelas desde el candado junto a la dirección de la página.',
  unsupported: 'Este navegador no muestra notificaciones; igual suena un aviso con la página abierta.',
};

function Local({ restaurant: r }: { restaurant: RestaurantDetail }) {
  const { modes, setMode } = useMode();
  const [alerts, setAlerts] = useState(webAlertsState());

  return (
    <>
      <NegocioHeader restaurant={r} title="Mi local" />
      <View style={formStyles.card}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          {r.logoUrl || r.imageUrl ? (
            <Image source={r.logoUrl ?? r.imageUrl} style={styles.logo} contentFit="cover" />
          ) : (
            <View style={[styles.logo, { alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="restaurant" size={24} color={Colors.orangeDeep} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text variant="heading">{r.name}</Text>
            <Text variant="caption">{r.tags.join(' · ') || r.category}</Text>
          </View>
        </View>
        <Info icon="location-outline" text={r.address} />
        <Info icon="time-outline" text={r.schedule} />
        <Info icon="bicycle-outline" text={`Entrega en ${r.etaMin}–${r.etaMax} min · delivery ${formatUsd(r.deliveryCents / 100)}`} />
        {r.minimumCents ? <Info icon="cash-outline" text={`Pedido mínimo ${formatUsd(r.minimumCents / 100)}`} /> : null}
        {r.promo ? <Info icon="pricetag-outline" text={r.promo} /> : null}
        <Button title="Editar datos del local" variant="outline" onPress={() => router.push({ pathname: '/panel/editar', params: { id: r.id } })} />
      </View>

      <View style={formStyles.card}>
        <Text variant="heading">Alertas de pedidos nuevos</Text>
        {Platform.OS === 'web' ? (
          <>
            <Text variant="caption">{ALERT_TEXT[alerts]}</Text>
            {alerts === 'default' ? <Button title="Activar alertas en este navegador" onPress={async () => setAlerts(await enableWebAlerts())} /> : null}
          </>
        ) : (
          <Text variant="caption">Con la app abierta suena un aviso y aparece una notificación en cuanto entra un pedido.</Text>
        )}
        <Button title="Probar el sonido" variant="ghost" onPress={testAlert} />
      </View>

      <MenuList>
        <Row icon="add-circle-outline" label="Registrar otro restaurante" onPress={() => router.push('/panel/editar')} />
        {modes
          .filter((m) => m !== 'restaurante')
          .map((m) => (
            <Row key={m} icon={m === 'admin' ? 'shield-checkmark-outline' : 'bag-handle-outline'} label={MODE_LABEL[m]} onPress={() => setMode(m)} />
          ))}
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
    </>
  );
}

function Info({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
      <Ionicons name={icon} size={18} color={Colors.textMuted} />
      <Text style={{ flex: 1 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { width: 56, height: 56, borderRadius: 14, backgroundColor: Colors.background },
});

export default function LocalScreen() {
  return <NegocioScreen>{(r) => <Local restaurant={r} />}</NegocioScreen>;
}
