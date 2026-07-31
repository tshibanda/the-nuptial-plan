import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Guest } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { rsvpLabel } from '@/utils/format';
import { StatusBadge } from '@/components/StatusBadge';
import { BottomSheet } from '@/components/BottomSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  guest: Guest | null;
}

export function GuestDetailSheet({ visible, onClose, guest }: Props) {
  const colors = useColors();

  if (!guest) return null;

  const { label, tone } = rsvpLabel(guest.rsvpStatus);
  const av = guest.name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);

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
});
