import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert
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
  { id: '1', nome: 'Reset Servidor', inicio: '01:00', fim: '01:05', tipo: 'ponto', ativo: true, dias: [0, 1, 2, 3, 4, 5, 6] },
  { id: '2', nome: 'Interserver Double', inicio: '07:00', fim: '11:00', tipo: 'duracao', ativo: true, dias: [0, 1, 2, 3, 4, 5, 6] },
  { id: '3', nome: 'Transporte Duplo', inicio: '09:00', fim: '10:00', tipo: 'duracao', ativo: true, dias: [0, 1, 2, 3, 4, 5, 6] },
  { id: '4', nome: 'GuildasXGuildas', inicio: '15:30', fim: '15:35', tipo: 'ponto', ativo: true, dias: [6], aviso: 'A GvG irá iniciar em breve!' },
  { id: '5', nome: 'Boss', inicio: '16:00', fim: '16:05', tipo: 'ponto', ativo: true, dias: [0, 1, 2, 3, 4, 5, 6] },
  { id: '6', nome: 'Riot', inicio: '17:00', fim: '17:05', tipo: 'ponto', ativo: true, dias: [0, 1, 2, 3, 4, 5, 6] },
];

const DIAS_SLOTS = [
  'Seg1', 'Seg2', 'Ter1', 'Ter2', 'Qua1', 'Qua2',
  'Qui1', 'Qui2', 'Sex1', 'Sex2', 'Sab1', 'Sab2', 'Dom1', 'Dom2'
];

const COOLDOWN_1H01 = 61 * 60;
const COOLDOWN_24H = 24 * 60 * 60;

