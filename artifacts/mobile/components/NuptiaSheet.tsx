/**
 * NuptiaSheet — Floating AI assistant for mobile
 * Jardin Parisien brand · plum gradient panel · SSE streaming
 */
import { useState, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@clerk/expo';
import { useListWeddings } from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { shadow } from '@/utils/shadow';

// ── API ───────────────────────────────────────────────────────────────────────
const _DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
const API_BASE = _DOMAIN ? `https://${_DOMAIN}` : '';

async function apiCreateConversation(token: string | null): Promise<number> {
  const res = await fetch(`${API_BASE}/api/openai/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ title: 'Nuptia' }),
  });
  if (!res.ok) throw new Error('conversation');
  const data = (await res.json()) as { id: number };
  return data.id;
}

async function apiSendMessage(
  convId: number,
  content: string,
  weddingContext: string,
  token: string | null,
): Promise<string> {
  const res = await fetch(
    `${API_BASE}/api/openai/conversations/${convId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content, weddingContext }),
    },
  );
  if (!res.ok) throw new Error('send');

  // Collect full SSE response then parse tokens
  const text = await res.text();
  let full = '';
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const raw = line.slice(6).trim();
    if (!raw || raw === '[DONE]') continue;
    try {
      const p = JSON.parse(raw) as {
        content?: string;
        done?: boolean;
        error?: string;
      };
      if (p.error) throw new Error(p.error);
      if (p.content) full += p.content;
    } catch {
      // skip malformed line
    }
  }
  return full || '…';
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME: Msg = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Bonjour\u202f! Je suis **Nuptia**, votre assistante de mariage. Posez-moi vos questions sur l\u2019organisation, le budget, les prestataires ou tout ce qui touche à votre grand jour\u2728',
};

// ── Bold-only markdown renderer ───────────────────────────────────────────────
function RichText({ text, style }: { text: string; style?: object }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <Text key={i} style={{ fontFamily: SANS_SEMIBOLD }}>
            {part.slice(2, -2)}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        ),
      )}
    </Text>
  );
}

