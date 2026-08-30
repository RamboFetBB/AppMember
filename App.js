import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  SafeAreaView,
  StatusBar,
  Alert
} from 'react-native';
import * as Notifications from 'expo-notifications';

// Configura o handler para exibir alerta sonoro e visual mesmo com o app aberto
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

const DIAS_SLOTS = [
  'Seg1', 'Seg2', 'Ter1', 'Ter2', 'Qua1', 'Qua2',
  'Qui1', 'Qui2', 'Sex1', 'Sex2', 'Sab1', 'Sab2', 'Dom1', 'Dom2'
];

const COOLDOWN_TEMPO = 61 * 60; // 1 hora e 1 minuto (3660 segundos)

export default function App() {
  const [abaInferior, setAbaInferior] = useState('gerador');
  const [subAba, setSubAba] = useState('fixos');
  const [eventos, setEventos] = useState(EVENTOS_FIXOS_INICIAIS);
  const [agora, setAgora] = useState(new Date());

  // Estado dos temporizadores de cooldown (Sistema)
  // Estrutura: { Seg1: { ativo: boolean, fimTimestamp: number, tempoRestante: number, notifId: string } }
  const [cooldowns, setCooldowns] = useState({});

  useEffect(() => {
    configurarNotificacoes();
    const timer = setInterval(() => {
      setAgora(new Date());
      atualizarTemporizadores();
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldowns]);

  async function configurarNotificacoes() {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  }

  // Agendar Notificação no Sistema Operacional
  async function agendarNotificacao(titulo, corpo, segundos) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: titulo,
          body: corpo,
          sound: true,
        },
        trigger: {
          seconds: segundos,
        },
      });
      return id;
    } catch (e) {
      console.warn("Erro ao agendar notificação:", e);
      return null;
    }
  }

  // Cancelar Notificação Agendada
  async function cancelarNotificacao(id) {
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  }

  // Atualizar a contagem dos temporizadores em tempo real
  function atualizarTemporizadores() {
    const agoraMs = Date.now();
    let mudou = false;
    const novosCooldowns = { ...cooldowns };

    Object.keys(novosCooldowns).forEach(slot => {
      const item = novosCooldowns[slot];
      if (item && item.ativo) {
        const restante = Math.max(0, Math.ceil((item.fimTimestamp - agoraMs) / 1000));
        if (restante !== item.tempoRestante) {
          mudou = true;
          novosCooldowns[slot].tempoRestante = restante;
          if (restante === 0) {
            novosCooldowns[slot].ativo = false;
          }
        }
      }
    });

    if (mudou) {
      setCooldowns(novosCooldowns);
    }
  }

  // Ativar ou desativar o temporizador de 1h 01m de um Slot específico
  async function alternarCooldownSlot(slot) {
    const estadoAtual = cooldowns[slot];

    if (estadoAtual && estadoAtual.ativo) {
      // Cancelar
      await cancelarNotificacao(estadoAtual.notifId);
      setCooldowns(prev => ({
        ...prev,
        [slot]: { ativo: false, fimTimestamp: 0, tempoRestante: 0, notifId: null }
      }));
    } else {
      // Ativar temporizador de 1h 01m
      const fimTimestamp = Date.now() + COOLDOWN_TEMPO * 1000;
      const notifId = await agendarNotificacao(
        "Guilda - Cooldown Concluído!",
        "Você já pode se juntar a próxima guilda",
        COOLDOWN_TEMPO
      );

      setCooldowns(prev => ({
        ...prev,
        [slot]: {
          ativo: true,
          fimTimestamp,
          tempoRestante: COOLDOWN_TEMPO,
          notifId
        }
      }));
    }
  }

  // Auxiliares da Timeline
  function getMinutos(horarioStr) {
    const [h, m] = horarioStr.split(':').map(Number);
    return h * 60 + m;
  }

  function getStatusEvento(inicioStr, fimStr, tipo) {
    const minutosAtuais = agora.getHours() * 60 + agora.getMinutes();
    const segundosAtuais = agora.getSeconds();
    const iniMin = getMinutos(inicioStr);
    const fimMin = tipo === 'duracao' ? getMinutos(fimStr) : iniMin + 5;

    if (minutosAtuais >= iniMin && minutosAtuais < fimMin) {
      return { status: 'EM ANDAMENTO', cor: '#10B981' };
    }

    if (minutosAtuais >= fimMin) {
      return { status: 'CONCLUÍDO', cor: '#64748B' };
    }

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

  // Toggles de notificações fixas
  async function alternarTodosFixos(ativo) {
    setEventos(prev => prev.map(ev => ({ ...ev, ativo })));
    if (ativo) {
      Alert.alert("Notificações", "Alertas para eventos fixos ativados.");
    }
  }

  function alternarEventoFixo(id) {
    setEventos(prev => prev.map(ev => ev.id === id ? { ...ev, ativo: !ev.ativo } : ev));
  }

  // Formatação em HH:MM:SS para o cooldown
  function formatarTempo(segundos) {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
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
            <Text style={styles.painelTitulo}>🔔 Painel de Notificações</Text>

            {/* Sub-Abas */}
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

            {/* ABA 1: EVENTOS FIXOS */}
            {subAba === 'fixos' && (
              <>
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

                <Text style={styles.secaoHeader}>⚡ Notificações Automáticas (5m antes):</Text>
                <View style={styles.botoesAcaoRow}>
                  <TouchableOpacity style={styles.btnAtivarTodas} onPress={() => alternarTodosFixos(true)}>
                    <Text style={styles.btnAcaoTexto}>🔔 Ativar Todas</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnDesativarTodas} onPress={() => alternarTodosFixos(false)}>
                    <Text style={styles.btnAcaoTexto}>🔕 Desativar Todas</Text>
                  </TouchableOpacity>
                </View>

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
                      onValueChange={() => alternarEventoFixo(ev.id)}
                      trackColor={{ false: '#334155', true: '#059669' }}
                      thumbColor={ev.ativo ? '#10B981' : '#94A3B8'}
                    />
                  </View>
                ))}
              </>
            )}

            {/* ABA 2: SISTEMA (SLOTS SEG1 A DOM2 + COOLDOWN 1H01M) */}
            {subAba === 'sistema' && (
              <View>
                <Text style={styles.secaoHeader}>⏳ Cooldown de Troca de Guilda (1h 01m):</Text>
                <Text style={styles.subTituloInstrucao}>
                  Ative o botão ao sair de uma guilda para iniciar a contagem. O app emitirá a notificação "Você já pode se juntar a próxima guilda".
                </Text>

                {DIAS_SLOTS.map(slot => {
                  const infoSlot = cooldowns[slot] || { ativo: false, tempoRestante: 0 };
                  return (
                    <View key={slot} style={styles.cardToggle}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitulo}>Slot {slot}</Text>
                        <Text style={infoSlot.ativo ? styles.cardTimerAtivo : styles.cardSub}>
                          {infoSlot.ativo
                            ? `⏳ Restante: ${formatarTempo(infoSlot.tempoRestante)}`
                            : 'Pronto para iniciar contagem'}
                        </Text>
                      </View>
                      <Switch
                        value={!!infoSlot.ativo}
                        onValueChange={() => alternarCooldownSlot(slot)}
                        trackColor={{ false: '#334155', true: '#2563EB' }}
                        thumbColor={infoSlot.ativo ? '#3B82F6' : '#94A3B8'}
                      />
                    </View>
                  );
                })}
              </View>
            )}

            {/* ABA 3: CUSTOMIZÁVEL */}
            {subAba === 'custom' && (
              <View style={styles.abaVaziaContainer}>
                <Text style={styles.secaoHeader}>🛠️ Notificações Customizadas</Text>
                <Text style={styles.abaVaziaTexto}>Adicione e programe lembretes personalizados para a sua guilda.</Text>
              </View>
            )}

          </View>
        ) : (
          <View style={styles.abaVaziaContainer}>
            <Text style={styles.abaVaziaTexto}>Tela: {abaInferior.toUpperCase()}</Text>
          </View>
        )}
      </ScrollView>

      {/* Navegação Inferior */}
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
    paddingBottom: 80,
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
  subTituloInstrucao: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 12,
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
  cardTimerAtivo: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2,
  },
  cardNotiInfo: {
    color: '#10B981',
    fontSize: 11,
    marginTop: 4,
  },
  abaVaziaContainer: {
    padding: 30,
    alignItems: 'center',
  },
  abaVaziaTexto: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
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
    paddingVertical: 8,
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
