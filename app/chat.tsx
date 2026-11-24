import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { sendChat, type ChatMessage } from '../lib/server';
import { useTheme, type ThemeColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';

const SUGGESTION_KEYS = ['chat.s1', 'chat.s2', 'chat.s3'];

export default function ChatScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setSending(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const { reply } = await sendChat(next);
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: t('chat.error') }]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('chat.title')}</Text>
          <Text style={styles.subtitle}>{t('chat.subtitle')}</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.close}>{t('common.close')}</Text>
        </TouchableOpacity>
      </View>

      {messages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🛍️</Text>
          <Text style={styles.emptyTitle}>{t('chat.emptyTitle')}</Text>
          <Text style={styles.emptyText}>{t('chat.emptyText')}</Text>
          {SUGGESTION_KEYS.map((k) => (
            <TouchableOpacity key={k} style={styles.suggestion} onPress={() => send(t(k))} activeOpacity={0.8}>
              <Text style={styles.suggestionText}>{t(k)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          renderItem={({ item }) => (
            <View style={[styles.bubbleRow, item.role === 'user' ? styles.rowUser : styles.rowAssistant]}>
              <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
                <Text style={item.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant}>{item.content}</Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            sending ? (
              <View style={[styles.bubbleRow, styles.rowAssistant]}>
                <View style={[styles.bubble, styles.bubbleAssistant]}>
                  <ActivityIndicator color={colors.textMuted} />
                </View>
              </View>
            ) : null
          }
        />
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder={t('chat.inputPlaceholder')}
          placeholderTextColor={colors.textFaint}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={() => send(input)}
          disabled={!input.trim() || sending}
        >
          <Text style={styles.sendText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg, paddingTop: 50 },
    header: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 14,
      borderBottomWidth: 1, borderBottomColor: c.borderSoft,
    },
    title: { fontSize: 18, fontWeight: '800', color: c.text },
    subtitle: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    close: { color: c.primary, fontWeight: '700', fontSize: 15 },

    empty: { flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 40 },
    emptyEmoji: { fontSize: 44, marginBottom: 10 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: c.text, marginBottom: 6 },
    emptyText: { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    suggestion: {
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14,
      paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10, width: '100%',
    },
    suggestionText: { color: c.text, fontSize: 14, fontWeight: '600' },

    bubbleRow: { flexDirection: 'row', marginBottom: 10 },
    rowUser: { justifyContent: 'flex-end' },
    rowAssistant: { justifyContent: 'flex-start' },
    bubble: { maxWidth: '82%', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 },
    bubbleUser: { backgroundColor: c.primary, borderBottomRightRadius: 4 },
    bubbleAssistant: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderBottomLeftRadius: 4 },
    bubbleTextUser: { color: c.primaryText, fontSize: 15, lineHeight: 21 },
    bubbleTextAssistant: { color: c.text, fontSize: 15, lineHeight: 21 },

    inputBar: {
      flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 8,
      borderTopWidth: 1, borderTopColor: c.borderSoft, backgroundColor: c.surface,
    },
    input: {
      flex: 1, backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.border, borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 10 : 6, fontSize: 15, color: c.text, maxHeight: 120,
    },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    sendBtnDisabled: { opacity: 0.4 },
    sendText: { color: c.primaryText, fontSize: 18, fontWeight: '800' },
  });
