import Ionicons from "@expo/vector-icons/Ionicons";
import type { AdminRestaurant } from "@sionmarket/contracts";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";

import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Chips, FormError } from "@/components/form";
import { PanelScreen } from "@/components/panel-screen";
import { Text } from "@/components/text";
import { Colors, Fonts, Radius } from "@/constants/theme";
import { confirm } from "@/lib/confirm";
import { useLayout } from "@/lib/layout";
import { admin } from "@/lib/panel";

type Filter = "todos" | "activos" | "pausados" | "sin-dueno";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "activos", label: "Activos" },
  { id: "pausados", label: "Pausados" },
  { id: "sin-dueno", label: "Sin dueño" },
];

const keep = (r: AdminRestaurant, f: Filter) =>
  f === "todos" ||
  (f === "activos" ? r.enabled : f === "pausados" ? !r.enabled : !r.owner);

export default function AdminLocales() {
  const { wide } = useLayout();
  const [list, setList] = useState<AdminRestaurant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");

  const load = useCallback(() => {
    admin
      .restaurants()
      .then(setList)
      .catch((e) => setError(e.message));
  }, []);
  useFocusEffect(load);

  const toggle = async (r: AdminRestaurant, enabled: boolean) => {
    if (
      !enabled &&
      !(await confirm(
        "Pausar restaurante",
        `${r.name} dejará de verse en la app y no recibirá pedidos.`,
        "Pausar",
      ))
    )
      return;
    setList((l) => l?.map((x) => (x.id === r.id ? { ...x, enabled } : x)) ?? l);
    try {
      await admin.setEnabled(r.id, enabled);
    } catch (e) {
      setList(
        (l) =>
          l?.map((x) => (x.id === r.id ? { ...x, enabled: !enabled } : x)) ?? l,
      );
      setError((e as Error).message);
    }
  };

  const q = query.trim().toLowerCase();
  const shown = (list ?? []).filter(
    (r) =>
      keep(r, filter) &&
      (!q ||
        [r.name, r.zone, r.owner, r.category].some((v) =>
          v?.toLowerCase().includes(q),
        )),
  );

  return (
    <PanelScreen
      title="Locales"
      subtitle={
        list
          ? `${list.filter((r) => r.enabled).length} activos de ${list.length}`
          : "SionMarket"
      }
      wide
      right={
        <Button
          title="Nuevo"
          onPress={() => router.push("/panel/editar")}
          style={{ paddingHorizontal: 18 }}
        />
      }
    >
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por nombre, zona o dueño"
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
          accessibilityLabel="Buscar locales"
        />
      </View>
      <Chips options={FILTERS} value={filter} onChange={setFilter} />
      <FormError message={error} />
      {!list ? <ActivityIndicator color={Colors.orange} /> : null}
      {list && !shown.length ? (
        <Text variant="caption">Ningún local coincide.</Text>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {shown.map((r) => (
          // The switch sits beside the tappable area: on the web a tap on it would also open the local.
          <View
            key={r.id}
            style={[
              styles.card,
              { flexBasis: wide ? "48%" : "100%", flexGrow: 1 },
              !r.enabled && { opacity: 0.75 },
            ]}
          >
            <Pressable
              style={styles.open}
              onPress={() =>
                router.push({ pathname: "/admin/local", params: { id: r.id } })
              }
              accessibilityRole="link"
            >
              {r.logoUrl ? (
                <Image
                  source={r.logoUrl}
                  style={styles.logo}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={[
                    styles.logo,
                    { alignItems: "center", justifyContent: "center" },
                  ]}
                >
                  <Ionicons
                    name="restaurant"
                    size={22}
                    color={Colors.orangeDeep}
                  />
                </View>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="heading" numberOfLines={1}>
                  {r.name}
                </Text>
                <Text variant="caption" numberOfLines={1}>
                  {r.zone ?? "Fuera de zona"} · {r.orders30d} pedidos en 30 días
                </Text>
                <Text
                  variant="caption"
                  numberOfLines={1}
                  style={!r.owner && { color: Colors.danger }}
                >
                  {r.owner ? `Dueño: ${r.owner}` : "Sin dueño asignado"}
                </Text>
                <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                  <Badge on={r.enabled} yes="Activo" no="Pausado" />
                  {r.enabled ? (
                    <Badge on={r.open} yes="Abierto" no="Cerrado" soft />
                  ) : null}
                </View>
              </View>
            </Pressable>
            <Switch
              value={r.enabled}
              onValueChange={(v) => toggle(r, v)}
              accessibilityLabel={`${r.name} activo`}
              trackColor={{ true: Colors.success, false: Colors.line }}
              thumbColor={Colors.white}
            />
          </View>
        ))}
      </View>
    </PanelScreen>
  );
}

const styles = StyleSheet.create({
  open: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.surface,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.text,
    height: "100%",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.background,
  },
});
