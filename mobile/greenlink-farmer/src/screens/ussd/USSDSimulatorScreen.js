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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../config';
import api from '../../services/api';

const USSDSimulatorScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [currentText, setCurrentText] = useState('');
  const [response, setResponse] = useState('');
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    // Initialize session and load main menu
    const newSessionId = `mobile_${Date.now()}`;
    setSessionId(newSessionId);
    sendUSSD('', newSessionId);
  }, []);

  const sendUSSD = async (input, sid = sessionId) => {
    setLoading(true);
    try {
      const newText = currentText ? `${currentText}*${input}` : input;
      
      const res = await api.post('/ussd/callback', {
        sessionId: sid,
        serviceCode: '*123*45#',
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
      setResponse('Erreur de connexion. Vérifiez votre connexion internet.');
    } finally {
      setLoading(false);
      setInputValue('');
    }
  };

  const handleQuickAction = (value) => {
    if (value === '0' && currentText) {
      // Go back
      const parts = currentText.split('*');
      parts.pop();
      setCurrentText(parts.join('*'));
    } else if (value === '00') {
      // Reset to main menu
      setCurrentText('');
    }
    sendUSSD(value);
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      sendUSSD(inputValue.trim());
    }
  };

  const resetSession = () => {
    const newSid = `mobile_${Date.now()}`;
    setSessionId(newSid);
    setCurrentText('');
    sendUSSD('', newSid);
  };

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
        <Text style={styles.headerTitle}>Accès USSD</Text>
        <TouchableOpacity onPress={resetSession} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="phone-portrait" size={24} color={COLORS.primary} />
            <Text style={styles.infoTitle}>Comment utiliser?</Text>
          </View>
          <Text style={styles.infoText}>
            Sur un téléphone basique, composez <Text style={styles.bold}>*123*45#</Text> pour accéder à ce menu sans internet.
          </Text>
          <Text style={styles.infoText}>
            Ou envoyez un SMS au <Text style={styles.bold}>1234</Text> avec les commandes: SOLDE, PRIME, PARCELLE, RECOLTE
          </Text>
        </View>

        {/* Phone Simulator */}
        <View style={styles.phoneFrame}>
          {/* Phone Status Bar */}
          <View style={styles.phoneStatusBar}>
            <Text style={styles.statusText}>Orange CI</Text>
            <Text style={styles.statusText}>*123*45#</Text>
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
              placeholder="Tapez votre choix..."
              placeholderTextColor="#999"
              keyboardType="number-pad"
              maxLength={2}
              onSubmitEditing={handleSubmit}
            />
            <TouchableOpacity 
              style={styles.sendButton}
              onPress={handleSubmit}
              disabled={loading || !inputValue.trim()}
            >
              <Ionicons name="send" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            {['1', '2', '3', '4', '5', '6'].map((num) => (
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
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickButton, styles.backBtn]}
              onPress={() => handleQuickAction('0')}
              disabled={loading}
            >
              <Text style={styles.quickButtonText}>0 Retour</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickButton, styles.homeBtn]}
              onPress={() => handleQuickAction('00')}
              disabled={loading}
            >
              <Text style={styles.quickButtonText}>00 Menu</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SMS Commands Reference */}
        <View style={styles.smsCard}>
          <Text style={styles.smsTitle}>
            <Ionicons name="chatbubble" size={16} color={COLORS.primary} /> Commandes SMS (1234)
          </Text>
          <View style={styles.smsCommands}>
            <Text style={styles.smsCommand}>SOLDE</Text>
            <Text style={styles.smsCommand}>PRIME</Text>
            <Text style={styles.smsCommand}>PARCELLE 3.5 Bouaflé</Text>
            <Text style={styles.smsCommand}>RECOLTE 250</Text>
            <Text style={styles.smsCommand}>AIDE</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background || '#F5F5F5',
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
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary || '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  phoneFrame: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 12,
    marginBottom: 16,
  },
  phoneStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  statusText: {
    color: '#888',
    fontSize: 12,
  },
  ussdScreen: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    minHeight: 280,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
  ussdText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
    fontFamily: 'monospace',
  },
  inputArea: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  quickButton: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  quickButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  backBtn: {
    flex: 1,
    backgroundColor: '#555',
  },
  homeBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  smsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  smsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  smsCommands: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  smsCommand: {
    backgroundColor: '#E8F5E9',
    color: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 12,
    fontFamily: 'monospace',
    overflow: 'hidden',
  },
});

export default USSDSimulatorScreen;
