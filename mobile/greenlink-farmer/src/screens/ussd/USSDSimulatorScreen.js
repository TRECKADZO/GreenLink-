import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../config';
import api from '../../services/api';

const USSD_CODE = '*123*45#';
const SMS_NUMBER = '1234';

const USSDSimulatorScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [currentText, setCurrentText] = useState('');
  const [response, setResponse] = useState('');
  const [inputValue, setInputValue] = useState('');

  // Message d'accueil par défaut
  const welcomeMessage = `Bienvenue chez GreenLink 🌳
La prime pour tes arbres !

1. Calculer ma prime carbone
2. Vendre mon cacao / anacarde
3. Voir mon historique
4. Aide / Infos
5. Quitter

→ Tape 1 (le plus utilisé)`;

  useEffect(() => {
    // Initialize session
    const newSessionId = `mobile_${Date.now()}`;
    setSessionId(newSessionId);
    setResponse(welcomeMessage);
  }, []);

  const sendUSSD = async (input, sid = sessionId) => {
    setLoading(true);
    try {
      const newText = currentText ? `${currentText}*${input}` : input;
      
      const res = await api.post('/ussd/callback', {
        sessionId: sid,
        serviceCode: USSD_CODE,
        phoneNumber: user?.phone_number || '+225000000000',
        text: newText,
      });
      
      setResponse(res.data.raw_response || res.data.text || 'Erreur');
      
      if (res.data.continue_session) {
        setCurrentText(newText);
      } else {
        // Session ended, reset
        setCurrentText('');
        const newSid = `mobile_${Date.now()}`;
        setSessionId(newSid);
      }
    } catch (error) {
      console.error('USSD error:', error);
      // Afficher réponse simulée en cas d'erreur
      handleLocalResponse(input);
    } finally {
      setLoading(false);
      setInputValue('');
    }
  };

  // Réponses locales simulées
  const handleLocalResponse = (input) => {
    const responses = {
      '1': `📊 CALCUL PRIME CARBONE

Surface totale: 3.5 ha
Arbres estimés: 1,750
Prime carbone: 87,500 FCFA/an

Détail:
- Cacao (2 ha): 50,000 FCFA
- Anacarde (1.5 ha): 37,500 FCFA

💰 Prime disponible: 43,750 FCFA

1. Demander paiement
2. Voir détails par parcelle
0. Retour`,
      '2': `🛒 VENDRE MA RÉCOLTE

Cours du jour (03/03/2026):
- Cacao: 1,200 FCFA/kg
- Anacarde: 450 FCFA/kg
- Café: 1,100 FCFA/kg

1. Déclarer une vente
2. Voir mes dernières ventes
3. Contacter un acheteur
0. Retour`,
      '3': `📋 MON HISTORIQUE

Dernières transactions:
✅ 15/02 - Prime +43,750 FCFA
✅ 02/02 - Vente cacao +180,000 FCFA
✅ 18/01 - Prime +21,875 FCFA

Solde actuel: 245,625 FCFA

1. Exporter historique
0. Retour`,
      '4': `ℹ️ AIDE & INFOS

GreenLink - Agriculture durable
Tél: +225 27 22 00 00 00
WhatsApp: +225 07 07 00 00 00

1. Comment calculer ma prime?
2. Comment vendre ma récolte?
3. Contacter un agent
0. Retour`,
      '5': `Merci d'avoir utilisé GreenLink! 🌳

À bientôt!`,
      '0': welcomeMessage,
    };
    
    setResponse(responses[input] || welcomeMessage);
    if (input === '5' || input === '0') {
      setCurrentText('');
    }
  };

  const handleQuickAction = (value) => {
    sendUSSD(value);
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      sendUSSD(inputValue.trim());
    }
  };

  // Insérer une commande dans le champ de saisie
  const insertCommand = (cmd) => {
    setInputValue(cmd);
  };

  // Ouvrir le composeur SMS avec la commande
  const openSMS = (command) => {
    const smsUrl = Platform.select({
      ios: `sms:${SMS_NUMBER}&body=${command}`,
      android: `sms:${SMS_NUMBER}?body=${command}`,
    });
    
    Linking.canOpenURL(smsUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(smsUrl);
        } else {
          // Fallback: copier dans le champ de saisie
          insertCommand(command);
          Alert.alert(
            'SMS non disponible',
            `Envoyez "${command}" au ${SMS_NUMBER} depuis votre application SMS.`
          );
        }
      })
      .catch(() => {
        insertCommand(command);
      });
  };

  // Ouvrir le composeur USSD
  const dialUSSD = () => {
    const ussdUrl = `tel:${encodeURIComponent(USSD_CODE)}`;
    Linking.canOpenURL(ussdUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(ussdUrl);
        } else {
          Alert.alert('Info', `Composez ${USSD_CODE} sur votre téléphone.`);
        }
      })
      .catch(() => {
        Alert.alert('Info', `Composez ${USSD_CODE} sur votre téléphone.`);
      });
  };

  const resetSession = () => {
    const newSid = `mobile_${Date.now()}`;
    setSessionId(newSid);
    setCurrentText('');
    setResponse(welcomeMessage);
  };

  // Commandes SMS disponibles
  const smsCommands = [
    { cmd: 'SOLDE', desc: 'Voir mon solde' },
    { cmd: 'PRIME', desc: 'Ma prime carbone' },
    { cmd: 'VENTE', desc: 'Déclarer une vente' },
    { cmd: 'AIDE', desc: 'Obtenir de l\'aide' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Accès USSD / SMS</Text>
        <TouchableOpacity onPress={resetSession} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Dial USSD Button */}
        <TouchableOpacity style={styles.dialButton} onPress={dialUSSD}>
          <Ionicons name="call" size={24} color={COLORS.white} />
          <View style={styles.dialTextContainer}>
            <Text style={styles.dialButtonText}>Composer {USSD_CODE}</Text>
            <Text style={styles.dialButtonSubtext}>Sur téléphone basique</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.white} />
        </TouchableOpacity>

        {/* Phone Simulator */}
        <View style={styles.phoneFrame}>
          {/* Phone Status Bar */}
          <View style={styles.phoneStatusBar}>
            <Text style={styles.statusText}>Orange CI</Text>
            <Text style={styles.statusText}>{USSD_CODE}</Text>
          </View>

          {/* USSD Screen */}
          <View style={styles.ussdScreen}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Chargement...</Text>
              </View>
            ) : (
              <Text style={styles.ussdText}>{response}</Text>
            )}
          </View>

          {/* Input Area */}
          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="Tapez 1, 2, 3..."
              placeholderTextColor="#999"
              keyboardType="number-pad"
              maxLength={3}
              onSubmitEditing={handleSubmit}
            />
            <TouchableOpacity 
              style={[styles.sendButton, !inputValue.trim() && styles.sendButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading || !inputValue.trim()}
            >
              <Text style={styles.sendButtonText}>Envoyer</Text>
              <Ionicons name="send" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Quick Number Pad */}
          <View style={styles.quickActions}>
            {['1', '2', '3', '4', '5'].map((num) => (
              <TouchableOpacity
                key={num}
                style={styles.quickButton}
                onPress={() => handleQuickAction(num)}
                disabled={loading}
              >
                <Text style={styles.quickButtonText}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[styles.quickButton, styles.backBtn]}
              onPress={() => handleQuickAction('0')}
              disabled={loading}
            >
              <Ionicons name="arrow-back" size={16} color={COLORS.white} />
              <Text style={styles.quickButtonText}> 0 Retour</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickButton, styles.homeBtn]}
              onPress={resetSession}
              disabled={loading}
            >
              <Ionicons name="home" size={16} color={COLORS.white} />
              <Text style={styles.quickButtonText}> Menu</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SMS Commands - Cliquables */}
        <View style={styles.smsCard}>
          <View style={styles.smsHeader}>
            <Ionicons name="chatbubbles" size={20} color={COLORS.primary} />
            <Text style={styles.smsTitle}>Commandes SMS</Text>
            <Text style={styles.smsNumber}>→ {SMS_NUMBER}</Text>
          </View>
          <Text style={styles.smsHint}>
            Appuyez sur une commande pour l'envoyer par SMS
          </Text>
          <View style={styles.smsCommands}>
            {smsCommands.map((item, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.smsCommandButton}
                onPress={() => openSMS(item.cmd)}
                activeOpacity={0.7}
              >
                <Text style={styles.smsCommandText}>{item.cmd}</Text>
                <Text style={styles.smsCommandDesc}>{item.desc}</Text>
                <Ionicons name="send-outline" size={14} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color="#2563eb" />
            <Text style={styles.infoTitle}>Sans Internet?</Text>
          </View>
          <Text style={styles.infoText}>
            Composez <Text style={styles.bold}>{USSD_CODE}</Text> depuis n'importe quel téléphone pour accéder à GreenLink sans connexion internet.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  dialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dialTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  dialButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  dialButtonSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  phoneFrame: {
    backgroundColor: '#1a1a1a',
    borderRadius: 28,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  phoneStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statusText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  ussdScreen: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    minHeight: 260,
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  ussdText: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  inputArea: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  sendButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  quickActionsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  quickButton: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  quickButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  backBtn: {
    flex: 1,
    backgroundColor: '#6b7280',
  },
  homeBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  smsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  smsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  smsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  smsNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  smsHint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  smsCommands: {
    gap: 8,
  },
  smsCommandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  smsCommandText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginRight: 12,
    minWidth: 60,
  },
  smsCommandDesc: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1e3a8a',
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
    color: '#1e40af',
  },
});

export default USSDSimulatorScreen;
