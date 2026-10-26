import { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useLocalization } from '@/context/LocalizationContext';
import { SANS, SANS_SEMIBOLD } from '@/constants/fonts';
import { parsePickerDate, pickerDateValue, pickerMonthCells } from '@/utils/datePicker';

type Props = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  monthOnly?: boolean;
  clearable?: boolean;
  invalid?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Inline calendar: no nested modal, keyboard input, or extra native dependency. */
export function DateField({ value, onChange, label, monthOnly = false, clearable = false, invalid = false, style }: Props) {
  const colors = useColors();
  const { language, locale } = useLocalization();
  const fr = language === 'fr';
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => parsePickerDate(value) ?? new Date());
  const [view, setView] = useState<'days' | 'months' | 'years'>(monthOnly ? 'months' : 'days');
  useEffect(() => { setOpen(false); }, [value]);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const selected = parsePickerDate(value);
  const yearStart = Math.floor(year / 12) * 12;
  const monthName = (index: number) => new Date(2024, index, 1, 12).toLocaleDateString(locale, { month: 'long' });
  const move = (direction: number) => {
    setCursor(view === 'days'
      ? new Date(year, month + direction, 1, 12)
      : new Date(year + direction * (view === 'years' ? 12 : 1), month, 1, 12));
  };
  const choose = (next: string) => { onChange(next); setOpen(false); };
  const selectMonth = (index: number) => {
    if (monthOnly) choose(pickerDateValue(year, index, 1).slice(0, 7));
    else { setCursor(new Date(year, index, 1, 12)); setView('days'); }
  };
  const textColor = { color: colors.foreground, fontFamily: SANS };

  return (
    <View style={style}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${label}${selected ? `, ${selected.toLocaleDateString(locale, monthOnly ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}`}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          Keyboard.dismiss();
          if (!open) { setCursor(parsePickerDate(value) ?? new Date()); setView(monthOnly ? 'months' : 'days'); }
          setOpen(!open);
        }}
        style={[styles.field, { backgroundColor: colors.background, borderColor: invalid ? colors.rose : colors.border }]}
      >
        <Feather name="calendar" size={18} color={colors.plum} />
        <View style={styles.labelWrap}>
          <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: SANS }]}>{label}</Text>
          <Text style={[styles.value, textColor]}>
            {selected
              ? selected.toLocaleDateString(locale, monthOnly ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' })
              : fr ? 'Choisir une date' : 'Select a date'}
          </Text>
        </View>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
      {open && (
        <View style={[styles.calendar, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={fr ? 'Période précédente' : 'Previous period'} onPress={() => move(-1)} style={styles.arrow}>
              <Feather name="chevron-left" size={20} color={colors.plum} />
            </TouchableOpacity>
            <View style={styles.heading}>
              {view !== 'years' && <TouchableOpacity accessibilityRole="button" accessibilityLabel={fr ? 'Choisir le mois' : 'Choose month'} onPress={() => setView('months')} style={styles.headerButton}>
                <Text style={[textColor, styles.headerText]}>{monthName(month)}</Text>
              </TouchableOpacity>}
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={fr ? 'Choisir l’année' : 'Choose year'} onPress={() => setView('years')} style={styles.headerButton}>
                <Text style={[textColor, styles.headerText]}>{view === 'years' ? `${yearStart} – ${yearStart + 11}` : year}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={fr ? 'Période suivante' : 'Next period'} onPress={() => move(1)} style={styles.arrow}>
              <Feather name="chevron-right" size={20} color={colors.plum} />
            </TouchableOpacity>
          </View>
          <View style={styles.grid}>
            {view === 'days' && <>
              {Array.from({ length: 7 }, (_, index) => (
                <Text key={`weekday-${index}`} style={[styles.weekday, { color: colors.mutedForeground, fontFamily: SANS }]}>
                  {new Date(2024, 0, 1 + index, 12).toLocaleDateString(locale, { weekday: 'short' })}
                </Text>
              ))}
              {pickerMonthCells(year, month).map((day, index) => {
                const iso = day ? pickerDateValue(year, month, day) : '';
                return day ? <TouchableOpacity
                  key={index} accessibilityRole="button"
                  accessibilityLabel={new Date(year, month, day, 12).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
                  accessibilityState={{ selected: value.slice(0, 10) === iso }}
                  onPress={() => choose(iso)}
                  style={[styles.day, { backgroundColor: value.slice(0, 10) === iso ? colors.plum : colors.card }]}
                ><Text style={[textColor, value.slice(0, 10) === iso && { color: '#FBF5FB' }]}>{day}</Text></TouchableOpacity>
                  : <View key={index} style={styles.day} />;
              })}
            </>}
            {view === 'months' && Array.from({ length: 12 }, (_, index) => (
              <TouchableOpacity key={index} accessibilityRole="button" onPress={() => selectMonth(index)} style={styles.option}>
                <Text style={[textColor, styles.optionText]}>{monthName(index)}</Text>
              </TouchableOpacity>
            ))}
            {view === 'years' && Array.from({ length: 12 }, (_, index) => yearStart + index).map((nextYear) => (
              <TouchableOpacity key={nextYear} accessibilityRole="button" onPress={() => { setCursor(new Date(nextYear, month, 1, 12)); setView('months'); }} style={styles.option}>
                <Text style={textColor}>{nextYear}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity accessibilityRole="button" style={styles.footerButton} onPress={() => {
              const now = new Date();
              choose(pickerDateValue(now.getFullYear(), now.getMonth(), now.getDate()).slice(0, monthOnly ? 7 : 10));
            }}><Text style={[styles.action, { color: colors.plum }]}>{monthOnly ? (fr ? 'Ce mois-ci' : 'This month') : (fr ? 'Aujourd’hui' : 'Today')}</Text></TouchableOpacity>
            {clearable && value !== '' && <TouchableOpacity accessibilityRole="button" style={styles.footerButton} onPress={() => choose('')}>
              <Text style={[styles.action, { color: colors.mutedForeground }]}>{fr ? 'Effacer' : 'Clear'}</Text>
            </TouchableOpacity>}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { minHeight: 56, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10 },
  labelWrap: { flex: 1 },
  label: { fontSize: 10, marginBottom: 3 },
  value: { fontSize: 13 },
  calendar: { marginTop: 6, borderWidth: 1, borderRadius: 12, padding: 6 },
  header: { flexDirection: 'row', alignItems: 'center' },
  heading: { flex: 1, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  headerButton: { minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' },
  headerText: { fontSize: 13, fontFamily: SANS_SEMIBOLD },
  arrow: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.285714%', textAlign: 'center', fontSize: 10, paddingVertical: 8 },
  day: { width: '14.285714%', minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  option: { width: '33.333333%', minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  optionText: { fontSize: 12, textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 6 },
  footerButton: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  action: { fontFamily: SANS_SEMIBOLD, fontSize: 12 },
});
