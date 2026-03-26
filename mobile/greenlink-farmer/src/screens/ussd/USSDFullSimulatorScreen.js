import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, SPACING } from '../../config';
import { processUSSD } from '../../services/ussdOfflineEngine';

/**
 * Simulateur USSD Interactif — 100% Offline
 * Utilisable par: cooperatives, agents terrain
 * 
 * Mode "demo" : simule exactement ce que voit un agriculteur
 * quand il compose *144*88# sur son telephone basique
 */
const USSDFullSimulatorScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const mode = route.params?.mode || 'cooperative'; // 'cooperative' | 'agent'
  const memberName = route.params?.memberName || '';

  const [history, setHistory] = useState([]);
  const [textHistory, setTextHistory] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const scrollRef = useRef(null);

  const title = mode === 'agent' 
    ? 'Demo USSD Agent Terrain' 
    : 'Simulateur USSD Cooperative';

  const startSession = () => {
    setHistory([]);
    setTextHistory('');
    setResult(null);
    setInputValue('');

    const response = processUSSD('');
    setHistory([{ type: 'system', text: response.text }]);
    setStep(response.step);
    setSessionActive(response.continue_session);
  };

  const handleSend = () => {
    const val = inputValue.trim();
    if (!val) return;

    // Ajouter la reponse utilisateur a l'historique
    setHistory(prev => [...prev, { type: 'user', text: val }]);

    const newText = textHistory ? `${textHistory}*${val}` : val;
    const response = processUSSD(newText);

    // Ajouter la reponse systeme
    setHistory(prev => [...prev, { type: 'system', text: response.text }]);
    setStep(response.step);
    setInputValue('');

    if (response.result) setResult(response.result);

    if (response.continue_session) {
      setTextHistory(newText);
      setSessionActive(true);
    } else {
      setTextHistory('');
      setSessionActive(false);
    }
  };

  const handleKeyPress = (val) => setInputValue(prev => prev + val);
  const handleDelete = () => setInputValue(prev => prev.slice(0, -1));

  const renderKeypad = () => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'];
    return (
      <View style={styles.keypad}>
        {keys.map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.key, key === 'DEL' && styles.keyDel]}
            onPress={() => key === 'DEL' ? handleDelete() : handleKeyPress(key)}
            activeOpacity={0.6}
          >
            {key === 'DEL' ? (
              <Ionicons name="backspace-outline" size={20} color="#666" />
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSub}>
            {memberName ? `Pour: ${memberName}` : 'Simulation *144*88#'}
          </Text>
        </View>
        <View style={styles.offlineBadge}>
          <Ionicons name="flash" size={10} color="#fff" />
          <Text style={styles.offlineText}>Offline</Text>
        </View>
      </View>

      {/* Info banner for agents */}
      {mode === 'agent' && !sessionActive && history.length === 0 && (
        <View style={styles.agentBanner}>
          <Ionicons name="information-circle" size={18} color="#2563eb" />
          <Text style={styles.agentBannerText}>
            Montrez a l'agriculteur comment utiliser *144*88# sur son telephone. 
            Cette demo reproduit exactement le flux USSD.
          </Text>
        </View>
      )}

      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.phoneFrame}>
          {/* Phone status bar */}
          <View style={styles.phoneStatusBar}>
            <View style={styles.statusLeft}>
              <Ionicons name="cellular" size={12} color="#333" />
              <Text style={styles.statusOperator}>Orange CI</Text>
            </View>
            <Text style={styles.statusCode}>*144*88#</Text>
          </View>

          {/* Conversation history */}
          <ScrollView
            ref={scrollRef}
            style={styles.chatArea}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {history.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.phoneIcon}>
                  <Ionicons name="phone-portrait-outline" size={48} color={COLORS.primary} />
                </View>
                <Text style={styles.emptyTitle}>Simulateur USSD</Text>
                <Text style={styles.emptyDesc}>
                  {mode === 'agent' 
                    ? "Appuyez sur 'Demarrer' pour montrer a l'agriculteur comment fonctionne le calcul de prime carbone par USSD."
                    : "Testez le flux USSD *144*88# comme si vous etiez sur un telephone basique. Aucune connexion internet requise."
                  }
                </Text>
                <TouchableOpacity style={styles.startBtn} onPress={startSession} data-testid="start-full-sim-btn">
                  <Ionicons name="play" size={18} color="#fff" />
                  <Text style={styles.startBtnText}>Demarrer *144*88#</Text>
                </TouchableOpacity>
              </View>
            ) : (
              history.map((msg, i) => (
                <View key={i} style={[styles.msgRow, msg.type === 'user' && styles.msgRowUser]}>
                  {msg.type === 'system' && (
                    <View style={styles.msgSystem}>
                      <View style={styles.msgSystemHeader}>
                        <Ionicons name="server-outline" size={12} color="#f97316" />
                        <Text style={styles.msgSystemLabel}>USSD</Text>
                        {step > 0 && step <= 9 && (
                          <Text style={styles.msgStep}>{step}/9</Text>
                        )}
                      </View>
                      <Text style={styles.msgSystemText}>{msg.text}</Text>
                    </View>
                  )}
                  {msg.type === 'user' && (
                    <View style={styles.msgUser}>
                      <Text style={styles.msgUserText}>{msg.text}</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>

          {/* Input area */}
          {sessionActive && (
            <View style={styles.inputArea}>
              <TextInput
                style={styles.input}
                value={inputValue}
                onChangeText={setInputValue}
                onSubmitEditing={handleSend}
                placeholder="Tapez votre reponse..."
                placeholderTextColor="#999"
                keyboardType="numeric"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.sendBtn, !inputValue.trim() && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!inputValue.trim()}
                data-testid="send-full-sim-btn"
              >
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Keypad */}
          {sessionActive && renderKeypad()}

          {/* Restart after result */}
          {!sessionActive && history.length > 0 && (
            <View style={styles.actionBar}>
              <TouchableOpacity style={styles.restartBtn} onPress={startSession}>
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text style={styles.restartBtnText}>Nouvelle simulation</Text>
              </TouchableOpacity>
              {result && (
                <View style={styles.resultBadge}>
                  <Text style={styles.resultBadgeText}>
                    Score: {result.score}/10 | ARS: {result.ars_level}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      <Text style={styles.footer}>
        {mode === 'agent' 
          ? 'Demo formation — Reproduit le flux *144*88# reel'
          : 'Simulation locale — Aucune donnee envoyee au serveur'}
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, paddingTop: SPACING.lg },
  backBtn: { padding: 8 },
  headerCenter: { flex: 1, marginLeft: SPACING.sm },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  offlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#22c55e', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  offlineText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  agentBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#dbeafe', marginHorizontal: SPACING.md, padding: 12, borderRadius: 10, marginBottom: 4 },
  agentBannerText: { flex: 1, color: '#1e40af', fontSize: 12, lineHeight: 18 },
  content: { flex: 1, padding: SPACING.sm },
  phoneFrame: { flex: 1, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, borderWidth: 3, borderColor: '#333' },
  phoneStatusBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f97316', paddingHorizontal: 14, paddingVertical: 8 },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  statusOperator: { color: '#fff', fontSize: 13, fontWeight: '600' },
  statusCode: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  chatArea: { flex: 1 },
  chatContent: { padding: 12, paddingBottom: 20 },
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  phoneIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  startBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, gap: 8 },
  startBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  msgRow: { marginBottom: 10 },
  msgRowUser: { alignItems: 'flex-end' },
  msgSystem: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 12, maxWidth: '90%', borderLeftWidth: 3, borderLeftColor: '#f97316' },
  msgSystemHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  msgSystemLabel: { color: '#f97316', fontSize: 11, fontWeight: '700' },
  msgStep: { color: '#999', fontSize: 10, marginLeft: 'auto' },
  msgSystemText: { color: '#333', fontSize: 13, lineHeight: 20 },
  msgUser: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, maxWidth: '50%' },
  msgUserText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  inputArea: { flexDirection: 'row', padding: 8, backgroundColor: '#f5f5f5', borderTopWidth: 1, borderTopColor: '#e5e5e5', gap: 8 },
  input: { flex: 1, backgroundColor: '#fff', borderWidth: 2, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  sendBtn: { backgroundColor: '#16a34a', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#f0f0f0', borderTopWidth: 1, borderTopColor: '#e5e5e5' },
  key: { width: '33.33%', paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#fff' },
  keyDel: { backgroundColor: '#f5f5f5' },
  keyText: { fontSize: 18, fontWeight: '600', color: '#333' },
  actionBar: { padding: 10, backgroundColor: '#f5f5f5', borderTopWidth: 1, borderTopColor: '#e5e5e5', gap: 8 },
  restartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 10, gap: 6 },
  restartBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  resultBadge: { backgroundColor: '#fef3c7', padding: 8, borderRadius: 8, alignItems: 'center' },
  resultBadgeText: { color: '#92400e', fontWeight: '600', fontSize: 12 },
  footer: { color: 'rgba(255,255,255,0.35)', fontSize: 10, textAlign: 'center', paddingVertical: 6 },
});

export default USSDFullSimulatorScreen;
