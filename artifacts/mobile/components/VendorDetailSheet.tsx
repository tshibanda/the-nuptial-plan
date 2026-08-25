import React, { useState } from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getListVendorsQueryKey, useGetVendor, useUpdateVendor } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { formatCents, vendorStatusLabel } from '@/utils/format';
import { StatusBadge } from '@/components/StatusBadge';
import { BottomSheet } from '@/components/BottomSheet';
import { useLocalization } from '@/context/LocalizationContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  weddingId: number;
  vendorId: number | null;
  currency?: string;
}

export function VendorDetailSheet({ visible, onClose, weddingId, vendorId, currency = 'EUR' }: Props) {
  const colors = useColors();
  const { language, locale } = useLocalization();
  const en = language === 'en';
  const { data: vendor, isLoading } = useGetVendor(weddingId, vendorId ?? 0);
  const updateVendor = useUpdateVendor();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: '', category: '', contactName: '', contactEmail: '', amount: '', deposit: '', notes: '' });

  const av = vendor?.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) ?? '';
  const { label, tone } = vendor ? vendorStatusLabel(vendor.status) : { label: '', tone: 'neutral' as const };

  const remaining = vendor
    ? vendor.totalAmountCents - (vendor.depositAmountCents ?? 0)
    : 0;

  const startEditing = () => {
    if (!vendor) return;
    setDraft({
      name: vendor.name,
      category: vendor.category,
      contactName: vendor.contactName ?? '',
      contactEmail: vendor.contactEmail ?? '',
      amount: String((vendor.totalAmountCents / 100).toFixed(2)),
      deposit: String(((vendor.depositAmountCents ?? 0) / 100).toFixed(2)),
      notes: vendor.notes ?? '',
    });
    setEditing(true);
  };

  const save = () => {
    if (!vendor || !draft.name.trim() || !draft.category.trim()) return;
    updateVendor.mutate({
      weddingId,
      id: vendor.id,
      data: {
        name: draft.name.trim(),
        category: draft.category.trim(),
        contactName: draft.contactName.trim() || undefined,
        contactEmail: draft.contactEmail.trim() || undefined,
        totalAmountCents: Math.round((Number(draft.amount.replace(',', '.')) || 0) * 100),
        depositAmountCents: Math.round((Number(draft.deposit.replace(',', '.')) || 0) * 100),
        notes: draft.notes.trim() || undefined,
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey(weddingId) });
        setEditing(false);
      },
       onError: () => Alert.alert(en ? 'Error' : 'Erreur', en ? 'Unable to update this vendor.' : 'Impossible de modifier ce prestataire.'),
    });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
       eyebrow={en ? 'VENDOR' : 'PRESTATAIRE'}
      title={vendor?.name ?? ''}
    >
      {isLoading || !vendor ? (
        <View style={ss.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <View style={ss.body}>
          <TouchableOpacity onPress={editing ? () => setEditing(false) : startEditing} style={[ss.editButton, { borderColor: colors.plum + '40', backgroundColor: colors.plum + '10' }]}>
            <Feather name={editing ? 'x' : 'edit-2'} size={14} color={colors.plum} />
             <Text style={[ss.editButtonText, { color: colors.plum, fontFamily: SANS_SEMIBOLD }]}>{editing ? (en ? 'Cancel' : 'Annuler') : (en ? 'Edit vendor' : 'Modifier le prestataire')}</Text>
          </TouchableOpacity>
          {editing && (
            <View style={ss.editForm}>
              {([
                 ['name', en ? 'Vendor name *' : 'Nom du prestataire *'], ['category', en ? 'Category *' : 'Catégorie *'], ['contactName', en ? 'Contact name' : 'Nom du contact'], ['contactEmail', 'E-mail'], ['amount', en ? 'Total amount' : 'Montant total'], ['deposit', en ? 'Deposit' : 'Acompte'],
              ] as const).map(([key, placeholder]) => (
                <TextInput key={key} value={draft[key]} onChangeText={(value) => setDraft((current) => ({ ...current, [key]: value }))} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} keyboardType={key === 'amount' || key === 'deposit' ? 'decimal-pad' : key === 'contactEmail' ? 'email-address' : 'default'} style={[ss.editInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} />
              ))}
               <TextInput value={draft.notes} onChangeText={(value) => setDraft((current) => ({ ...current, notes: value }))} placeholder="Notes" placeholderTextColor={colors.mutedForeground} multiline style={[ss.editInput, ss.notesInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} />
              <TouchableOpacity disabled={updateVendor.isPending} onPress={save} style={[ss.saveButton, { backgroundColor: colors.plum, opacity: updateVendor.isPending ? 0.6 : 1 }]}>
                 {updateVendor.isPending ? <ActivityIndicator color="#fff" /> : <Text style={[ss.saveText, { fontFamily: SANS_SEMIBOLD }]}>{en ? 'Save changes' : 'Enregistrer les modifications'}</Text>}
              </TouchableOpacity>
            </View>
          )}
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
               label={en ? 'Total amount' : 'Montant total'}
              value={formatCents(vendor.totalAmountCents, currency)}
              highlight
              colors={colors}
            />
            <View style={[ss.divider, { backgroundColor: colors.border }]} />
            <FinancialBlock
               label={en ? 'Deposit paid' : 'Acompte versé'}
              value={vendor.depositAmountCents != null
                ? formatCents(vendor.depositAmountCents, currency)
                : '—'}
              colors={colors}
            />
            <View style={[ss.divider, { backgroundColor: colors.border }]} />
            <FinancialBlock
               label={en ? 'Balance due' : 'Solde restant'}
              value={vendor.depositAmountCents != null ? formatCents(remaining, currency) : '—'}
              colors={colors}
            />
          </View>

          {/* Contact */}
          {(vendor.contactName || vendor.contactEmail) && (
             <Section title={en ? 'CONTACT' : 'CONTACT'} colors={colors}>
              {vendor.contactName ? (
                 <InfoRow icon="user" label={en ? 'Name' : 'Nom'} value={vendor.contactName} colors={colors} />
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
             {en ? 'Added on' : 'Ajouté le'} {new Date(vendor.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
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
  editButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginHorizontal: 16, marginTop: 14, paddingVertical: 10, borderRadius: 9, borderWidth: 1 },
  editButtonText: { fontSize: 11 },
  editForm: { paddingHorizontal: 16, paddingTop: 12, gap: 9 },
  editInput: { minHeight: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, fontSize: 12 },
  notesInput: { minHeight: 72, paddingTop: 11, textAlignVertical: 'top' },
  saveButton: { minHeight: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontSize: 11 },
});
