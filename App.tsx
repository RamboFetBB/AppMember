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
  Alert,
  Platform,
  ViewStyle,
  TextStyle
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as IntentLauncher from 'expo-intent-launcher';

interface EventoFixo {
  id: string;
  nome: string;
  inicio: string;
  fim: string;
  tipo: 'ponto' | 'duracao';
  ativo: boolean;
  dias: number[];
  aviso?: string;
}

interface EventoCustom {
  id: string;
  nome: string;
  horario: string;
  notifId?: string | null;
}

interface CooldownState {
  ativo: boolean;
  fimTimestamp: number;
  tempoRestante: number;
  notifId: string | null;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const EVENTOS_FIXOS_INICIAIS: EventoFixo[] = [
  { id: '1', nome: 'Reset Servidor', inicio: '01:00', fim: '01:05', tipo: 'ponto', ativo: true, dias: [0, 1, 2, 3, 4, 5, 6] },
  { id: '2', nome: 'Interserver Double', inicio: '07:00', fim: '11:00', tipo: 'duracao', ativo: true, dias: [0, 1, 2, 3, 4, 5, 6] },
  { id: '3', nome: 'Transporte Duplo', inicio: '09:00', fim: '10:00', tipo: 'duracao', ativo: true, dias: [0, 1, 2, 3, 4, 5, 6] },
  { id: '4', nome: 'GuildasXGuildas', inicio: '15:30', fim: '15:35', tipo: 'ponto', ativo: true, dias: [6], aviso: 'A GvG ira iniciar em breve!' },
  { id: '5', nome: 'Boss', inicio: '16:00', fim: '16:05', tipo: 'ponto', ativo: true, dias: [0, 1, 2, 3, 4, 5, 6] },
  { id: '6', nome: 'Riot', inicio: '17:00', fim: '17:05', tipo: 'ponto', ativo: true, dias: [0, 1, 2, 3, 4, 5, 6] }
];

const DIAS_SLOTS: string[] = [
  'Seg1', 'Seg2', 'Ter1', 'Ter2', 'Qua1', 'Qua2',
  'Qui1', 'Qui2', 'Sex1', 'Sex2', 'Sab1', 'Sab2', 'Dom1', 'Dom2'
];

const COOLDOWN_1H01 = 3660;
const COOLDOWN_24H = 86400;

export default function App(): React.JSX.Element {
  const [abaInferior, setAbaInferior] = useState<string>('gerador');
  const [subAba, setSubAba] = useState<string>('fixos');
  const [eventos, setEventos] = useState<EventoFixo[]>(EVENTOS_FIXOS_INICIAIS);
  const [agora, setAgora] = useState<Date>(new Date());
  const [cooldowns, setCooldowns] = useState<Record<string, CooldownState>>({});
  const [eventosCustom, setEventosCustom] = useState<EventoCustom[]>([]);
  const [novoNome, setNovoNome] = useState<string>('');
  const [novoHorario, setNovoHorario] = useState<string>('');
  const [modoDndAtivo, setModoDndAtivo] = useState<boolean>(true);

  useEffect(() => {
    configurarNotificacoes();
    const timer = setInterval(() => {
      const agoraAtual = new Date();
      setAgora(agoraAtual);

      const agoraMs = agoraAtual.getTime();
      setCooldowns((prev) => {
        let mudou = false;
        const novos = { ...prev };

        Object.keys(novos).forEach((key) => {
          const item = novos[key];
          if (item && item.ativo) {
            const restante = Math.max(0, Math.ceil((item.fimTimestamp - agoraMs) / 1000));
            if (restante !== item.tempoRestante) {
              mudou = true;
              novos[key] = {
                ativo: restante > 0,
                fimTimestamp: item.fimTimestamp,
                tempoRestante: restante,
                notifId: item.notifId
              };
            }
          }
        });

        return mudou ? novos : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const configurarNotificacoes = async (): Promise<void> => {
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Alertas Poke Membros (Geral)',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      await Notifications.setNotificationChannelAsync('channel_critical_alerts', {
        name: 'Alertas Críticos (Furar DND + Tela)',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500, 250, 500],
        enableVibrate: true,
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }
  };

  const agendarNotificacao = async (
    titulo: string,
    corpo: string,
    segundos: number,
    channelId: string = 'default'
  ): Promise<string | null> => {
    if (segundos <= 0) return null;
    try {
      return await Notifications.scheduleNotificationAsync({
        content: {
          title: titulo,
          body: corpo,
          sound: true,
          vibrate: [0, 250, 250, 250],
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          seconds: segundos,
          channelId: channelId,
        }
      });
    } catch (e) {
      console.warn('Erro ao agendar notificacao:', e);
      return null;
    }
  };

  const agendarEventosAtivos = async (listaEventos: EventoFixo[]): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const diaAtual = agora.getDay();
    const minutosAtuais = agora.getHours() * 60 + agora.getMinutes();
    const segundosAtuais = agora.getSeconds();

    for (let i = 0; i < listaEventos.length; i++) {
      const ev = listaEventos[i];
      if (ev.ativo && ev.dias && ev.dias.includes(diaAtual)) {
        const partes = ev.inicio.split(':');
        const iniMin = parseInt(partes[0], 10) * 60 + parseInt(partes[1], 10);
        
        const alvoMin = iniMin - 5; 
        const diffSegundos = (alvoMin - minutosAtuais) * 60 - segundosAtuais;

        if (diffSegundos > 0) {
          await agendarNotificacao(
            `Alertas Poke Membros - ${ev.nome}`,
            ev.aviso ? ev.aviso : `O evento ${ev.nome} comeca em 5 minutos!`,
            diffSegundos
          );
        }
      }
    }
  };

  const cancelarNotificacao = async (id: string | null | undefined): Promise<void> => {
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  };

  const alternarCooldown1h = async (slot: string): Promise<void> => {
    const key = `${slot}_1h`;
    const estadoAtual = cooldowns[key];

    if (estadoAtual && estadoAtual.ativo) {
      await cancelarNotificacao(estadoAtual.notifId);
      setCooldowns((prev) => ({
        ...prev,
        [key]: { ativo: false, fimTimestamp: 0, tempoRestante: 0, notifId: null }
      }));
    } else {
      const fimTimestamp = Date.now() + COOLDOWN_1H01 * 1000;
      const notifId = await agendarNotificacao(
        'Alertas Poke Membros - Guilda',
        'Voce ja pode se juntar a proxima guilda!',
        COOLDOWN_1H01
      );

      setCooldowns((prev) => ({
        ...prev,
        [key]: { ativo: true, fimTimestamp, tempoRestante: COOLDOWN_1H01, notifId }
      }));
    }
  };

  const alternarCooldown24h = async (slot: string): Promise<void> => {
    const key = `${slot}_24h`;
    const estadoAtual = cooldowns[key];

    if (estadoAtual && estadoAtual.ativo) {
      await cancelarNotificacao(estadoAtual.notifId);
      setCooldowns((prev) => ({
        ...prev,
        [key]: { ativo: false, fimTimestamp: 0, tempoRestante: 0, notifId: null }
      }));
    } else {
      const fimTimestamp = Date.now() + COOLDOWN_24H * 1000;
      const notifId = await agendarNotificacao(
        'Alertas Poke Membros - Alerta 24h',
        'Ja se passaram 24h desde a ultima guilda.',
        COOLDOWN_24H
      );

      setCooldowns((prev) => ({
        ...prev,
        [key]: { ativo: true, fimTimestamp, tempoRestante: COOLDOWN_24H, notifId }
      }));
    }
  };

  const adicionarEventoCustom = async (): Promise<void> => {
    if (!novoNome.trim() || !novoHorario.trim()) {
      Alert.alert('Atencao', 'Preencha o nome e o horario do evento (formato HH:MM).');
      return;
    }

    const partes = novoHorario.trim().split(':');
    if (partes.length !== 2 || isNaN(parseInt(partes[0], 10)) || isNaN(parseInt(partes[1], 10))) {
      Alert.alert('Atencao', 'Informe o horario no formato correto Ex: 14:30');
      return;
    }

    const hAlvo = parseInt(partes[0], 10);
    const mAlvo = parseInt(partes[1], 10);

    const agoraData = new Date();
    const minutosAtuais = agoraData.getHours() * 60 + agoraData.getMinutes();
    const segundosAtuais = agoraData.getSeconds();

    const minutosAlvo = hAlvo * 60 + mAlvo;
    let diffSegundos = (minutosAlvo - minutosAtuais) * 60 - segundosAtuais;

    if (diffSegundos <= 0) {
      diffSegundos += 86400;
    }

    const canalSelecionado = modoDndAtivo ? 'channel_critical_alerts' : 'default';

    const notifId = await agendarNotificacao(
      `Alertas Poke Membros - ${novoNome.trim()}`,
      `O seu alerta customizado "${novoNome.trim()}" esta acontecendo agora!`,
      diffSegundos,
      canalSelecionado
    );

    const novo: EventoCustom = {
      id: Date.now().toString(),
      nome: novoNome.trim(),
      horario: novoHorario.trim(),
      notifId
    };

    setEventosCustom((prev) => [...prev, novo]);
    setNovoNome('');
    setNovoHorario('');
    Alert.alert('Sucesso', `Alerta agendado para disparar em ${Math.floor(diffSegundos / 60)} minuto(s)!`);
  };

  const removerEventoCustom = async (ev: EventoCustom): Promise<void> => {
    if (ev.notifId) {
      await cancelarNotificacao(ev.notifId);
    }
    setEventosCustom((prev) => prev.filter((item) => item.id !== ev.id));
  };

  const abrirConfiguracoesDnd = () => {
    if (Platform.OS === 'android') {
      IntentLauncher.startActivityAsync('android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS');
    } else {
      Alert.alert('Info', 'Recurso de canal exclusivo Android.');
    }
  };

  const getMinutos = (horarioStr: string): number => {
    const partes = horarioStr.split(':');
    return parseInt(partes[0], 10) * 60 + parseInt(partes[1], 10);
  };

  const getStatusEvento = (ev: EventoFixo): { status: string; tipoEstilo: string } => {
    const diaAtual = agora.getDay();
    if (ev.dias && !ev.dias.includes(diaAtual)) {
      return { status: 'HOJE NAO', tipoEstilo: 'desativado' };
    }

    const minutosAtuais = agora.getHours() * 60 + agora.getMinutes();
    const segundosAtuais = agora.getSeconds();
    const iniMin = getMinutos(ev.inicio);
    const fimMin = ev.tipo === 'duracao' ? getMinutos(ev.fim) : iniMin + 5;

    if (minutosAtuais >= iniMin && minutosAtuais < fimMin) {
      return { status: 'Em andamento', tipoEstilo: 'emAndamento' };
    }

    if (minutosAtuais >= fimMin) {
      return { status: 'Concluido hoje', tipoEstilo: 'concluido' };
    }

    const diffMinutosTotal = (iniMin - minutosAtuais) * 60 - segundosAtuais;
    const h = Math.floor(diffMinutosTotal / 3600);
    const m = Math.floor((diffMinutosTotal % 3600) / 60);
    const s = diffMinutosTotal % 60;

    const textoTempo = h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
    return { status: `Falta ${textoTempo}`, tipoEstilo: 'pendente' };
  };

  const formatarTempo = (segundos: number): string => {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatarRelogioDigital = (dateObj: Date): string => {
    const h = String(dateObj.getHours()).padStart(2, '0');
    const m = String(dateObj.getMinutes()).padStart(2, '0');
    const s = String(dateObj.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const getSubAbaBtnStyle = (nomeAba: string): ViewStyle[] => {
    return subAba === nomeAba ? [styles.subAbaBtn, styles.subAbaBtnAtivo] : [styles.subAbaBtn];
  };

  const getSubAbaTextoStyle = (nomeAba: string): TextStyle[] => {
    return subAba === nomeAba ? [styles.subAbaTexto, styles.subAbaTextoAtivo] : [styles.subAbaTexto];
  };

  const getNavTextStyle = (nomeAba: string): TextStyle[] => {
    return abaInferior === nomeAba ? [styles.navText, styles.navTextAtivo] : [styles.navText];
  };

  const renderSubAbaContent = (): React.JSX.Element | null => {
    if (subAba === 'fixos') {
      return (
        <View>
          <Text style={styles.secaoHeader}>⌛ Timeline de Eventos Diarios:</Text>
          <View style={styles.timelineBox}>
            {eventos.map((ev) => {
              const infoStatus = getStatusEvento(ev);
              
              let badgeStyle: ViewStyle = styles.badgePendente;
              let badgeTextStyle: TextStyle = styles.badgeTextoPendente;

              if (infoStatus.tipoEstilo === 'concluido') {
                badgeStyle = styles.badgeConcluido;
                badgeTextStyle = styles.badgeTextoConcluido;
              } else if (infoStatus.tipoEstilo === 'emAndamento') {
                badgeStyle = styles.badgeEmAndamento;
                badgeTextStyle = styles.badgeTextoEmAndamento;
              } else if (infoStatus.tipoEstilo === 'desativado') {
                badgeStyle = styles.badgeDesativado;
                badgeTextStyle = styles.badgeTextoDesativado;
              }

              return (
                <View key={ev.id} style={styles.cardTimeline}>
                  <View style={styles.cardTimelineInfo}>
                    <Text style={styles.cardTitulo}>{ev.nome}</Text>
                    <Text style={styles.cardHorario}>
                      ⏰ {ev.tipo === 'duracao' ? `${ev.inicio} - ${ev.fim}` : ev.inicio}
                    </Text>
                    {Boolean(ev.aviso) && (
                      <Text style={styles.cardAvisoTexto}>📢 {ev.aviso}</Text>
                    )}
                  </View>
                  <View style={badgeStyle}>
                    <Text style={badgeTextStyle}>{infoStatus.status}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={styles.secaoHeader}>⚡ Notificacoes Automaticas (5m antes):</Text>
          <View style={styles.botoesAcaoRow}>
            <TouchableOpacity
              style={styles.btnAtivarTodas}
              onPress={() => {
                const novas = eventos.map((e) => ({ ...e, ativo: true }));
                setEventos(novas);
                agendarEventosAtivos(novas);
              }}
            >
              <Text style={styles.btnAcaoTexto}>🔔 Ativar Todas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnDesativarTodas}
              onPress={() => {
                const novas = eventos.map((e) => ({ ...e, ativo: false }));
                setEventos(novas);
                Notifications.cancelAllScheduledNotificationsAsync();
              }}
            >
              <Text style={styles.btnAcaoTexto}>🔕 Desativar Todas</Text>
            </TouchableOpacity>
          </View>

          {eventos.map((ev) => (
            <View key={ev.id} style={styles.cardToggle}>
              <View style={styles.cardTimelineInfo}>
                <Text style={styles.cardTitulo}>{ev.nome}</Text>
                <Text style={styles.cardSub}>
                  Horario: {ev.tipo === 'duracao' ? `${ev.inicio} as ${ev.fim}` : ev.inicio}
                </Text>
                <Text style={styles.cardNotiInfo}>⚡ Notifica 5m antes</Text>
              </View>
              <Switch
                value={ev.ativo}
                onValueChange={() => {
                  const novas = eventos.map((e) => e.id === ev.id ? { ...e, ativo: !e.ativo } : e);
                  setEventos(novas);
                  agendarEventosAtivos(novas);
                }}
                trackColor={{ false: '#334155', true: '#059669' }}
                thumbColor={ev.ativo ? '#10B981' : '#94A3B8'}
              />
            </View>
          ))}
        </View>
      );
    }

    if (subAba === 'sistema') {
      return (
        <View>
          <Text style={styles.secaoHeader}>⏳ Controle de Cooldowns de Guilda:</Text>
          <Text style={styles.subTituloInstrucao}>
            Slots final 1 possuem o controle adicional de 24h.
          </Text>

          {DIAS_SLOTS.map((slot) => {
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
                    value={Boolean(info1h.ativo)}
                    onValueChange={() => alternarCooldown1h(slot)}
                    trackColor={{ false: '#334155', true: '#2563EB' }}
                    thumbColor={info1h.ativo ? '#3B82F6' : '#94A3B8'}
                  />
                </View>

                {ehFinal1 && (
                  <View style={styles.rowSystemControlDivider}>
                    <View style={styles.cardTimelineInfo}>
                      <Text style={styles.cardSubLabel}>Alerta Final (24h)</Text>
                      <Text style={info24h.ativo ? styles.cardTimerAtivo24 : styles.cardSub}>
                        {info24h.ativo ? `⌛ ${formatarTempo(info24h.tempoRestante)}` : 'Inativo'}
                      </Text>
                    </View>
                    <Switch
                      value={Boolean(info24h.ativo)}
                      onValueChange={() => alternarCooldown24h(slot)}
                      trackColor={{ false: '#334155', true: '#D97706' }}
                      thumbColor={info24h.ativo ? '#F59E0B' : '#94A3B8'}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      );
    }

    if (subAba === 'custom') {
      return (
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
              placeholder="Horario exato (ex: 20:30)"
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
            eventosCustom.map((ev) => (
              <View key={ev.id} style={styles.cardToggle}>
                <View style={styles.cardTimelineInfo}>
                  <Text style={styles.cardTitulo}>{ev.nome}</Text>
                  <Text style={styles.cardSub}>Horario: {ev.horario}</Text>
                </View>
                <TouchableOpacity onPress={() => removerEventoCustom(ev)} style={styles.btnDeletar}>
                  <Text style={styles.btnDeletarTexto}>🗑️ Excluir</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <View style={styles.header}>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerEmoji}>🛡️</Text>
          <Text style={styles.headerTitle}>Alertas Poke Membros Guilda Brasil</Text>
        </View>
        <View style={styles.clockBox}>
          <Text style={styles.clockIcon}>🕒</Text>
          <Text style={styles.clockText}>{formatarRelogioDigital(agora)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {abaInferior === 'gerador' && (
          <View style={styles.painelContainer}>
            <Text style={styles.painelTitulo}>🔔 Painel de Notificacoes</Text>

            <View style={styles.subAbasContainer}>
              <TouchableOpacity
                style={getSubAbaBtnStyle('fixos')}
                onPress={() => setSubAba('fixos')}
              >
                <Text style={getSubAbaTextoStyle('fixos')}>Eventos Fixos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={getSubAbaBtnStyle('sistema')}
                onPress={() => setSubAba('sistema')}
              >
                <Text style={getSubAbaTextoStyle('sistema')}>Sistema</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={getSubAbaBtnStyle('custom')}
                onPress={() => setSubAba('custom')}
              >
                <Text style={getSubAbaTextoStyle('custom')}>Customizavel</Text>
              </TouchableOpacity>
            </View>

            {renderSubAbaContent()}
          </View>
        )}

        {abaInferior === 'dev' && (
          <View style={styles.painelContainer}>
            <Text style={styles.painelTitulo}>⚙️ Modos & Testes Dev</Text>
            
            <View style={styles.cardSystemSlot}>
              <Text style={styles.cardTitulo}>Canal de Alertas Críticos (DND)</Text>
              <Text style={styles.cardSubLabel}>
                Se ativo, novos alertas agendados usarão o canal crítico (vibração + furar Não Perturbe).
              </Text>

              <View style={styles.rowSystemControl}>
                <Text style={styles.cardSub}>Furar Não Perturbe</Text>
                <Switch
                  value={modoDndAtivo}
                  onValueChange={setModoDndAtivo}
                  trackColor={{ false: '#334155', true: '#EF4444' }}
                  thumbColor={modoDndAtivo ? '#F87171' : '#94A3B8'}
                />
              </View>

              <TouchableOpacity
                style={[styles.btnAdicionarCustom, { marginTop: 12, backgroundColor: '#334155' }]}
                onPress={abrirConfiguracoesDnd}
              >
                <Text style={styles.btnAcaoTexto}>📲 Abrir Permissões DND no Android</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btnAdicionarCustom, { backgroundColor: '#2563EB', marginTop: 10 }]}
              onPress={() => agendarNotificacao('⚡ Teste Dev', 'Testando alerta em 3 segundos!', 3, modoDndAtivo ? 'channel_critical_alerts' : 'default')}
            >
              <Text style={styles.btnAcaoTexto}>🚀 Disparar Notificação de Teste (3s)</Text>
            </TouchableOpacity>
          </View>
        )}

        {abaInferior !== 'gerador' && abaInferior !== 'dev' && (
          <View style={styles.abaVaziaContainer}>
            <Text style={styles.abaVaziaTexto}>Tela: {abaInferior.toUpperCase()}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.navBottom}>
        <TouchableOpacity style={styles.navItem} onPress={() => setAbaInferior('gerador')}>
          <Text style={styles.navIcon}>⚡</Text>
          <Text style={getNavTextStyle('gerador')}>Gerador</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setAbaInferior('pessoas')}>
          <Text style={styles.navIcon}>👥</Text>
          <Text style={getNavTextStyle('pessoas')}>Pessoas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setAbaInferior('historico')}>
          <Text style={styles.navIcon}>📜</Text>
          <Text style={getNavTextStyle('historico')}>Historico</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setAbaInferior('guilda')}>
          <Text style={styles.navIcon}>🏰</Text>
          <Text style={getNavTextStyle('guilda')}>Guilda</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setAbaInferior('dev')}>
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={getNavTextStyle('dev')}>Dev</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#1C2541',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8
  },
  headerEmoji: {
    fontSize: 16,
    marginRight: 6
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    flexShrink: 1
  },
  clockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B132B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3B82F6'
  },
  clockIcon: {
    fontSize: 11,
    marginRight: 4
  },
  clockText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
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
  badgeConcluido: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  badgeTextoConcluido: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold'
  },
  badgeEmAndamento: {
    backgroundColor: '#EAB308',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  badgeTextoEmAndamento: {
    color: '#000000',
    fontSize: 11,
    fontWeight: 'bold'
  },
  badgePendente: {
    backgroundColor: '#2563EB',
    borderWidth: 1,
    borderColor: '#60A5FA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  badgeTextoPendente: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold'
  },
  badgeDesativado: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  badgeTextoDesativado: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: 'bold'
  },
  botoesAcaoRow: {
    flexDirection: 'row',
    marginBottom: 16
  },
  btnAtivarTodas: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 5
  },
  btnDesativarTodas: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 5
  },
  btnAcaoTexto: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13
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
    borderColor: '#2A365C'
  },
  cardSystemSlot: {
    backgroundColor: '#1C2541',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A365C'
  },
  rowSystemControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6
  },
  rowSystemControlDivider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2A365C',
    paddingTop: 8
  },
  cardSubLabel: {
    color: '#94A3B8',
    fontSize: 12
  },
  cardSub: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2
  },
  cardTimerAtivo: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2
  },
  cardTimerAtivo24: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2
  },
  cardNotiInfo: {
    color: '#10B981',
    fontSize: 11,
    marginTop: 4
  },
  formCustomBox: {
    backgroundColor: '#1C2541',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  inputCustom: {
    backgroundColor: '#0B132B',
    color: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155'
  },
  btnAdicionarCustom: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center'
  },
  btnDeletar: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  btnDeletarTexto: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold'
  },
  abaVaziaContainer: {
    padding: 30,
    alignItems: 'center'
  },
  abaVaziaTexto: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center'
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
    paddingVertical: 8
  },
  navItem: {
    flex: 1,
    alignItems: 'center'
  },
  navIcon: {
    fontSize: 16
  },
  navText: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2
  },
  navTextAtivo: {
    color: '#3B82F6',
    fontWeight: 'bold'
  }
});
