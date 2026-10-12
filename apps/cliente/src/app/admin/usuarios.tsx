import type { AdminUser, Role } from '@sionmarket/contracts';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Chips, FormError, formStyles } from '@/components/form';
import { PanelScreen } from '@/components/panel-screen';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { confirm } from '@/lib/confirm';
import { admin } from '@/lib/panel';
import { getSession } from '@/lib/api';

type Filter = 'todos' | Exclude<Role, 'cliente'>;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'todos', label: 'Todas' },
  { id: 'restaurante', label: 'Restaurantes' },
  { id: 'repartidor', label: 'Repartidores' },
  { id: 'admin', label: 'Admins' },
];

const ROLES: { id: Exclude<Role, 'cliente'>; label: string }[] = [
  { id: 'restaurante', label: 'Restaurante' },
  { id: 'repartidor', label: 'Repartidor' },
  { id: 'admin', label: 'Admin' },
];

export default function AdminUsuarios() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search as the admin types, a moment after they stop.
  useEffect(() => {
    const timer = setTimeout(() => {
      admin
        .users(query.trim(), filter === 'todos' ? undefined : filter)
        .then((list) => {
          setUsers(list);
          setError(null);
        })
        .catch((e) => setError(e.message));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, filter]);

  const toggle = async (u: AdminUser, role: Exclude<Role, 'cliente'>) => {
    const has = u.roles.includes(role);
    const who = u.email ?? u.phone ?? u.name ?? 'esta cuenta';
    if (role === 'admin' && !(await confirm(has ? 'Quitar admin' : 'Hacer admin', `${who} ${has ? 'dejará de' : 'podrá'} administrar toda la plataforma.`, has ? 'Quitar' : 'Dar acceso'))) return;
    const roles = has ? u.roles.filter((r) => r !== role) : [...u.roles, role];
    setUsers((l) => l?.map((x) => (x.id === u.id ? { ...x, roles } : x)) ?? l);
    try {
      await admin.setRoles(u.id, roles);
    } catch (e) {
      setUsers((l) => l?.map((x) => (x.id === u.id ? u : x)) ?? l);
      setError((e as Error).message);
    }
  };

  const me = getSession()?.user.id;

  return (
    <PanelScreen title="Cuentas y roles" back>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Correo, teléfono o nombre"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          style={styles.searchInput}
          accessibilityLabel="Buscar cuentas"
        />
      </View>
      <Chips options={FILTERS} value={filter} onChange={setFilter} />
      <Text variant="caption">Toca un rol para darlo o quitarlo. El cambio aplica en menos de un minuto.</Text>
      <FormError message={error} />
      {!users ? <ActivityIndicator color={Colors.orange} /> : null}
      {users && !users.length ? <Text variant="caption">Ninguna cuenta coincide.</Text> : null}
      {users?.map((u) => (
        <View key={u.id} style={formStyles.card}>
          <View>
            <Text variant="heading">
              {u.name || u.email || u.phone || 'Sin nombre'}
              {u.id === me ? ' (tú)' : ''}
            </Text>
            <Text variant="caption">{[u.email, u.phone].filter(Boolean).join(' · ') || 'Sin datos de contacto'}</Text>
            {u.restaurants.length ? <Text variant="caption">Dueño de {u.restaurants.map((r) => r.name).join(', ')}</Text> : null}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ROLES.map((r) => {
              const on = u.roles.includes(r.id);
              return (
                <Pressable
                  key={r.id}
                  onPress={() => toggle(u, r.id)}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: on }}
                  style={[styles.role, on && styles.roleOn]}>
                  <Ionicons name={on ? 'checkmark' : 'add'} size={16} color={on ? Colors.inkInverse : Colors.text} />
                  <Text variant="bodyStrong" style={{ fontSize: 14, color: on ? Colors.inkInverse : Colors.text }}>
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </PanelScreen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.surface,
  },
  searchInput: { flex: 1, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, height: '100%' },
  role: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.background,
  },
  roleOn: { backgroundColor: Colors.ink, borderColor: Colors.ink },
});
