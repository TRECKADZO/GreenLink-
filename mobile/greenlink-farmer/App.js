/**
 * GreenLink Farmer - Ultra-Safe Entry Point
 * 
 * This file is intentionally minimal. ALL heavy imports are deferred
 * to AppContent.js via require() inside the component body.
 * This ensures that if ANY dependency fails to load, we show a visible
 * error screen instead of a white screen.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

// Error Boundary class - catches render-time errors
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error?.message, info?.componentStack?.slice(0, 500));
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#dc2626', marginBottom: 12 }}>Erreur</Text>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 8 }}>
            Une erreur est survenue au demarrage.
          </Text>
          <ScrollView style={{ maxHeight: 200, marginBottom: 20 }}>
            <Text style={{ fontSize: 11, color: '#999', textAlign: 'center' }}>
              {this.state.error?.message || 'Erreur inconnue'}
            </Text>
            <Text style={{ fontSize: 10, color: '#ccc', textAlign: 'center', marginTop: 4 }}>
              {this.state.error?.stack?.slice(0, 300)}
            </Text>
          </ScrollView>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#059669', borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Reessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// SafeApp - Loads the actual app content dynamically
function SafeApp() {
  const [AppContent, setAppContent] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    try {
      // This require() is deferred to render-time, NOT module-evaluation-time.
      // If AppContent.js or ANY of its transitive dependencies fail,
      // we catch it here and show a visible error instead of a white screen.
      const Content = require('./src/AppContent').default;
      setAppContent(() => Content);
    } catch (e) {
      console.error('[SafeApp] Failed to load AppContent:', e?.message, e?.stack);
      setLoadError(e);
    }
  }, []);

  if (loadError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2d5a4d', padding: 24 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 12, textAlign: 'center' }}>
          GreenLink - Erreur de chargement
        </Text>
        <Text style={{ fontSize: 14, color: '#a7f3d0', textAlign: 'center', marginBottom: 16 }}>
          L'application n'a pas pu demarrer correctement.
        </Text>
        <ScrollView style={{ maxHeight: 150, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 12, width: '100%' }}>
          <Text style={{ fontSize: 11, color: '#fca5a5', fontFamily: 'monospace' }}>
            {loadError?.message || 'Unknown error'}
          </Text>
          <Text style={{ fontSize: 9, color: '#999', marginTop: 4 }}>
            {loadError?.stack?.slice(0, 400)}
          </Text>
        </ScrollView>
        <TouchableOpacity
          onPress={() => {
            setLoadError(null);
            setAppContent(null);
            // Retry loading
            setTimeout(() => {
              try {
                const Content = require('./src/AppContent').default;
                setAppContent(() => Content);
              } catch (e) {
                setLoadError(e);
              }
            }, 100);
          }}
          style={{ marginTop: 20, paddingHorizontal: 32, paddingVertical: 14, backgroundColor: '#d4a574', borderRadius: 10 }}
        >
          <Text style={{ color: '#2d5a4d', fontWeight: 'bold', fontSize: 16 }}>Reessayer</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 16 }}>
          Version 1.23.0 | Contactez +225 07 87 76 10 23
        </Text>
      </View>
    );
  }

  if (!AppContent) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2d5a4d' }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🌿</Text>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>GreenLink</Text>
        <Text style={{ color: '#a7f3d0', fontSize: 14, marginTop: 4 }}>Chargement...</Text>
      </View>
    );
  }

  return <AppContent />;
}

// Main App export
export default function App() {
  return (
    <ErrorBoundary>
      <SafeApp />
    </ErrorBoundary>
  );
}
