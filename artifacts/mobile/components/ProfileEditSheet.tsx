import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_SEMIBOLD } from '@/constants/fonts';
import { accentShadow } from '@/utils/shadow';
import { BottomSheet } from '@/components/BottomSheet';
import { useLocalization } from '@/context/LocalizationContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ProfileEditSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const { language } = useLocalization();
  const en = language === 'en';
  const { user } = useUser();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pre-fill when the sheet opens
  useEffect(() => {
    if (visible && user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
      setLocalImageUri(null);
    }
  }, [visible, user]);

  // Avatar preview: local pick > Clerk imageUrl > initials
  const previewUri = localImageUri ?? user?.imageUrl ?? null;
  const initials = (() => {
    const f = firstName.trim() || user?.firstName;
    const l = lastName.trim() || user?.lastName;
    if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
    if (f) return f.slice(0, 2).toUpperCase();
    return '?';
  })();

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
           en ? 'Permission required' : 'Permission requise',
           en ? 'Allow access to your photos to change your profile picture.' : 'Autorisez l’accès à vos photos pour changer votre photo de profil.',
           [{ text: 'OK' }],
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        setLocalImageUri(result.assets[0].uri);
      }
    } catch {
       Alert.alert(en ? 'Error' : 'Erreur', en ? 'Unable to access the photo library.' : 'Impossible d’accéder à la galerie.');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first) {
       Alert.alert(en ? 'First name required' : 'Prénom requis', en ? 'Please enter your first name.' : 'Veuillez saisir votre prénom.');
      return;
    }

    setSaving(true);
    try {
      // Update first/last name if changed
      if (first !== (user.firstName ?? '') || last !== (user.lastName ?? '')) {
        await user.update({ firstName: first, lastName: last || undefined });
      }

      // Upload new photo if one was picked
      if (localImageUri) {
        const response = await fetch(localImageUri);
        const blob = await response.blob();
        await user.setProfileImage({ file: blob });
      }

      // Reload the Clerk user object so every mounted useUser() consumer
      // (profile hero, header, sidebar, etc.) receives the fresh imageUrl
      // without requiring a full app restart.
      // Pattern: always call user.reload() after any mutation that changes
      // user.imageUrl or user.firstName/lastName, so all avatar display sites
      // stay in sync automatically.
      await user.reload();

      onClose();
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.message ??
        err?.message ??
         (en ? 'Unable to save changes.' : 'Impossible de sauvegarder les modifications.');
       Alert.alert(en ? 'Error' : 'Erreur', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
       eyebrow={en ? 'PROFILE' : 'PROFIL'}
       title={en ? 'Edit profile' : 'Modifier le profil'}
    >
      <View style={ed.body}>
        {/* Avatar picker */}
        <View style={ed.avatarRow}>
          <TouchableOpacity
            onPress={pickImage}
            activeOpacity={0.82}
            style={ed.avatarWrap}
             accessibilityLabel={en ? 'Change profile picture' : 'Changer la photo de profil'}
          >
            <LinearGradient
              colors={[colors.gold + 'AA', colors.rose + '88', colors.plumLight + '66']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[ed.avatarRing, accentShadow('lg')]}
            >
              {previewUri ? (
                <Image source={{ uri: previewUri }} style={ed.avatarImage} />
              ) : (
                <View style={ed.avatarInner}>
                  <Text style={[ed.avatarInitials, { fontFamily: SERIF }]}>{initials}</Text>
                </View>
              )}
            </LinearGradient>
            {/* Camera badge */}
            <View style={[ed.cameraBadge, { backgroundColor: colors.plum, borderColor: colors.card }]}>
              <Feather name="camera" size={11} color="#FBF5FB" />
            </View>
          </TouchableOpacity>
          <Text style={[ed.photoHint, { fontFamily: SANS, color: colors.mutedForeground }]}>
             {en ? 'Tap to change photo' : 'Appuyez pour changer la photo'}
          </Text>
        </View>

        {/* Name fields */}
        <View style={ed.fields}>
          <View style={ed.fieldGroup}>
             <Text style={[ed.label, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>{en ? 'FIRST NAME' : 'PRÉNOM'}</Text>
            <TextInput
              style={[
                ed.input,
                {
                  fontFamily: SANS,
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              value={firstName}
              onChangeText={setFirstName}
               placeholder={en ? 'Your first name' : 'Votre prénom'}
              placeholderTextColor={colors.mutedForeground + '88'}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
          <View style={ed.fieldGroup}>
             <Text style={[ed.label, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>{en ? 'LAST NAME' : 'NOM'}</Text>
            <TextInput
              style={[
                ed.input,
                {
                  fontFamily: SANS,
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              value={lastName}
              onChangeText={setLastName}
               placeholder={en ? 'Your last name' : 'Votre nom de famille'}
              placeholderTextColor={colors.mutedForeground + '88'}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          onPress={handleSave}
          activeOpacity={saving ? 1 : 0.82}
          disabled={saving}
          style={[ed.saveBtn, { opacity: saving ? 0.72 : 1 }]}
        >
          <LinearGradient
            colors={[colors.plumDark, colors.plum]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={ed.saveBtnGrad}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FBF5FB" />
            ) : (
               <Text style={[ed.saveBtnText, { fontFamily: SANS_SEMIBOLD }]}>{en ? 'Save' : 'Enregistrer'}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const ed = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, gap: 24 },

  avatarRow: { alignItems: 'center', gap: 10 },
  avatarWrap: { position: 'relative' },
  avatarRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  avatarInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(60,26,60,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarInitials: { fontSize: 34, color: '#C8A96E', lineHeight: 36 },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHint: { fontSize: 11, letterSpacing: 0.2 },

  fields: { gap: 14 },
  fieldGroup: { gap: 5 },
  label: { fontSize: 9, letterSpacing: 1.4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },

  saveBtn: { borderRadius: 10, overflow: 'hidden' },
  saveBtnGrad: { paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 14, color: '#FBF5FB', letterSpacing: 0.3 },
});
