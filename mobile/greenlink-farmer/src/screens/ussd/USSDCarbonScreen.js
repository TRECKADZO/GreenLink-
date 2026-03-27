import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING } from '../../config';
import { processUSSD } from '../../services/ussdOfflineEngine';

const USSDCarbonScreen = () => {
  const navigation = useNavigation();
  const [textHistory, setTextHistory] = useState('');
  const [screen, setScreen] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const scrollRef = useRef(null);

  const startSession = () => {
    setTextHistory('');
    setResult(null);
    const response = processUSSD('');
    setScreen(response.text);
    setStep(response.step);
    setSessionActive(response.continue_session);
  };

  const handleSend = () => {
    const val = inputValue.trim();
    if (!val) return;

    const newText = textHistory ? `${textHistory}*${val}` : val;
    const response = processUSSD(newText);

    setScreen(response.text);
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
              <Ionicons name="backspace-outline" size={22} color="#666" />
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>*144*99#</Text>
          <Text style={styles.headerSub}>Prime Carbone</Text>
        </View>
        {sessionActive && (
          <View style={styles.stepBadge}>
            <Text style={styles.stepText}>{step}/14</Text>
          </View>
        )}
        <View style={styles.offlineBadge}>
          <Ionicons name="wifi-outline" size={10} color="#fff" />
          <Text style={styles.offlineText}>Offline</Text>
        </View>
      </View>

      {!sessionActive && !screen && (
        <View style={styles.howItWorks}>
          <Text style={styles.howTitle}>En moins de 60 secondes</Text>
          <View style={styles.howSteps}>
            <View style={styles.howStep}>
              <View style={styles.howIcon}>
                <Ionicons name="call" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.howText}>Composez{'\n'}*144*99#</Text>
            </View>
            <View style={styles.howStep}>
              <View style={styles.howIcon}>
                <Text style={{ fontWeight: 'bold', color: COLORS.primary, fontSize: 14 }}>14</Text>
              </View>
              <Text style={styles.howText}>14 questions{'\n'}simples</Text>
            </View>
            <View style={styles.howStep}>
              <View style={styles.howIcon}>
                <Text style={{ fontWeight: 'bold', color: COLORS.primary, fontSize: 12 }}>FCFA</Text>
              </View>
              <Text style={styles.howText}>Recevez{'\n'}votre prime</Text>
            </View>
          </View>
        </View>
      )}

      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.ussdContainer}>
          <View style={styles.ussdHeader}>
            <Ionicons name="cellular" size={14} color="#fff" />
            <Text style={styles.ussdOperator}>Orange CI</Text>
            <Text style={styles.ussdCode}>*144*99#</Text>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.ussdScreen}
            contentContainerStyle={styles.ussdContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {!sessionActive && !screen ? (
              <View style={styles.welcomeContainer}>
                <View style={styles.welcomeIcon}>
                  <Ionicons name="leaf" size={40} color={COLORS.primary} />
                </View>
                <Text style={styles.welcomeTitle}>Calculateur Prime Carbone</Text>
                <Text style={styles.welcomeDesc}>
                  Repondez a 14 questions simples pour connaitre votre prime carbone estimee en FCFA/kg
                </Text>
                <TouchableOpacity style={styles.startBtn} onPress={startSession} data-testid="start-ussd-btn">
                  <Ionicons name="call" size={20} color="#fff" />
                  <Text style={styles.startBtnText}>Composer *144*99#</Text>
                </TouchableOpacity>
                <Text style={styles.offlineNote}>Fonctionne sans internet</Text>
              </View>
            ) : (
              <Text style={styles.responseText}>{screen}</Text>
            )}
          </ScrollView>

          {sessionActive && (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={inputValue}
                onChangeText={setInputValue}
                onSubmitEditing={handleSend}
                placeholder="Votre reponse..."
                placeholderTextColor="#999"
                keyboardType="numeric"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.sendBtn, !inputValue.trim() && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!inputValue.trim()}
                data-testid="send-ussd-btn"
              >
                <Text style={styles.sendBtnText}>OK</Text>
              </TouchableOpacity>
            </View>
          )}

          {sessionActive && renderKeypad()}

          {!sessionActive && screen && (
            <View style={styles.restartContainer}>
              <TouchableOpacity style={styles.restartBtn} onPress={startSession} data-testid="restart-ussd-btn">
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={styles.restartBtnText}>Recalculer ma prime</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      <Text style={styles.footerText}>
        Calcul 100% local - En production, composez *144*99# depuis tout telephone
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, paddingTop: SPACING.lg },
  backBtn: { padding: 8 },
  headerCenter: { flex: 1, marginLeft: SPACING.sm },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  stepBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  stepText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  offlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#22c55e', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginLeft: 6 },
  offlineText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  howItWorks: { backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: SPACING.md, borderRadius: 12, padding: SPACING.md, marginBottom: SPACING.sm },
  howTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14, textAlign: 'center', marginBottom: SPACING.sm },
  howSteps: { flexDirection: 'row', justifyContent: 'space-around' },
  howStep: { alignItems: 'center' },
  howIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#d4a574', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  howText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, textAlign: 'center' },
  content: { flex: 1, padding: SPACING.md },
  ussdContainer: { flex: 1, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  ussdHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f97316', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  ussdOperator: { color: 'rgba(255,255,255,0.8)', fontSize: 12, flex: 1 },
  ussdCode: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  ussdScreen: { flex: 1, minHeight: 200 },
  ussdContent: { padding: 16, flexGrow: 1 },
  welcomeContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
  welcomeIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  welcomeTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
  welcomeDesc: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 24, paddingHorizontal: 10, lineHeight: 20 },
  startBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f97316', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, gap: 8 },
  startBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  offlineNote: { marginTop: 12, color: '#22c55e', fontSize: 12, fontWeight: '500' },
  responseText: { fontSize: 14, color: '#333', lineHeight: 22 },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#f5f5f5', borderTopWidth: 1, borderTopColor: '#e5e5e5', gap: 8 },
  input: { flex: 1, backgroundColor: '#fff', borderWidth: 2, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  sendBtn: { backgroundColor: '#16a34a', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#f0f0f0', borderTopWidth: 1, borderTopColor: '#e5e5e5' },
  key: { width: '33.33%', paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#fff' },
  keyDel: { backgroundColor: '#f5f5f5' },
  keyText: { fontSize: 20, fontWeight: '600', color: '#333' },
  restartContainer: { padding: 12, backgroundColor: '#f5f5f5', borderTopWidth: 1, borderTopColor: '#e5e5e5' },
  restartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f97316', paddingVertical: 14, borderRadius: 10, gap: 8 },
  restartBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  footerText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', paddingVertical: 8 },
});

export default USSDCarbonScreen;
