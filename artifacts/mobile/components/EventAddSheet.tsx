import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { CalendarEvent } from '@workspace/api-client-react';
import { useCreateEvent, useUpdateEvent } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { shadow } from '@/utils/shadow';
import { BottomSheet } from '@/components/BottomSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  weddingId: number;
  onCreated: () => void;
  /** When provided, the sheet enters edit mode and pre-fills fields */
  initialEvent?: CalendarEvent | null;
}

const TONES = ['gold', 'rose', 'sage'] as const;
type Tone = typeof TONES[number];

const TONE_LABELS: Record<Tone, string> = {
  gold: 'Or',
  rose: 'Rose',
  sage: 'Sauge',
};

function parseLocalDate(day: string, month: string, year: string): string | null {
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 2000 || y > 2100) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseTime(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,2})[:\-hH](\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Split an ISO date string YYYY-MM-DD into day/month/year parts */
function splitIsoDate(isoDate: string): { day: string; month: string; year: string } {
  const [y, m, d] = isoDate.split('-');
  return {
    day: d ? String(parseInt(d, 10)) : '',
    month: m ? String(parseInt(m, 10)) : '',
    year: y ?? '',
  };
}

export function EventAddSheet({ visible, onClose, weddingId, onCreated, initialEvent }: Props) {
  const colors = useColors();
  const isEditMode = !!initialEvent;

  const [title, setTitle] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [time, setTime] = useState('');
  const [detail, setDetail] = useState('');
  const [tone, setTone] = useState<Tone | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const timeRef = useRef<TextInput>(null);
  const detailRef = useRef<TextInput>(null);

  // Pre-fill fields when editing
  useEffect(() => {
    if (visible && initialEvent) {
      setTitle(initialEvent.title);
      const parts = splitIsoDate(initialEvent.eventDate);
      setDay(parts.day);
      setMonth(parts.month);
      setYear(parts.year);
      setTime(initialEvent.eventTime ?? '');
      setDetail(initialEvent.detail ?? '');
      setTone((initialEvent.tone as Tone) ?? null);
      setErrors({});
    } else if (visible && !initialEvent) {
      // Reset for create mode
      setTitle('');
      setDay('');
      setMonth('');
      setYear('');
      setTime('');
      setDetail('');
      setTone(null);
      setErrors({});
    }
  }, [visible, initialEvent]);

  const { mutate: createEvent, isPending: isCreating } = useCreateEvent({
    mutation: {
      onSuccess: () => {
        onCreated();
        handleClose();
      },
    },
  });

  const { mutate: updateEvent, isPending: isUpdating } = useUpdateEvent({
    mutation: {
      onSuccess: () => {
        onCreated();
        handleClose();
      },
    },
  });

  const isPending = isCreating || isUpdating;

  const handleClose = () => {
    setTitle('');
    setDay('');
    setMonth('');
    setYear('');
    setTime('');
    setDetail('');
    setTone(null);
    setErrors({});
    onClose();
  };

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Le titre est requis';
    const isoDate = parseLocalDate(day, month, year);
    if (!isoDate) errs.date = 'Date invalide (JJ/MM/AAAA)';
    const parsedTime = time.trim() ? parseTime(time) : null;
    if (time.trim() && !parsedTime) errs.time = 'Heure invalide (HH:MM)';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});

    const payload = {
      title: title.trim(),
      eventDate: isoDate!,
      ...(parsedTime ? { eventTime: parsedTime } : { eventTime: undefined }),
      ...(detail.trim() ? { detail: detail.trim() } : { detail: undefined }),
      ...(tone ? { tone } : {}),
    };

    if (isEditMode && initialEvent) {
      updateEvent({ weddingId, id: initialEvent.id, data: payload });
    } else {
      createEvent({ weddingId, data: payload });
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      eyebrow="AGENDA"
      title={isEditMode ? "Modifier l'événement" : 'Nouvel événement'}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={ss.body}
      >
        {/* Title */}
        <View style={ss.field}>
          <Text style={[ss.label, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>
            TITRE <Text style={{ color: colors.rose }}>*</Text>
          </Text>
          <View style={[ss.inputWrap, shadow('xs'), { borderColor: errors.title ? colors.rose : colors.border, backgroundColor: colors.background }]}>
            <Feather name="calendar" size={14} color={colors.goldDim} style={ss.inputIcon} />
            <TextInput
              style={[ss.input, { fontFamily: SANS, color: colors.foreground }]}
              placeholder="Ex : Dégustation traiteur"
              placeholderTextColor={colors.mutedForeground}
              value={title}
              onChangeText={(t) => { setTitle(t); if (errors.title) setErrors((e) => ({ ...e, title: '' })); }}
              returnKeyType="next"
              onSubmitEditing={() => monthRef.current?.focus()}
              autoCapitalize="sentences"
            />
          </View>
          {errors.title ? <Text style={[ss.error, { color: colors.rose, fontFamily: SANS }]}>{errors.title}</Text> : null}
        </View>

        {/* Date */}
        <View style={ss.field}>
          <Text style={[ss.label, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>
            DATE <Text style={{ color: colors.rose }}>*</Text>
          </Text>
          <View style={ss.dateRow}>
            {/* Day */}
            <View style={[ss.dateInputWrap, shadow('xs'), { borderColor: errors.date ? colors.rose : colors.border, backgroundColor: colors.background, flex: 1 }]}>
              <TextInput
                style={[ss.dateInput, { fontFamily: SANS, color: colors.foreground }]}
                placeholder="JJ"
                placeholderTextColor={colors.mutedForeground}
                value={day}
                onChangeText={(v) => {
                  const clean = v.replace(/\D/g, '').slice(0, 2);
                  setDay(clean);
                  if (errors.date) setErrors((e) => ({ ...e, date: '' }));
                  if (clean.length === 2) monthRef.current?.focus();
                }}
                keyboardType="number-pad"
                maxLength={2}
                returnKeyType="next"
                onSubmitEditing={() => monthRef.current?.focus()}
                textAlign="center"
              />
            </View>
            <Text style={[ss.dateSep, { color: colors.mutedForeground, fontFamily: SANS_MEDIUM }]}>/</Text>
            {/* Month */}
            <View style={[ss.dateInputWrap, shadow('xs'), { borderColor: errors.date ? colors.rose : colors.border, backgroundColor: colors.background, flex: 1 }]}>
              <TextInput
                ref={monthRef}
                style={[ss.dateInput, { fontFamily: SANS, color: colors.foreground }]}
                placeholder="MM"
                placeholderTextColor={colors.mutedForeground}
                value={month}
                onChangeText={(v) => {
                  const clean = v.replace(/\D/g, '').slice(0, 2);
                  setMonth(clean);
                  if (errors.date) setErrors((e) => ({ ...e, date: '' }));
                  if (clean.length === 2) yearRef.current?.focus();
                }}
                keyboardType="number-pad"
                maxLength={2}
                returnKeyType="next"
                onSubmitEditing={() => yearRef.current?.focus()}
                textAlign="center"
              />
            </View>
            <Text style={[ss.dateSep, { color: colors.mutedForeground, fontFamily: SANS_MEDIUM }]}>/</Text>
            {/* Year */}
            <View style={[ss.dateInputWrap, shadow('xs'), { borderColor: errors.date ? colors.rose : colors.border, backgroundColor: colors.background, flex: 2 }]}>
              <TextInput
                ref={yearRef}
                style={[ss.dateInput, { fontFamily: SANS, color: colors.foreground }]}
                placeholder="AAAA"
                placeholderTextColor={colors.mutedForeground}
                value={year}
                onChangeText={(v) => {
                  const clean = v.replace(/\D/g, '').slice(0, 4);
                  setYear(clean);
                  if (errors.date) setErrors((e) => ({ ...e, date: '' }));
                  if (clean.length === 4) timeRef.current?.focus();
                }}
                keyboardType="number-pad"
                maxLength={4}
                returnKeyType="next"
                onSubmitEditing={() => timeRef.current?.focus()}
                textAlign="center"
              />
            </View>
          </View>
          {errors.date ? <Text style={[ss.error, { color: colors.rose, fontFamily: SANS }]}>{errors.date}</Text> : null}
        </View>

        {/* Time */}
        <View style={ss.field}>
          <Text style={[ss.label, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>
            HEURE <Text style={{ color: colors.mutedForeground, fontFamily: SANS }}>(facultatif)</Text>
          </Text>
          <View style={[ss.inputWrap, shadow('xs'), { borderColor: errors.time ? colors.rose : colors.border, backgroundColor: colors.background }]}>
            <Feather name="clock" size={14} color={colors.goldDim} style={ss.inputIcon} />
            <TextInput
              ref={timeRef}
              style={[ss.input, { fontFamily: SANS, color: colors.foreground }]}
              placeholder="Ex : 14:30"
              placeholderTextColor={colors.mutedForeground}
              value={time}
              onChangeText={(t) => { setTime(t); if (errors.time) setErrors((e) => ({ ...e, time: '' })); }}
              keyboardType="numbers-and-punctuation"
              returnKeyType="next"
              onSubmitEditing={() => detailRef.current?.focus()}
            />
          </View>
          {errors.time ? <Text style={[ss.error, { color: colors.rose, fontFamily: SANS }]}>{errors.time}</Text> : null}
        </View>

        {/* Detail */}
        <View style={ss.field}>
          <Text style={[ss.label, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>
            NOTES <Text style={{ color: colors.mutedForeground, fontFamily: SANS }}>(facultatif)</Text>
          </Text>
          <View style={[ss.textAreaWrap, shadow('xs'), { borderColor: colors.border, backgroundColor: colors.background }]}>
            <TextInput
              ref={detailRef}
              style={[ss.textArea, { fontFamily: SANS, color: colors.foreground }]}
              placeholder="Informations supplémentaires…"
              placeholderTextColor={colors.mutedForeground}
              value={detail}
              onChangeText={setDetail}
              multiline
              numberOfLines={3}
              returnKeyType="default"
            />
          </View>
        </View>

        {/* Tone */}
        <View style={ss.field}>
          <Text style={[ss.label, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>
            COULEUR <Text style={{ color: colors.mutedForeground, fontFamily: SANS }}>(facultatif)</Text>
          </Text>
          <View style={ss.toneRow}>
            {TONES.map((t) => {
              const isSelected = tone === t;
              const dotColor = t === 'gold' ? colors.gold : t === 'rose' ? colors.rose : colors.sage;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTone(isSelected ? null : t)}
                  activeOpacity={0.75}
                  style={[
                    ss.toneChip,
                    {
                      borderColor: isSelected ? dotColor : colors.border,
                      backgroundColor: isSelected ? dotColor + '18' : colors.background,
                    },
                  ]}
                >
                  <View style={[ss.toneDot, { backgroundColor: dotColor }]} />
                  <Text style={[ss.toneLabel, { fontFamily: SANS_MEDIUM, color: isSelected ? dotColor : colors.mutedForeground }]}>
                    {TONE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          activeOpacity={0.82}
          disabled={isPending}
          style={[ss.submitBtn, { backgroundColor: colors.plum }, shadow('md')]}
        >
          {isPending
            ? <ActivityIndicator color="#FBF5FB" size="small" />
            : (
              <>
                <Feather name={isEditMode ? 'check' : 'plus'} size={16} color="#FBF5FB" />
                <Text style={[ss.submitText, { fontFamily: SANS_SEMIBOLD }]}>
                  {isEditMode ? 'Enregistrer les modifications' : "Ajouter l'événement"}
                </Text>
              </>
            )}
        </TouchableOpacity>
      </ScrollView>
    </BottomSheet>
  );
}

const ss = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 8, letterSpacing: 1.4 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  inputIcon: { flexShrink: 0 },
  input: { flex: 1, fontSize: 14, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateInputWrap: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    height: 46,
    justifyContent: 'center',
  },
  dateInput: { fontSize: 14, paddingHorizontal: 8, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) },
  dateSep: { fontSize: 18, marginBottom: 2 },
  textAreaWrap: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    minHeight: 80,
  },
  textArea: {
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },
  toneRow: { flexDirection: 'row', gap: 8 },
  toneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toneDot: { width: 8, height: 8, borderRadius: 4 },
  toneLabel: { fontSize: 12 },
  error: { fontSize: 11, marginTop: 2 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    height: 50,
    marginTop: 4,
  },
  submitText: { fontSize: 14, color: '#FBF5FB' },
});
