import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useGetVendor } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { formatCents, vendorStatusLabel } from '@/utils/format';
import { StatusBadge } from '@/components/StatusBadge';
import { BottomSheet } from '@/components/BottomSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  weddingId: number;
  vendorId: number | null;
  currency?: string;
}

export function VendorDetailSheet({ visible, onClose, weddingId, vendorId, currency = 'EUR' }: Props) {
  const colors = useColors();
  const { data: vendor, isLoading } = useGetVendor(weddingId, vendorId ?? 0);

  const av = vendor?.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) ?? '';
  const { label, tone } = vendor ? vendorStatusLabel(vendor.status) : { label: '', tone: 'neutral' as const };

  const remaining = vendor
    ? vendor.totalAmountCents - (vendor.depositAmountCents ?? 0)
    : 0;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      eyebrow="PRESTATAIRE"
      title={vendor?.name ?? ''}
    >
      {isLoading || !vendor ? (
        <View style={ss.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <View style={ss.body}>
          {/* Avatar + status row */}
          <View style={[ss.heroRow, { borderBottomColor: colors.border }]}>
            <View style={[ss.av, { backgroundColor: colors.goldLight }]}>
              <Text style={[ss.avText, { fontFamily: SERIF, color: colors.navy }]}>{av}</Text>
            </View>
            <View style={ss.heroInfo}>
              <Text style={[ss.category, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>
                {vendor.category}
              </Text>
            </View>
            <StatusBadge label={label} tone={tone} />
          </View>

          {/* Financial summary */}
          <View style={[ss.financialRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <FinancialBlock
              label="Montant total"
              value={formatCents(vendor.totalAmountCents, currency)}
              highlight
              colors={colors}
            />
            <View style={[ss.divider, { backgroundColor: colors.border }]} />
            <FinancialBlock
              label="Acompte versé"
              value={vendor.depositAmountCents != null
                ? formatCents(vendor.depositAmountCents, currency)
                : '—'}
              colors={colors}
            />
            <View style={[ss.divider, { backgroundColor: colors.border }]} />
            <FinancialBlock
              label="Solde restant"
              value={vendor.depositAmountCents != null ? formatCents(remaining, currency) : '—'}
              colors={colors}
            />
          </View>

          {/* Contact */}
          {(vendor.contactName || vendor.contactEmail) && (
            <Section title="CONTACT" colors={colors}>
              {vendor.contactName ? (
                <InfoRow icon="user" label="Nom" value={vendor.contactName} colors={colors} />
              ) : null}
              {vendor.contactEmail ? (
                <InfoRow
                  icon="mail"
                  label="Email"
                  value={vendor.contactEmail}
                  onPress={() => Linking.openURL(`mailto:${vendor.contactEmail}`)}
                  colors={colors}
                  actionable
                />
              ) : null}
            </Section>
          )}

          {/* Notes */}
          {vendor.notes ? (
            <Section title="NOTES" colors={colors}>
              <View style={[ss.noteBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[ss.noteText, { fontFamily: SANS, color: colors.foreground }]}>
                  {vendor.notes}
                </Text>
              </View>
            </Section>
          ) : null}

          {/* Footer date */}
          <Text style={[ss.added, { fontFamily: SANS, color: colors.tertiaryText }]}>
            Ajouté le {new Date(vendor.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>
      )}
    </BottomSheet>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={ss.section}>
      <Text style={[ss.sectionTitle, { fontFamily: SANS_SEMIBOLD, color: colors.goldDim }]}>{title}</Text>
      <View style={[ss.sectionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function InfoRow({ icon, label, value, onPress, actionable, colors }: {
  icon: string; label: string; value: string; onPress?: () => void;
  actionable?: boolean; colors: ReturnType<typeof useColors>;
}) {
  const content = (
    <View style={[ss.infoRow, { borderBottomColor: colors.border }]}>
      <Feather name={icon as any} size={14} color={colors.mutedForeground} style={ss.infoIcon} />
      <View style={ss.infoContent}>
        <Text style={[ss.infoLabel, { fontFamily: SANS_MEDIUM, color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[ss.infoValue, { fontFamily: SANS, color: actionable ? colors.accent : colors.foreground }]}>{value}</Text>
      </View>
      {actionable && <Feather name="external-link" size={12} color={colors.accent} />}
    </View>
  );
  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>
  ) : content;
}

function FinancialBlock({ label, value, highlight, colors }: {
  label: string; value: string; highlight?: boolean; colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={ss.financialBlock}>
      <Text style={[ss.financialValue, { fontFamily: SERIF, color: highlight ? colors.foreground : colors.mutedForeground }]}>
        {value}
      </Text>
      <Text style={[ss.financialLabel, { fontFamily: SANS_MEDIUM, color: colors.tertiaryText }]}>{label}</Text>
    </View>
  );
}

const ss = StyleSheet.create({
  loading: { padding: 48, alignItems: 'center' },
  body: { paddingBottom: 8 },
  heroRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  av: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avText: { fontSize: 20 },
  heroInfo: { flex: 1 },
  category: { fontSize: 11, letterSpacing: 0.3 },
  financialRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 8, borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
  financialBlock: { flex: 1, alignItems: 'center', gap: 3 },
  financialValue: { fontSize: 18, lineHeight: 20 },
  financialLabel: { fontSize: 8, letterSpacing: 0.6 },
  divider: { width: StyleSheet.hairlineWidth, height: 36 },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 8, letterSpacing: 1.6, marginBottom: 8 },
  sectionCard: { borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  infoIcon: { width: 18 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 9, letterSpacing: 0.4, marginBottom: 2 },
  infoValue: { fontSize: 13 },
  noteBox: {
    borderRadius: 8, borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  noteText: { fontSize: 13, lineHeight: 20 },
  added: { fontSize: 10, textAlign: 'center', marginTop: 24, marginBottom: 4 },
});
