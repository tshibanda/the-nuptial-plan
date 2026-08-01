import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { CalendarEvent } from '@workspace/api-client-react';
import { useDeleteEvent } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { formatDateShort } from '@/utils/format';
import { shadow } from '@/utils/shadow';
import { BottomSheet } from '@/components/BottomSheet';
import { EventAddSheet } from '@/components/EventAddSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  weddingId: number;
  onUpdated: () => void;
  onDeleted: () => void;
}

const TONE_COLOR_KEYS = {
  gold: 'gold',
  rose: 'rose',
  sage: 'sage',
} as const;

const TONE_LABELS: Record<string, string> = {
  gold: 'Or',
  rose: 'Rose',
  sage: 'Sauge',
};

export function EventDetailSheet({ visible, onClose, event, weddingId, onUpdated, onDeleted }: Props) {
  const colors = useColors();
  const [showEdit, setShowEdit] = useState(false);

  const { mutate: deleteEvent, isPending: isDeleting } = useDeleteEvent({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onDeleted();
        onClose();
      },
      onError: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    },
  });

  if (!event) return null;

  const toneColor = event.tone
    ? (colors as any)[TONE_COLOR_KEYS[event.tone as keyof typeof TONE_COLOR_KEYS]] as string | undefined
    : undefined;

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowEdit(true);
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Supprimer cet événement ?',
      `"${event.title}" sera définitivement supprimé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            deleteEvent({ weddingId, id: event.id });
          },
        },
      ],
    );
  };

  return (
    <>
      <BottomSheet
        visible={visible && !showEdit}
        onClose={onClose}
        eyebrow="AGENDA"
        title={event.title}
      >
        <View style={ss.body}>
          {/* Date / Time row */}
          <View style={[ss.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <InfoRow
              icon="calendar"
              label="Date"
              value={formatDateShort(event.eventDate)}
              colors={colors}
              isLast={!event.eventTime}
            />
            {event.eventTime ? (
              <InfoRow
                icon="clock"
                label="Heure"
                value={event.eventTime}
                colors={colors}
                isLast
              />
            ) : null}
          </View>

          {/* Detail / notes */}
          {event.detail ? (
            <View style={ss.section}>
              <Text style={[ss.sectionTitle, { fontFamily: SANS_SEMIBOLD, color: colors.goldDim }]}>NOTES</Text>
              <View style={[ss.noteBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[ss.noteText, { fontFamily: SANS, color: colors.foreground }]}>{event.detail}</Text>
              </View>
            </View>
          ) : null}

          {/* Tone badge */}
          {event.tone && toneColor ? (
            <View style={ss.section}>
              <Text style={[ss.sectionTitle, { fontFamily: SANS_SEMIBOLD, color: colors.goldDim }]}>COULEUR</Text>
              <View style={[ss.toneBadge, { borderColor: toneColor + '44', backgroundColor: toneColor + '18' }]}>
                <View style={[ss.toneDot, { backgroundColor: toneColor }]} />
                <Text style={[ss.toneLabel, { fontFamily: SANS_MEDIUM, color: toneColor }]}>
                  {TONE_LABELS[event.tone] ?? event.tone}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Status */}
          <View style={ss.section}>
            <Text style={[ss.sectionTitle, { fontFamily: SANS_SEMIBOLD, color: colors.goldDim }]}>STATUT</Text>
            <View style={[ss.statusRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Feather
                name={event.completed ? 'check-circle' : 'circle'}
                size={16}
                color={event.completed ? colors.sage : colors.mutedForeground}
              />
              <Text style={[ss.statusText, { fontFamily: SANS_MEDIUM, color: event.completed ? colors.sage : colors.mutedForeground }]}>
                {event.completed ? 'Terminé' : 'À venir'}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={ss.actions}>
            <TouchableOpacity
              onPress={handleEdit}
              activeOpacity={0.8}
              style={[ss.editBtn, shadow('sm'), { backgroundColor: colors.plum }]}
            >
              <Feather name="edit-2" size={15} color="#FBF5FB" />
              <Text style={[ss.editBtnText, { fontFamily: SANS_SEMIBOLD }]}>Modifier</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDelete}
              activeOpacity={0.8}
              disabled={isDeleting}
              style={[ss.deleteBtn, shadow('xs'), { borderColor: colors.rose + '66', backgroundColor: colors.rose + '12' }]}
            >
              {isDeleting
                ? <ActivityIndicator size="small" color={colors.rose} />
                : (
                  <>
                    <Feather name="trash-2" size={15} color={colors.rose} />
                    <Text style={[ss.deleteBtnText, { fontFamily: SANS_SEMIBOLD, color: colors.rose }]}>Supprimer</Text>
                  </>
                )}
            </TouchableOpacity>
          </View>

          <Text style={[ss.added, { fontFamily: SANS, color: colors.tertiaryText }]}>
            Ajouté le {new Date(event.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>
      </BottomSheet>

      {/* Edit sheet — mounts on top */}
      <EventAddSheet
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        weddingId={weddingId}
        initialEvent={event}
        onCreated={() => {
          setShowEdit(false);
          onUpdated();
          onClose();
        }}
      />
    </>
  );
}

// ── Small helper ─────────────────────────────────────────────────────────────
function InfoRow({
  icon, label, value, colors, isLast,
}: {
  icon: string;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  isLast: boolean;
}) {
  return (
    <View style={[ir.row, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <Feather name={icon as any} size={14} color={colors.mutedForeground} style={ir.icon} />
      <View style={ir.content}>
        <Text style={[ir.lbl, { fontFamily: SANS_MEDIUM, color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[ir.val, { fontFamily: SANS, color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

const ir = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  icon: { width: 18 },
  content: { flex: 1 },
  lbl: { fontSize: 9, letterSpacing: 0.4, marginBottom: 2 },
  val: { fontSize: 13 },
});

const ss = StyleSheet.create({
  body: { paddingBottom: 8 },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 8, letterSpacing: 1.6, marginBottom: 8 },
  noteBox: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  noteText: { fontSize: 13, lineHeight: 20 },
  toneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  toneDot: { width: 8, height: 8, borderRadius: 4 },
  toneLabel: { fontSize: 12 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusText: { fontSize: 13 },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 20,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    height: 48,
  },
  editBtnText: { fontSize: 13, color: '#FBF5FB' },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
  },
  deleteBtnText: { fontSize: 13 },
  added: { fontSize: 10, textAlign: 'center', marginTop: 20, marginBottom: 4 },
});