// ── Nuptia avatar ─────────────────────────────────────────────────────────────
function NuptiaAvatar({ size = 28 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(200,169,110,0.16)',
        borderWidth: 1,
        borderColor: 'rgba(200,169,110,0.32)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Feather name="zap" size={size * 0.46} color="#C8A96E" />
    </View>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingBubble({ cardBg, borderColor }: { cardBg: string; borderColor: string }) {
  return (
    <View style={[ss.msgRow, ss.msgRowAssistant]}>
      <NuptiaAvatar size={28} />
      <View style={[ss.bubble, ss.bubbleAssistant, { backgroundColor: cardBg, borderColor }]}>
        <ActivityIndicator size="small" color="#5D2D5D" />
      </View>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function NuptiaSheet() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { selectedWeddingId } = useWedding();
  const { data: weddings } = useListWeddings();
  const wedding =
    weddings?.find((w) => w.id === selectedWeddingId) ?? weddings?.[0];

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Wedding context string sent with each message
  const weddingContext = wedding
    ? [
        `Mariage\u202f: ${wedding.names}`,
        wedding.weddingDate ? `Date\u202f: ${wedding.weddingDate}` : '',
        wedding.venue ? `Lieu\u202f: ${wedding.venue}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  const scrollToBottom = () =>
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

  const openSheet = async () => {
    setOpen(true);
    scrollToBottom();
    if (!convId) {
      try {
        const token = await getToken();
        const id = await apiCreateConversation(token);
        setConvId(id);
      } catch {
        /* silent – will retry on first send */
      }
    }
  };

  const closeSheet = () => setOpen(false);

  const resetConversation = async () => {
    setMessages([WELCOME]);
    try {
      const token = await getToken();
      const id = await apiCreateConversation(token);
      setConvId(id);
    } catch {}
  };

  const send = useCallback(async () => {
    const content = input.trim();
    if (!content || loading) return;
    setInput('');
    setLoading(true);

    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', content };
    setMessages((prev) => [...prev, userMsg]);
    scrollToBottom();

    try {
      let cid = convId;
      if (!cid) {
        const token = await getToken();
        cid = await apiCreateConversation(token);
        setConvId(cid);
      }
      const token = await getToken();
      const reply = await apiSendMessage(cid, content, weddingContext, token);
      const assistantMsg: Msg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: reply,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content:
            'Je rencontre une difficulté momentanée. Réessayez dans quelques instants.',
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [input, loading, convId, getToken, weddingContext]);

  // ── Position the FAB just above the tab bar ─────────────────────────────────
  const tabBarH = Platform.OS === 'web' ? 74 : 70;
  // Keep the assistant clear of both the tab bar and the last content row.
  // Screens reserve this same bottom zone in their list/scroll content.
  const fabBottom = tabBarH + (Platform.OS === 'ios' ? insets.bottom : 0) + 14;

  return (
    <>
      {/* ── FAB ── */}
      <TouchableOpacity
        onPress={openSheet}
        activeOpacity={0.85}
        style={[
          ss.fab,
          shadow('lg'),
          { bottom: fabBottom, right: 20 },
        ]}
        accessibilityLabel="Ouvrir Nuptia"
        accessibilityRole="button"
      >
        <LinearGradient
          colors={['#3C1A3C', '#5D2D5D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={ss.fabGradient}
        >
          <Feather name="message-circle" size={22} color="#C8A96E" />
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Sheet modal ── */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
        statusBarTranslucent
      >
        <View style={ss.backdrop}>
          {/* Tap-outside to close */}
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[
              ss.sheet,
              { backgroundColor: colors.background, paddingBottom: insets.bottom || 8 },
            ]}
          >
            {/* ── Header ── */}
            <LinearGradient
              colors={['#3C1A3C', '#5D2D5D', '#7A4A7A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={ss.header}
            >
              {/* gold rim */}
              <View style={ss.goldBar} pointerEvents="none" />
              {/* decorative blob */}
              <View
                style={[ss.blob, { backgroundColor: 'rgba(200,169,110,0.14)' }]}
                pointerEvents="none"
              />

              {/* Drag handle */}
              <View style={ss.handle} />

              <View style={ss.headerRow}>
                <NuptiaAvatar size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={[ss.headerTitle, { fontFamily: SERIF }]}>Nuptia</Text>
                  <Text style={[ss.headerSub, { fontFamily: SANS }]}>
                    Assistante de mariage
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={resetConversation}
                  style={ss.headerIconBtn}
                  hitSlop={8}
                  accessibilityLabel="Nouvelle conversation"
                >
                  <Feather name="refresh-cw" size={14} color="rgba(255,255,255,0.55)" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={closeSheet}
                  style={ss.headerIconBtn}
                  hitSlop={8}
                  accessibilityLabel="Fermer"
                >
                  <Feather name="x" size={17} color="rgba(255,255,255,0.75)" />
                </TouchableOpacity>
              </View>

              {/* Wedding chip */}
              {wedding && (
                <View style={ss.chip}>
                  <Feather name="heart" size={9} color="#C8A96E" />
                  <Text style={[ss.chipText, { fontFamily: SANS_MEDIUM }]}>
                    {wedding.names}
                  </Text>
                </View>
              )}
            </LinearGradient>

            {/* ── Messages ── */}
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={[ss.msgList, { backgroundColor: colors.background }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    ss.msgRow,
                    msg.role === 'user' ? ss.msgRowUser : ss.msgRowAssistant,
                  ]}
                >
                  {msg.role === 'assistant' && <NuptiaAvatar size={28} />}
                  <View
                    style={[
                      ss.bubble,
                      msg.role === 'user'
                        ? [ss.bubbleUser, { backgroundColor: colors.plum }]
                        : [
                            ss.bubbleAssistant,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ],
                    ]}
                  >
                    <RichText
                      text={msg.content}
                      style={{
                        fontFamily: SANS,
                        fontSize: 13,
                        lineHeight: 19,
                        color:
                          msg.role === 'user' ? '#FBF5FB' : colors.foreground,
                      }}
                    />
                  </View>
                </View>
              ))}

              {loading && (
                <TypingBubble
                  cardBg={colors.card}
                  borderColor={colors.border}
                />
              )}
            </ScrollView>

            {/* ── Input bar ── */}
            <View
              style={[
                ss.inputBar,
                {
                  borderTopColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            >
              <TextInput
                style={[
                  ss.input,
                  {
                    fontFamily: SANS,
                    color: colors.foreground,
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                  },
                ]}
                value={input}
                onChangeText={setInput}
                placeholder="Posez votre question…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                maxLength={500}
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={send}
              />
              <TouchableOpacity
                onPress={send}
                disabled={loading || !input.trim()}
                activeOpacity={0.8}
                style={{ opacity: loading || !input.trim() ? 0.4 : 1 }}
                accessibilityLabel="Envoyer"
              >
                <LinearGradient
                  colors={['#3C1A3C', '#5D2D5D']}
                  style={ss.sendBtn}
                >
                  <Feather name="send" size={16} color="#C8A96E" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Disclaimer */}
            <Text
              style={[
                ss.disclaimer,
                { fontFamily: SANS, color: colors.mutedForeground },
              ]}
            >
              Nuptia peut faire des erreurs. Vérifiez les informations importantes.
            </Text>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  // FAB
  fab: {
    position: 'absolute',
    zIndex: 60,
    borderRadius: 26,
    overflow: 'hidden',
  },
  fabGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(28,8,28,0.42)',
  },
  sheet: {
    height: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  goldBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1.5,
    backgroundColor: 'rgba(200,169,110,0.35)',
  },
  blob: {
    position: 'absolute',
    top: -20, right: -20,
    width: 90, height: 90,
    borderRadius: 45,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    color: '#FBF5FB',
    lineHeight: 24,
  },
  headerSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 1,
  },
  headerIconBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.25)',
  },
  chipText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
  },

  // Messages
  msgList: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAssistant: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleAssistant: {
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: 4,
  },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  sendBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimer: {
    fontSize: 9,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
});
