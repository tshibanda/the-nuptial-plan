import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Linking, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { SANS, SANS_MEDIUM, SANS_SEMIBOLD, SERIF } from '@/constants/fonts';

type Board = { id: string; title: string; description: string; imageUri: string; sourceUrl: string; accent: string };
const STORAGE_KEY = 'tnp-moodboards';
const accents = ['#C8A96E', '#CC8C94', '#649064', '#7A4A7A'];

async function loadBoards() {
  try {
    const raw = Platform.OS === 'web' ? localStorage.getItem(STORAGE_KEY) : await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as Board[] : [];
  } catch { return []; }
}

function linkPreviewUri(url: string) {
  return `https://image.thum.io/get/width/900/crop/650/noanimate/${url}`;
}

export default function MoodboardsScreen() {
  const colors = useColors();
  const [boards, setBoards] = useState<Board[]>([]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [accent, setAccent] = useState(accents[0]);

  useEffect(() => { void loadBoards().then(setBoards); }, []);

  const persist = (next: Board[]) => {
    setBoards(next);
    const raw = JSON.stringify(next);
    if (Platform.OS === 'web') localStorage.setItem(STORAGE_KEY, raw);
    else void AsyncStorage.setItem(STORAGE_KEY, raw);
  };

  const chooseImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Accès aux photos', 'Autorisez l’accès à votre photothèque pour ajouter une inspiration.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.86,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const save = () => {
    if (!title.trim() || (!imageUri && !sourceUrl.trim())) {
      Alert.alert('Moodboard incomplet', 'Ajoutez un titre et une image ou un lien Pinterest, Instagram ou Canva.');
      return;
    }
    const savedSourceUrl = sourceUrl.trim();
    persist([{ id: `${Date.now()}`, title: title.trim(), description: description.trim(), imageUri: imageUri || (savedSourceUrl ? linkPreviewUri(savedSourceUrl) : ''), sourceUrl: savedSourceUrl, accent }, ...boards]);
    setTitle(''); setDescription(''); setImageUri(''); setSourceUrl(''); setAccent(accents[0]); setAdding(false);
  };

  const empty = useMemo(() => boards.length === 0, [boards.length]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={boards}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <LinearGradient colors={[colors.plumDark, colors.plum, colors.plumLight]} style={styles.hero}>
              <Text style={[styles.eyebrow, { color: colors.gold, fontFamily: SANS_MEDIUM }]}>INSPIRATION VISUELLE</Text>
              <Text style={[styles.heroTitle, { color: '#FBF5FB', fontFamily: SERIF }]}>Moodboards</Text>
              <Text style={[styles.heroBody, { color: '#F7EAF4', fontFamily: SANS }]}>Créez des univers visuels pour vos propositions, vos rendez-vous clients et vos mariages.</Text>
            </LinearGradient>
            <View style={styles.toolbar}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: SERIF }]}>Vos inspirations</Text>
                <Text style={[styles.sectionBody, { color: colors.mutedForeground, fontFamily: SANS }]}>{boards.length ? `${boards.length} univers enregistré${boards.length > 1 ? 's' : ''}` : 'Une bibliothèque visuelle à construire'}</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={adding ? 'Fermer le formulaire' : 'Ajouter un moodboard'} onPress={() => setAdding(!adding)} style={[styles.iconButton, { backgroundColor: colors.plum }]}>
                <Feather name={adding ? 'x' : 'plus'} size={19} color="#fff" />
              </TouchableOpacity>
            </View>
            {adding && <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.formTitle, { color: colors.foreground, fontFamily: SERIF }]}>Nouveau moodboard</Text>
              <TouchableOpacity onPress={chooseImage} style={[styles.imagePicker, { borderColor: colors.border, backgroundColor: colors.background }]}>
                {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : <><Feather name="image" size={24} color={colors.plum} /><Text style={[styles.pickerText, { color: colors.mutedForeground, fontFamily: SANS }]}>Choisir une image</Text></>}
              </TouchableOpacity>
              <TextInput value={sourceUrl} onChangeText={setSourceUrl} placeholder="Lien Pinterest, Instagram ou Canva (https://…)" placeholderTextColor={colors.mutedForeground} autoCapitalize="none" keyboardType="url" style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />
              {sourceUrl ? <Text style={[styles.linkHint, { color: colors.mutedForeground, fontFamily: SANS }]}>Le lien sera conservé avec l’inspiration et ouvert au toucher.</Text> : null}
              <TextInput value={title} onChangeText={setTitle} placeholder="Nom de l’univers *" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />
              <TextInput value={description} onChangeText={setDescription} placeholder="Intention, couleurs, notes…" placeholderTextColor={colors.mutedForeground} multiline style={[styles.input, styles.textarea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />
              <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: SANS }]}>Couleur repère</Text>
              <View style={styles.accentRow}>{accents.map((item) => <TouchableOpacity key={item} onPress={() => setAccent(item)} accessibilityLabel={`Choisir la couleur ${item}`} style={[styles.swatch, { backgroundColor: item }, accent === item && styles.swatchSelected]} />)}</View>
              <TouchableOpacity onPress={save} style={[styles.saveButton, { backgroundColor: colors.plum }]}><Text style={[styles.saveText, { fontFamily: SANS_SEMIBOLD }]}>Enregistrer le moodboard</Text></TouchableOpacity>
            </View>}
          </>
        }
        ListEmptyComponent={<View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="image" size={28} color={colors.goldDim} /><Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: SERIF }]}>Votre galerie est prête</Text><Text style={[styles.emptyBody, { color: colors.mutedForeground, fontFamily: SANS }]}>Ajoutez une première inspiration pour donner une direction à vos futurs mariages.</Text></View>}
        renderItem={({ item }) => <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.accentBar, { backgroundColor: item.accent }]} />
           <Image source={{ uri: item.imageUri || (item.sourceUrl ? linkPreviewUri(item.sourceUrl) : '') }} style={styles.cardImage} />
           <View style={styles.cardContent}><View style={styles.cardHeading}><Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: SERIF }]}>{item.title}</Text><TouchableOpacity onPress={() => Alert.alert('Supprimer ce moodboard ?', item.title, [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: () => persist(boards.filter((board) => board.id !== item.id)) }])}><Feather name="trash-2" size={16} color={colors.mutedForeground} /></TouchableOpacity></View>{item.description ? <Text style={[styles.cardDescription, { color: colors.mutedForeground, fontFamily: SANS }]}>{item.description}</Text> : null}{item.sourceUrl ? <TouchableOpacity onPress={() => void Linking.openURL(item.sourceUrl)} style={styles.sourceLink}><Feather name="external-link" size={12} color={colors.plum} /><Text style={[styles.sourceText, { color: colors.plum, fontFamily: SANS_MEDIUM }]} numberOfLines={1}>{item.sourceUrl}</Text></TouchableOpacity> : null}</View>
        </View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingBottom: 230 },
  hero: { padding: 24, paddingTop: Platform.OS === 'web' ? 86 : 30, paddingBottom: 28, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  eyebrow: { fontSize: 10, letterSpacing: 1.8, marginBottom: 9 },
  heroTitle: { fontSize: 40, lineHeight: 44 },
  heroBody: { marginTop: 14, maxWidth: 520, fontSize: 13, lineHeight: 20 },
  toolbar: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 25 },
  sectionBody: { marginTop: 4, fontSize: 11 },
  iconButton: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  form: { marginHorizontal: 16, marginBottom: 16, padding: 16, borderWidth: 1, borderRadius: 16, gap: 10 },
  formTitle: { fontSize: 24, marginBottom: 2 },
  imagePicker: { height: 150, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 8 },
  preview: { width: '100%', height: '100%' },
  pickerText: { fontSize: 12 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, fontSize: 12 },
  textarea: { minHeight: 76, paddingTop: 12, textAlignVertical: 'top' },
  label: { fontSize: 11, marginTop: 3 },
  accentRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  swatch: { width: 26, height: 26, borderRadius: 13 },
  swatchSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#3C1A3C', shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  saveButton: { minHeight: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveText: { color: '#fff', fontSize: 11 },
  linkHint: { fontSize: 10, lineHeight: 14 },
  empty: { marginHorizontal: 16, marginTop: 10, padding: 32, borderWidth: 1, borderRadius: 16, alignItems: 'center' },
  emptyTitle: { fontSize: 24, marginTop: 12 },
  emptyBody: { fontSize: 11, lineHeight: 18, textAlign: 'center', marginTop: 7, maxWidth: 270 },
  card: { marginHorizontal: 16, marginBottom: 14, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  accentBar: { height: 4 },
  cardImage: { width: '100%', height: 190, backgroundColor: '#E9DFE7' },
  cardContent: { padding: 14 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTitle: { flex: 1, fontSize: 23 },
  cardDescription: { fontSize: 11, lineHeight: 17, marginTop: 6 },
  sourceLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  sourceText: { flex: 1, fontSize: 10 },
});