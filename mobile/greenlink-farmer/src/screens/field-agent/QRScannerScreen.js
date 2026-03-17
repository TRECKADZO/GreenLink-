// QR Scanner - Fonctionnalité supprimée, remplacée par recherche téléphone
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';

const QRScannerScreen = ({ navigation }) => {
  useEffect(() => {
    navigation.replace('FarmerSearch');
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Redirection...</Text>
    </View>
  );
};

export default QRScannerScreen;
