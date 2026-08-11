import React, { useState } from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getListGuestsQueryKey, getGetGuestStatsQueryKey, useUpdateGuest } from '@workspace/api-client-react';
import type { Guest, GuestRsvpStatus } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { rsvpLabel } from '@/utils/format';
import { StatusBadge } from '@/components/StatusBadge';
import { BottomSheet } from '@/components/BottomSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  guest: Guest | null;
  weddingId: number;
}

export function GuestDetailSheet({ visible, onClose, guest, weddingId }: Props) {
  const colors = useColors();
  const updateGuest = useUpdateGuest();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: '', email: '', tableNumber: '', dietaryRequirements: '', notes: '', rsvpStatus: 'pending' as GuestRsvpStatus });

  if (!guest) return null;

  const { label, tone } = rsvpLabel(guest.rsvpStatus);
  const av = guest.name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const startEditing = () => {
    setDraft({
      name: guest.name,
      email: guest.email ?? '',
      tableNumber: guest.tableNumber ?? '',
      dietaryRequirements: guest.dietaryRequirements ?? '',
      notes: guest.notes ?? '',
      rsvpStatus: guest.rsvpStatus,
    });
    setEditing(true);
  };

  const save = () => {
    if (!draft.name.trim()) return;
    updateGuest.mutate({
      weddingId,
      id: guest.id,
      data: {
        name: draft.name.trim(),
        email: draft.email.trim() || undefined,
        tableNumber: draft.tableNumber.trim() || undefined,
        dietaryRequirements: draft.dietaryRequirements.trim() || undefined,
        notes: draft.notes.trim() || undefined,
        rsvpStatus: draft.rsvpStatus,
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey(weddingId) });
        queryClient.invalidateQueries({ queryKey: getGetGuestStatsQueryKey(weddingId) });
        setEditing(false);
      },
      onError: () => Alert.alert('Erreur', 'Impossible de modifier cet invité.'),
    });
  };

  const fields: { icon: string; label: string; value: string; actionable?: boolean; onPress?: () => void }[] = [];

  if (guest.email) {
    fields.push({
      icon: 'mail',
      label: 'Email',
      value: guest.email,
      actionable: true,
      onPress: () => Linking.openURL(`mailto:${guest.email}`),
    });
  }
  if (guest.tableNumber) {
    fields.push({ icon: 'map-pin', label: 'Table', value: `Table ${guest.tableNumber}` });
  }
  if (guest.dietaryRequirements) {
    fields.push({ icon: 'coffee', label: 'Régime alimentaire', value: guest.dietaryRequirements });
  }

  const rsvpColors = {
    confirmed: colors.success,
    pending: colors.warning,
    declined: colors.mutedForeground,
  } as const;
  const rsvpBg = {
    confirmed: colors.successBg,
    pending: colors.warningBg,
    declined: colors.background,
  } as const;
  const rsvpColor = rsvpColors[guest.rsvpStatus as keyof typeof rsvpColors] ?? colors.mutedForeground;
  const rsvpBgColor = rsvpBg[guest.rsvpStatus as keyof typeof rsvpBg] ?? colors.background;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      eyebrow="INVITÉ"
      title={guest.name}
    >
      <View style={ss.body}>
        <TouchableOpacity onPress={editing ? () => setEditing(false) : startEditing} style={[ss.editButton, { borderColor: colors.plum + '40', backgroundColor: colors.plum + '10' }]}>
          <Feather name={editing ? 'x' : 'edit-2'} size={14} color={colors.plum} />
          <Text style={[ss.editButtonText, { color: colors.plum, fontFamily: SANS_SEMIBOLD }]}>{editing ? 'Annuler' : 'Modifier l’invité'}</Text>
        </TouchableOpacity>
        {editing && (
          <View style={ss.editForm}>
            {([
              ['name', 'Nom complet *'], ['email', 'Adresse e-mail'], ['tableNumber', 'Table'], ['dietaryRequirements', 'Régime alimentaire'],
            ] as const).map(([key, placeholder]) => (
              <TextInput key={key} value={draft[key]} onChangeText={(value) => setDraft((current) => ({ ...current, [key]: value }))} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} style={[ss.editInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} />
            ))}
            <Text style={[ss.formLabel, { color: colors.mutedForeground, fontFamily: SANS_MEDIUM }]}>STATUT RSVP</Text>
            <View style={ss.rsvpChoices}>
              {(['pending', 'confirmed', 'declined'] as GuestRsvpStatus[]).map((status) => (
                <TouchableOpacity key={status} onPress={() => setDraft((current) => ({ ...current, rsvpStatus: status }))} style={[ss.rsvpChoice, { backgroundColor: draft.rsvpStatus === status ? colors.plum : colors.muted, borderColor: draft.rsvpStatus === status ? colors.plum : colors.border }]}>
                  <Text style={[ss.rsvpChoiceText, { color: draft.rsvpStatus === status ? '#fff' : colors.mutedForeground, fontFamily: SANS_MEDIUM }]}>{status === 'confirmed' ? 'Confirmé' : status === 'declined' ? 'Décliné' : 'En attente'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput value={draft.notes} onChangeText={(value) => setDraft((current) => ({ ...current, notes: value }))} placeholder="Notes" placeholderTextColor={colors.mutedForeground} multiline style={[ss.editInput, ss.notesInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} />
            <TouchableOpacity disabled={updateGuest.isPending} onPress={save} style={[ss.saveButton, { backgroundColor: colors.plum, opacity: updateGuest.isPending ? 0.6 : 1 }]}>
              {updateGuest.isPending ? <ActivityIndicator color="#fff" /> : <Text style={[ss.saveText, { fontFamily: SANS_SEMIBOLD }]}>Enregistrer les modifications</Text>}
            </TouchableOpacity>
          </View>
        )}
        {/* Avatar + RSVP hero */}
        <View style={[ss.heroRow, { borderBottomColor: colors.border }]}>
          <View style={[ss.av, { backgroundColor: colors.goldLight }]}>
            <Text style={[ss.avText, { fontFamily: SERIF, color: colors.navy }]}>{av}</Text>
          </View>
          <View style={ss.heroInfo}>
            <Text style={[ss.heroSub, { fontFamily: SANS, color: colors.mutedForeground }]}>
              Statut de participation
            </Text>
          </View>
          <StatusBadge label={label} tone={tone} />
        </View>

        {/* RSVP large indicator */}
        <View style={[ss.rsvpCard, { backgroundColor: rsvpBgColor, borderColor: colors.border }]}>
          <Feather
            name={guest.rsvpStatus === 'confirmed' ? 'check-circle' : guest.rsvpStatus === 'declined' ? 'x-circle' : 'clock'}
            size={22}
            color={rsvpColor}
          />
          <View>
            <Text style={[ss.rsvpLabel, { fontFamily: SANS_SEMIBOLD, color: rsvpColor }]}>{label}</Text>
            <Text style={[ss.rsvpSub, { fontFamily: SANS, color: colors.mutedForeground }]}>
              {guest.rsvpStatus === 'confirmed' ? 'La présence est confirmée'
                : guest.rsvpStatus === 'declined' ? 'A décliné l\'invitation'
                : 'En attente d\'une réponse'}
            </Text>
          </View>
        </View>

        {/* Info fields */}
        {fields.length > 0 && (
          <View style={[ss.infoCard, { backgroundColor: colors.background, borderColor: colors.border, marginHorizontal: 16 }]}>
            {fields.map(({ icon, label: fieldLabel, value, actionable, onPress }, i) => {
              const rowContent = (
                <View
                  key={fieldLabel}
                  style={[ss.infoRow, i < fields.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                >
                  <Feather name={icon as any} size={14} color={colors.mutedForeground} style={ss.infoIcon} />
                  <View style={ss.infoContent}>
                    <Text style={[ss.infoLabel, { fontFamily: SANS_MEDIUM, color: colors.mutedForeground }]}>{fieldLabel}</Text>
                    <Text style={[ss.infoValue, { fontFamily: SANS, color: actionable ? colors.accent : colors.foreground }]}>{value}</Text>
                  </View>
                  {actionable && <Feather name="external-link" size={12} color={colors.accent} />}
                </View>
              );
              return onPress ? (
                <TouchableOpacity key={fieldLabel} onPress={onPress} activeOpacity={0.7}>
                  {rowContent}
                </TouchableOpacity>
              ) : rowContent;
            })}
          </View>
        )}

        {/* Notes */}
        {guest.notes ? (
          <View style={ss.section}>
            <Text style={[ss.sectionTitle, { fontFamily: SANS_SEMIBOLD, color: colors.goldDim }]}>NOTES</Text>
            <View style={[ss.noteBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[ss.noteText, { fontFamily: SANS, color: colors.foreground }]}>{guest.notes}</Text>
            </View>
          </View>
        ) : null}

        {/* Footer */}
        <Text style={[ss.added, { fontFamily: SANS, color: colors.tertiaryText }]}>
          Ajouté le {new Date(guest.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
      </View>
    </BottomSheet>
  );
}

const ss = StyleSheet.create({
  body: { paddingBottom: 8 },
  heroRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  av: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avText: { fontSize: 20 },
  heroInfo: { flex: 1 },
  heroSub: { fontSize: 11 },
  rsvpCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 8, borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  rsvpLabel: { fontSize: 14, marginBottom: 2 },
  rsvpSub: { fontSize: 11 },
  infoCard: {
    borderRadius: 8, borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden', marginTop: 16,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  infoIcon: { width: 18 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 9, letterSpacing: 0.4, marginBottom: 2 },
  infoValue: { fontSize: 13 },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 8, letterSpacing: 1.6, marginBottom: 8 },
  noteBox: { borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  noteText: { fontSize: 13, lineHeight: 20 },
  added: { fontSize: 10, textAlign: 'center', marginTop: 24, marginBottom: 4 },
  editButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginHorizontal: 16, marginTop: 14, paddingVertical: 10, borderRadius: 9, borderWidth: 1 },
  editButtonText: { fontSize: 11 },
  editForm: { paddingHorizontal: 16, paddingTop: 12, gap: 9 },
  editInput: { minHeight: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, fontSize: 12 },
  notesInput: { minHeight: 72, paddingTop: 11, textAlignVertical: 'top' },
  formLabel: { fontSize: 9, letterSpacing: 1, marginTop: 2 },
  rsvpChoices: { flexDirection: 'row', gap: 7 },
  rsvpChoice: { flex: 1, minHeight: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rsvpChoiceText: { fontSize: 10 },
  saveButton: { minHeight: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontSize: 11 },
});
