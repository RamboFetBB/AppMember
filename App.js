import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  SafeAreaView,
  StatusBar
} from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const EVENTOS_FIXOS_INICIAIS = [
  { id: '1', nome: 'Reset Servidor', inicio: '01:00', fim: '01:05', tipo: 'ponto', ativo: true },
  { id: '2', nome: 'Interserver Double', inicio: '07:00', fim: '11:00', tipo: 'duracao', ativo: true },
  { id: '3', nome: 'Transporte Duplo', inicio: '09:00', fim: '10:00', tipo: 'duracao', ativo: true },
  { id: '4', nome: 'Boss', inicio: '16:00', fim: '16:05', tipo: 'ponto', ativo: true },
  { id: '5', nome: 'Riot', inicio: '17:00', fim: '17:05', tipo: 'ponto', ativo: true },
];

export default function App() {
  const [abaInferior, setAbaInferior] = useState('gerador');
  const [subAba, setSubAba] = useState('fixos');
  const [eventos, setEventos] = useState(EVENTOS_FIXOS_INICIAIS);
  const [agora, setAgora] = useState(new Date());

  // Relógio em tempo real para atualizar status e contagem regressiva a cada segundo
  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    solicitarPermissoes();
  }, []);

  async function solicitarPermissoes() {
    await Notifications.requestPermissionsAsync();
  }

  // Auxiliar: Minutos desde 00:00
  function getMinutos(horarioStr) {
    const [h, m] = horarioStr.split(':').map(Number);
    return h * 60 + m;
  }

  // Lógica de cálculo do estado do evento
  function getStatusEvento(inicioStr, fimStr, tipo) {
    const minutosAtuais = agora.getHours() * 60 + agora.getMinutes();
    const segundosAtuais = agora.getSeconds();
    const iniMin = getMinutos(inicioStr);
    const fimMin = tipo === 'duracao' ? getMinutos(fimStr) : iniMin + 5; // Ponto dura 5min de exibição

    if (minutosAtuais >= iniMin && minutosAtuais < fimMin) {
      return { status: 'EM ANDAMENTO', cor: '#10B981' };
    }

    if (minutosAtuais >= fimMin) {
      return { status: 'CONCLUÍDO', cor: '#64748B' };
    }

    // Calcular tempo restante exato para o início
    const diffMinutos = iniMin - minutosAtuais - 1;
    const diffSegundos = 60 - segundosAtuais;
    const horasRestantes = Math.floor(diffMinutos / 60);
    const minsRestantes = diffMinutos % 60;

    let textoTempo = '';
    if (horasRestantes > 0) {
      textoTempo = `(em ${horasRestantes}h ${minsRestantes}m)`;
    } else {
      textoTempo = `(em ${minsRestantes}m ${diffSegundos}s)`;
    }

    return { status: `Próximo ${textoTempo}`, cor: '#EAB308' };
  }

  // Toggles globais
  function alternarTodos(ativo) {
    setEventos(prev => prev.map(ev => ({ ...ev, ativo })));
  }

  // Toggle individual
  function alternarEvento(id) {
    setEventos(prev => prev.map(ev => ev.id === id ? { ...ev, ativo: !ev.ativo } : ev));
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header Superior */}
      <View style={styles.header}>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerEmoji}>🛡️</Text>
          <Text style={styles.headerTitle}>GvG Dev Manager</Text>
        </View>
        <TouchableOpacity style={styles.btnEnviarHoje}>
          <Text style={styles.btnEnviarHojeTexto}>⌛ Enviar Hoje</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {abaInferior === 'gerador' ? (
          <View style={styles.painelContainer}>
            
            {/* Título do Painel */}
            <Text style={styles.painelTitulo}>🔔 Painel de Notificações</Text>

            {/* Sub-Abas superiores */}
            <View style={styles.subAbasContainer}>
              <TouchableOpacity
                style={[styles.subAbaBtn, subAba === 'fixos' && styles.subAbaBtnAtivo]}
                onPress={() => setSubAba('fixos')}
              >
                <Text style={[styles.subAbaTexto, subAba === 'fixos' && styles.subAbaTextoAtivo]}>Eventos Fixos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subAbaBtn, subAba === 'sistema' && styles.subAbaBtnAtivo]}
                onPress={() => setSubAba('sistema')}
              >
                <Text style={[styles.subAbaTexto, subAba === 'sistema' && styles.subAbaTextoAtivo]}>Sistema</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subAbaBtn, subAba === 'custom' && styles.subAbaBtnAtivo]}
                onPress={() => setSubAba('custom')}
              >
                <Text style={[styles.subAbaTexto, subAba === 'custom' && styles.subAbaTextoAtivo]}>Customizável</Text>
              </TouchableOpacity>
            </View>

            {subAba === 'fixos' ? (
              <>
                {/* Timeline de Eventos */}
                <Text style={styles.secaoHeader}>⌛ Timeline de Eventos Diários:</Text>
                <View style={styles.timelineBox}>
                  {eventos.map(ev => {
                    const infoStatus = getStatusEvento(ev.inicio, ev.fim, ev.tipo);
                    return (
                      <View key={ev.id} style={styles.cardTimeline}>
                        <View>
                          <Text style={styles.cardTitulo}>{ev.nome}</Text>
                          <Text style={styles.cardHorario}>
                            ⏰ {ev.tipo === 'duracao' ? `${ev.inicio} - ${ev.fim}` : ev.inicio}
                          </Text>
                        </View>
                        <View style={[styles.badgeStatus, { backgroundColor: infoStatus.cor }]}>
                          <Text style={styles.badgeStatusTexto}>{infoStatus.status}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Ações de Notificação */}
                <Text style={styles.secaoHeader}>⚡ Notificações Automáticas (5m antes):</Text>
                <View style={styles.botoesAcaoRow}>
                  <TouchableOpacity style={styles.btnAtivarTodas} onPress={() => alternarTodos(true)}>
                    <Text style={styles.btnAcaoTexto}>🔔 Ativar Todas</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnDesativarTodas} onPress={() => alternarTodos(false)}>
                    <Text style={styles.btnAcaoTexto}>🔕 Desativar Todas</Text>
                  </TouchableOpacity>
                </View>

                {/* Lista de Toggles Individuais */}
                {eventos.map(ev => (
                  <View key={ev.id} style={styles.cardToggle}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitulo}>{ev.nome}</Text>
                      <Text style={styles.cardSub}>
                        Horário: {ev.tipo === 'duracao' ? `${ev.inicio} às ${ev.fim}` : ev.inicio}
                      </Text>
                      <Text style={styles.cardNotiInfo}>⚡ Notifica diariamente 5m antes</Text>
                    </View>
                    <Switch
                      value={ev.ativo}
                      onValueChange={() => alternarEvento(ev.id)}
                      trackColor={{ false: '#334155', true: '#059669' }}
                      thumbColor={ev.ativo ? '#10B981' : '#94A3B8'}
                    />
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.abaVaziaContainer}>
                <Text style={styles.abaVaziaTexto}>Configurações de {subAba}</Text>
              </View>
            )}

          </View>
        ) : (
          <View style={styles.abaVaziaContainer}>
            <Text style={styles.abaVaziaTexto}>Tela: {abaInferior.toUpperCase()}</Text>
          </View>
        )}
      </ScrollView>

      {/* Navegação Inferior de 5 Ícones */}
      <View style={styles.navBottom}>
        <TouchableOpacity style={styles.navItem} onPress={() => setAbaInferior('gerador')}>
          <Text style={styles.navIcon}>⚡</Text>
          <Text style={[styles.navText, abaInferior === 'gerador' && styles.navTextAtivo]}>Gerador</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setAbaInferior('pessoas')}>
          <Text style={styles.navIcon}>👥</Text>
          <Text style={[styles.navText, abaInferior === 'pessoas' && styles.navTextAtivo]}>Pessoas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setAbaInferior('historico')}>
          <Text style={styles.navIcon}>📜</Text>
          <Text style={[styles.navText, abaInferior === 'historico' && styles.navTextAtivo]}>Histórico</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setAbaInferior('guilda')}>
          <Text style={styles.navIcon}>🏰</Text>
          <Text style={[styles.navText, abaInferior === 'guilda' && styles.navTextAtivo]}>Guilda</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setAbaInferior('dev')}>
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={[styles.navText, abaInferior === 'dev' && styles.navTextAtivo]}>Dev</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1C2541',
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  btnEnviarHoje: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnEnviarHojeTexto: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 70,
  },
  painelContainer: {
    backgroundColor: '#111C38',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  painelTitulo: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subAbasContainer: {
    flexDirection: 'row',
    backgroundColor: '#0B132B',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  subAbaBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  subAbaBtnAtivo: {
    backgroundColor: '#2563EB',
  },
  subAbaTexto: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  subAbaTextoAtivo: {
    color: '#FFFFFF',
  },
  secaoHeader: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 10,
  },
  timelineBox: {
    marginBottom: 16,
  },
  cardTimeline: {
    backgroundColor: '#1C2541',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A365C',
  },
  cardTitulo: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  cardHorario: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  badgeStatus: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeStatusTexto: {
    color: '#000000',
    fontSize: 11,
    fontWeight: 'bold',
  },
  botoesAcaoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  btnAtivarTodas: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDesativarTodas: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnAcaoTexto: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  cardToggle: {
    backgroundColor: '#1C2541',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A365C',
  },
  cardSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  cardNotiInfo: {
    color: '#10B981',
    fontSize: 11,
    marginTop: 4,
  },
  abaVaziaContainer: {
    padding: 40,
    alignItems: 'center',
  },
  abaVaziaTexto: {
    color: '#94A3B8',
    fontSize: 14,
  },
  navBottom: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0B132B',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingVertical: 6,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 16,
  },
  navText: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  navTextAtivo: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
});
                  