export default function App() {
  const [abaInferior, setAbaInferior] = useState('gerador');
  const [subAba, setSubAba] = useState('fixos');
  const [eventos, setEventos] = useState(EVENTOS_FIXOS_INICIAIS);
  const [agora, setAgora] = useState(new Date());

  const [cooldowns, setCooldowns] = useState({});

  const [eventosCustom, setEventosCustom] = useState([]);
  const [novoNome, setNovoNome] = useState('');
  const [novoHorario, setNovoHorario] = useState('');

  useEffect(() => {
    configurarNotificacoes();
    const timer = setInterval(() => {
      const agoraAtual = new Date();
      setAgora(agoraAtual);

      const agoraMs = agoraAtual.getTime();
      setCooldowns(prev => {
        let mudou = false;
        const novos = { ...prev };

        Object.keys(novos).forEach(key => {
          const item = novos[key];
          if (item && item.ativo) {
            const restante = Math.max(0, Math.ceil((item.fimTimestamp - agoraMs) / 1000));
            if (restante !== item.tempoRestante) {
              mudou = true;
              novos[key] = {
                ...item,
                tempoRestante: restante,
                ativo: restante > 0
              };
            }
          }
        });

        return mudou ? novos : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  async function configurarNotificacoes() {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  }

  async function agendarNotificacao(titulo, corpo, segundos) {
    try {
      return await Notifications.scheduleNotificationAsync({
        content: { title: titulo, body: corpo, sound: true },
        trigger: { seconds: segundos },
      });
    } catch (e) {
      console.warn("Erro ao agendar notificação:", e);
      return null;
    }
  }

  async function cancelarNotificacao(id) {
    if (id) await Notifications.cancelScheduledNotificationAsync(id);
  }

  async function alternarCooldown1h(slot) {
    const key = `${slot}_1h`;
    const estadoAtual = cooldowns[key];

    if (estadoAtual && estadoAtual.ativo) {
      await cancelarNotificacao(estadoAtual.notifId);
      setCooldowns(prev => ({
        ...prev,
        [key]: { ativo: false, fimTimestamp: 0, tempoRestante: 0, notifId: null }
      }));
    } else {
      const fimTimestamp = Date.now() + COOLDOWN_1H01 * 1000;
      const notifId = await agendarNotificacao(
        "Kira Alertas - Guilda",
        "Você já pode se juntar a próxima guilda",
        COOLDOWN_1H01
      );

      setCooldowns(prev => ({
        ...prev,
        [key]: { ativo: true, fimTimestamp, tempoRestante: COOLDOWN_1H01, notifId }
      }));
    }
  }

  async function alternarCooldown24h(slot) {
    const key = `${slot}_24h`;
    const estadoAtual = cooldowns[key];

    if (estadoAtual && estadoAtual.ativo) {
      await cancelarNotificacao(estadoAtual.notifId);
      setCooldowns(prev => ({
        ...prev,
        [key]: { ativo: false, fimTimestamp: 0, tempoRestante: 0, notifId: null }
      }));
    } else {
      const fimTimestamp = Date.now() + COOLDOWN_24H * 1000;
      const notifId = await agendarNotificacao(
        "Kira Alertas - Alerta 24h",
        "Já passou 24h desde a última guilda",
        COOLDOWN_24H
      );

      setCooldowns(prev => ({
        ...prev,
        [key]: { ativo: true, fimTimestamp, tempoRestante: COOLDOWN_24H, notifId }
      }));
    }
  }

  function adicionarEventoCustom() {
    if (!novoNome.trim() || !novoHorario.trim()) {
      Alert.alert("Atenção", "Preencha o nome e o horário do evento.");
      return;
    }

    const novo = {
      id: Date.now().toString(),
      nome: novoNome.trim(),
      horario: novoHorario.trim(),
    };

    setEventosCustom(prev => [...prev, novo]);
    setNovoNome('');
    setNovoHorario('');
  }

  function removerEventoCustom(id) {
    setEventosCustom(prev => prev.filter(ev => ev.id !== id));
  }

  function getMinutos(horarioStr) {
    const [h, m] = horarioStr.split(':').map(Number);
    return h * 60 + m;
  }

  function getStatusEvento(ev) {
    const diaAtual = agora.getDay();
    if (ev.dias && !ev.dias.includes(diaAtual)) {
      return { status: 'HOJE NÃO', cor: '#475569' };
    }

    const minutosAtuais = agora.getHours() * 60 + agora.getMinutes();
    const segundosAtuais = agora.getSeconds();
    const iniMin = getMinutos(ev.inicio);
    const fimMin = ev.tipo === 'duracao' ? getMinutos(ev.fim) : iniMin + 5;

    if (minutosAtuais >= iniMin && minutosAtuais < fimMin) {
      return { status: 'EM ANDAMENTO', cor: '#10B981' };
    }

    if (minutosAtuais >= fimMin) {
      return { status: 'CONCLUÍDO', cor: '#64748B' };
    }

    const diffMinutosTotal = (iniMin - minutosAtuais) * 60 - segundosAtuais;
    const h = Math.floor(diffMinutosTotal / 3600);
    const m = Math.floor((diffMinutosTotal % 3600) / 60);
    const s = diffMinutosTotal % 60;

    const textoTempo = h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
    return { status: `Próximo (em ${textoTempo})`, cor: '#EAB308' };
  }

  function formatarTempo(segundos) {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <View style={styles.header}>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerEmoji}>🛡️</Text>
          <Text style={styles.headerTitle}>Kira Alertas Sistema</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {abaInferior === 'gerador' ? (
          <View style={styles.painelContainer}>
            <Text style={styles.painelTitulo}>🔔 Painel de Notificações</Text>

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

            {subAba === 'fixos' && (
              <View>
                <Text style={styles.secaoHeader}>⌛ Timeline de Eventos Diários:</Text>
                <View style={styles.timelineBox}>
                  {eventos.map(ev => {
                    const infoStatus = getStatusEvento(ev);
                    return (
                      <View key={ev.id} style={styles.cardTimeline}>
                        <View style={styles.cardTimelineInfo}>
                          <Text style={styles.cardTitulo}>{ev.nome}</Text>
                          <Text style={styles.cardHorario}>
                            ⏰ {ev.tipo === 'duracao' ? `${ev.inicio} - ${ev.fim}` : ev.inicio}
                          </Text>
                          {ev.aviso ? (
                            <Text style={styles.cardAvisoTexto}>📢 {ev.aviso}</Text>
                          ) : null}
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
                  <TouchableOpacity style={styles.btnAtivarTodas} onPress={() => setEventos(prev => prev.map(e => ({ ...e, ativo: true })))}>
                    <Text style={styles.btnAcaoTexto}>🔔 Ativar Todas</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnDesativarTodas} onPress={() => setEventos(prev => prev.map(e => ({ ...e, ativo: false })))}>
                    <Text style={styles.btnAcaoTexto}>🔕 Desativar Todas</Text>
                  </TouchableOpacity>
                </View>

                {eventos.map(ev => (
                  <View key={ev.id} style={styles.cardToggle}>
                    <View style={styles.cardTimelineInfo}>
                      <Text style={styles.cardTitulo}>{ev.nome}</Text>
                      <Text style={styles.cardSub}>
                        Horário: {ev.tipo === 'duracao' ? `${ev.inicio} às ${ev.fim}` : ev.inicio}
                      </Text>
                      <Text style={styles.cardNotiInfo}>⚡ Notifica 5m antes</Text>
                    </View>
                    <Switch
                      value={ev.ativo}
                      onValueChange={() => setEventos(prev => prev.map(e => e.id === ev.id ? { ...e, ativo: !e.ativo } : e))}
                      trackColor={{ false: '#334155', true: '#059669' }}
                      thumbColor={ev.ativo ? '#10B981' : '#94A3B8'}
                    />
                  </View>
                ))}
              </View>
            )}

            {subAba === 'sistema' && (
              <View>
                <Text style={styles.secaoHeader}>⏳ Controle de Cooldowns de Guilda:</Text>
                <Text style={styles.subTituloInstrucao}>
                  Slots final 1 possuem o controle adicional de 24h.
                </Text>

                {DIAS_SLOTS.map(slot => {
                  const ehFinal1 = slot.endsWith('1');
                  const info1h = cooldowns[`${slot}_1h`] || { ativo: false, tempoRestante: 0 };
                  const info24h = cooldowns[`${slot}_24h`] || { ativo: false, tempoRestante: 0 };

                  return (
                    <View key={slot} style={styles.cardSystemSlot}>
                      <Text style={styles.cardTitulo}>Slot {slot}</Text>

                      <View style={styles.rowSystemControl}>
                        <View style={styles.cardTimelineInfo}>
                          <Text style={styles.cardSubLabel}>Cooldown Guilda (1h01m)</Text>
                          <Text style={info1h.ativo ? styles.cardTimerAtivo : styles.cardSub}>
                            {info1h.ativo ? `⏳ ${formatarTempo(info1h.tempoRestante)}` : 'Inativo'}
                          </Text>
                        </View>
                        <Switch
                          value={!!info1h.ativo}
                          onValueChange={() => alternarCooldown1h(slot)}
                          trackColor={{ false: '#334155', true: '#2563EB' }}
                          thumbColor={info1h.ativo ? '#3B82F6' : '#94A3B8'}
                        />
                      </View>

                      {ehFinal1 ? (
                        <View style={styles.rowSystemControlDivider}>
                          <View style={styles.cardTimelineInfo}>
                            <Text style={styles.cardSubLabel}>Alerta Final (24h)</Text>
                            <Text style={info24h.ativo ? styles.cardTimerAtivo24 : styles.cardSub}>
                              {info24h.ativo ? `⌛ ${formatarTempo(info24h.tempoRestante)}` : 'Inativo'}
                            </Text>
                          </View>
                          <Switch
                            value={!!info24h.ativo}
                            onValueChange={() => alternarCooldown24h(slot)}
                            trackColor={{ false: '#334155', true: '#D97706' }}
                            thumbColor={info24h.ativo ? '#F59E0B' : '#94A3B8'}
                          />
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}

            {subAba === 'custom' && (
              <View>
                <Text style={styles.secaoHeader}>🛠️ Criar Alerta Customizado:</Text>

                <View style={styles.formCustomBox}>
                  <TextInput
                    style={styles.inputCustom}
                    placeholder="Nome do Evento (ex: Guerra de Castelo)"
                    placeholderTextColor="#64748B"
                    value={novoNome}
                    onChangeText={setNovoNome}
                  />
                  <TextInput
                    style={styles.inputCustom}
                    placeholder="Horário (ex: 20:30)"
                    placeholderTextColor="#64748B"
                    value={novoHorario}
                    onChangeText={setNovoHorario}
                  />
                  <TouchableOpacity style={styles.btnAdicionarCustom} onPress={adicionarEventoCustom}>
                    <Text style={styles.btnAcaoTexto}>➕ Adicionar Alerta</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.secaoHeader}>📋 Seus Eventos Customizados:</Text>
                {eventosCustom.length === 0 ? (
                  <Text style={styles.abaVaziaTexto}>Nenhum evento customizado adicionado.</Text>
                ) : (
                  eventosCustom.map(ev => (
                    <View key={ev.id} style={styles.cardToggle}>
                      <View style={styles.cardTimelineInfo}>
                        <Text style={styles.cardTitulo}>{ev.nome}</Text>
                        <Text style={styles.cardSub}>Horário: {ev.horario}</Text>
                      </View>
                      <TouchableOpacity onPress={() => removerEventoCustom(ev.id)} style={styles.btnDeletar}>
                        <Text style={styles.btnDeletarTexto}>🗑️ Excluir</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}

          </View>
        ) : (
          <View style={styles.abaVaziaContainer}>
            <Text style={styles.abaVaziaTexto}>Tela: {abaInferior.toUpperCase()}</Text>
          </View>
        )}
      </ScrollView>

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
    backgroundColor: '#0B132B'
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1C2541'
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerEmoji: {
    fontSize: 18,
    marginRight: 8
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold'
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 80
  },
  painelContainer: {
    backgroundColor: '#111C38',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  painelTitulo: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12
  },
  subAbasContainer: {
    flexDirection: 'row',
    backgroundColor: '#0B132B',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16
  },
  subAbaBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6
  },
  subAbaBtnAtivo: {
    backgroundColor: '#2563EB'
  },
  subAbaTexto: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600'
  },
  subAbaTextoAtivo: {
    color: '#FFFFFF'
  },
  secaoHeader: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 10
  },
  subTituloInstrucao: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 12
  },
  timelineBox: {
    marginBottom: 16
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
    borderColor: '#2A365C'
  },
  cardTimelineInfo: {
    flex: 1
  },
  cardTitulo: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold'
  },
  cardHorario: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4
  },
  cardAvisoTexto: {
    color: '#38BDF8',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600'
  },
  badgeStatus: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  badgeStatusTexto: {
    color: '#000000',
    fontSize: 11,
    fontWeight: 'bold'
  },
  botoesAcaoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16
  },
  btnAti
