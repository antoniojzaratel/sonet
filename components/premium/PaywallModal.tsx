import { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/colors';
import {
  isPurchasesConfigured,
  getPremiumPackage,
  purchasePremium,
  restorePurchases,
  PREMIUM_PRICE_LABEL,
} from '@/lib/purchases';
import { track } from '@/lib/analytics';
import type { PurchasesPackage } from 'react-native-purchases';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPurchased: () => void;
}

export function PaywallModal({ visible, onClose, onPurchased }: Props) {
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!visible) return;
    track('premium_paywall_viewed');
    setLoading(true);
    getPremiumPackage()
      .then(setPkg)
      .finally(() => setLoading(false));
  }, [visible]);

  const handlePurchase = async () => {
    if (!pkg) return;
    setPurchasing(true);
    const success = await purchasePremium(pkg);
    setPurchasing(false);
    if (success) {
      onPurchased();
    } else {
      Alert.alert('No se pudo completar la compra', 'Intenta de nuevo en un momento.');
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const restored = await restorePurchases();
    setRestoring(false);
    if (restored) {
      onPurchased();
    } else {
      Alert.alert('Nada que restaurar', 'No encontramos una compra activa de Sonet Premium en esta cuenta.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>

          <LinearGradient colors={Colors.gradientNeon} style={styles.badge}>
            <Ionicons name="sparkles" size={18} color="#fff" />
            <Text style={styles.badgeText}>Sonet Premium</Text>
          </LinearGradient>

          <Text style={styles.title}>Crea tus propios eventos</Text>
          <Text style={styles.subtitle}>
            Listening parties, meetups y watch parties para tu comunidad.
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{PREMIUM_PRICE_LABEL}</Text>
          </View>

          {!isPurchasesConfigured ? (
            <View style={styles.notConfigured}>
              <Text style={styles.notConfiguredText}>
                Las compras aún no están configuradas en este proyecto (falta EXPO_PUBLIC_REVENUECAT_API_KEY).
                Esta es la pantalla real del paywall — solo falta conectar la cuenta de RevenueCat.
              </Text>
            </View>
          ) : loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.lg }} />
          ) : (
            <>
              <TouchableOpacity onPress={handlePurchase} disabled={!pkg || purchasing} activeOpacity={0.85}>
                <LinearGradient colors={Colors.gradientPrimary} style={styles.ctaButton}>
                  {purchasing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.ctaText}>{pkg ? 'Probar 7 días' : 'No disponible'}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.disclosure}>
                Se renueva automáticamente cada mes por {PREMIUM_PRICE_LABEL} salvo que canceles al menos 24 horas
                antes de que termine el periodo. Cancela cuando quieras desde los ajustes de tu cuenta de Apple o
                Google — no desde Sonet.
              </Text>

              <TouchableOpacity
                onPress={handleRestore}
                disabled={restoring}
                activeOpacity={0.7}
                style={styles.restoreBtn}
                accessibilityRole="button"
                accessibilityLabel="Restaurar compras"
              >
                {restoring ? (
                  <ActivityIndicator color={Colors.textSecondary} size="small" />
                ) : (
                  <Text style={styles.restoreText}>Restaurar compras</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: 40,
    alignItems: 'center',
  },
  closeBtn: { position: 'absolute', top: Spacing.md, right: Spacing.md, padding: 4 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginBottom: Spacing.lg,
  },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  title: { color: Colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  priceRow: { marginBottom: Spacing.lg },
  price: { color: Colors.primaryLight, fontSize: 20, fontWeight: '800' },
  ctaButton: { width: '100%', borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  notConfigured: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  notConfiguredText: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  disclosure: {
    color: Colors.textMuted,
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  restoreBtn: { marginTop: Spacing.sm, paddingVertical: 8, paddingHorizontal: 16 },
  restoreText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
});
