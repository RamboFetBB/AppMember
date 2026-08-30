import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar
} from 'react-native';

// Importação apenas das telas mantidas
import EventosFixosScreen from './src/screens/EventosFixosScreen';
import NotificacoesPersonalizadasScreen from './src/screens/NotificacoesPersonalizadasScreen';
import CooldownGuildaScreen from './src/screens/CooldownGuildaScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState('eventos');

  const renderContent = () => {
    switch (activeTab) {
      case 'eventos':
        return <EventosFixosScreen />;
      case 'notificacoes':
        return <NotificacoesPersonalizadasScreen />;
      case 'guilda':
        return <CooldownGuildaScreen />;
      default:
        return <EventosFixosScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />
      
      {/* Cabeçalho do App */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alertas Poke_membros</Text>
      </View>

      {/* Área do Conteúdo Principal */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Menu Inferior (Apenas as 3 funções liberadas) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'eventos' && styles.activeTabButton]}
          onPress={() => setActiveTab('eventos')}
        >
          <Text style={[styles.tabText, activeTab === 'eventos' && styles.activeTabText]}>
            Eventos Fixos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'notificacoes' && styles.activeTabButton]}
          onPress={() => setActiveTab('notificacoes')}
        >
          <Text style={[styles.tabText, activeTab === 'notificacoes' && styles.activeTabText]}>
            Alertas Custom
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'guilda' && styles.activeTabButton]}
          onPress={() => setActiveTab('guilda')}
        >
          <Text style={[styles.tabText, activeTab === 'guilda' && styles.activeTabText]}>
            Guilda 1 e 2
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabButton: {
    borderTopWidth: 3,
    borderTopColor: '#38bdf8',
    backgroundColor: '#0f172a',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  activeTabText: {
    color: '#38bdf8',
  },
});
    
