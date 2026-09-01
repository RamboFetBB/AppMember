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
  Linking,
  ActivityIndicator,
  Modal,
  ViewStyle,
  TextStyle
} from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';

interface EventoFixo {
  id: string;
  nome: string;
  inicio: string;
  fim?: string;
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
  { id: '2', nome: 'Interserver Duplo', inicio: '07:00', fim: '11:00', tipo: 'duracao', ativo: true, dias: [0, 1, 2, 3, 4, 5, 6] },
  { id: '3', nome: 'Transporte Duplo', inicio: '09:00', fim: '10:00', tipo: 'duracao', ativo: true, dias: [0, 1, 2, 3, 4, 5, 6] },
  { id: '4', nome: 'GvG (GuildasXGuildas)', inicio: '15:30', fim: '15:35', tipo: 'ponto', ativo: true, dias: [6], aviso: 'A GvG ira iniciar em breve!' },
  { id: '5', nome: 'Boss', inicio: '16:00', fim: '16:05', tipo: 'ponto', ativo: true, dias: [0, 1, 2, 3, 4, 5, 6] },
  { id: '6', nome: 'Riot', inicio: '17:00', fim: '17:05', tipo: 'ponto', ativo: true, dias: [0, 1, 2, 3, 4, 5, 6] },
  { id: '7', nome: 'Evento Fixo Extra 1', inicio: '20:00', fim: '20:05', tipo: 'ponto', ativo: false, dias: [0, 1, 2, 3, 4, 5, 6] },
  { id: '8', nome: 'Evento Fixo Extra 2', inicio: '21:00', fim: '21:05', tipo: 'ponto', ativo: false, dias: [0, 1, 2, 3, 4, 5, 6] }
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
  const [subAbaDev, setSubAbaDev] = useState<string>('geral');
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [eventos, setEventos] = useState<EventoFixo[]>(EVENTOS_FIXOS_INICIAIS);
  const [agora, setAgora] = useState<Date>(new Date());
  const [cooldowns, setCooldowns] = useState<Record<string, CooldownState>>({});
  const [eventosCustom, setEventosCustom] = useState<EventoCustom[]>([]);
  const [novoNome, setNovoNome] = useState<string>('');
  const [novoHorario, setNovoHorario] = useState<string>('');
  const [modoDndAtivo, setModoDndAtivo] = useState<boolean>(true);
  const [horariosManuais, setHorariosManuais] = useState<Record<string, string>>({});

  const [modalEditVisible, setModalEditVisible] = useState<boolean>(false);
  const [eventoEmEdicao, setEventoEmEdicao] = useState<EventoFixo | null>(null);
  const [editNome, setEditNome] = useState<string>('');
  const [editInicio, setEditInicio] = useState<string>('');

  const [statusUpdate, setStatusUpdate] = useState<string>('Nenhuma verificação realizada');
  const [loadingUpdate, setLoadingUpdate] = useState<boolean>(false);
  const [releaseDataHora, setReleaseDataHora] = useState<string | null>(null);

  const theme = {
    bg: isDarkMode ? '#0B132B' : '#F1F5F9',
    card: isDarkMode ? '#1C2541' : '#FFFFFF',
    panel: isDarkMode ? '#111C38' : '#E2E8F0',
    text: isDarkMode ? '#FFFFFF' : '#0F172A',
    subtext: isDarkMode ? '#94A3B8' : '#475569',
    border: isDarkMode ? '#2A365C' : '#CBD5E1',
    header: isDarkMode ? '#1C2541' : '#FFFFFF',
    inputBg: isDarkMode ? '#0B132B' : '#F8FAFC',
    inputBorder: isDarkMode ? '#334155' : '#94A3B8'
  };

  useEffect(() => {
    configurarNotificacoes();
    carregarDados();
    checarEInstalarAPK(true);

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

  const formatarEntradaHora = (text: string): string => {
    const apenasNumeros = text.replace(/\D/g, '');
    const limpo = apenasNumeros.slice(0, 4);
    if (limpo.length > 2) {
      return `${limpo.slice(0, 2)}:${limpo.slice(2)}`;
    }
    return limpo;
  };

  const carregarDados = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('@theme_dark');
      if (savedTheme !== null) setIsDarkMode(JSON.parse(savedTheme));

      const savedEventos = await AsyncStorage.getItem('@eventos_fixos');
      const savedCustom = await AsyncStorage.getItem('@eventos_custom');
      const savedCooldowns = await AsyncStorage.getItem('@cooldowns_state');

      let listaFixos = EVENTOS_FIXOS_INICIAIS;
      if (savedEventos) {
        listaFixos = JSON.parse(savedEventos);
      }
      setEventos(listaFixos);
      agendarEventosAtivos(listaFixos);

      if (savedCustom) setEventosCustom(JSON.parse(savedCustom));

      if (savedCooldowns) {
        const parsed: Record<string, CooldownState> = JSON.parse(savedCooldowns);
        const agoraMs = Date.now();
        const revalidados: Record<string, CooldownState> = {};

        Object.keys(parsed).forEach((key) => {
          const item = parsed[key];
          if (item && item.ativo) {
            const restante = Math.max(0, Math.ceil((item.fimTimestamp - agoraMs) / 1000));
            revalidados[key] = {
              ...item,
              ativo: restante > 0,
              tempoRestante: restante
            };
          }
        });

        setCooldowns(revalidados);
      }
    } catch (e) {
      console.warn('Erro ao carregar dados locais:', e);
    }
  };

  const alternarTema = async () => {
    const novoModo = !isDarkMode;
    setIsDarkMode(novoModo);
    await AsyncStorage.setItem('@theme_dark', JSON.stringify(novoModo));
  };

  const checarEInstalarAPK = async (somenteChecar: boolean = false) => {
    setLoadingUpdate(true);
    setStatusUpdate('Verificando última versão no GitHub...');

    try {
      const response = await fetch('https://api.github.com/repos/rambofetbb/AppMember/releases/latest');
      if (!response.ok) {
        throw new Error('Não foi possível conectar ao GitHub Releases.');
      }

      const data = await response.json();

      if (data.published_at) {
        const dateObj = new Date(data.published_at);
        const dataFormatada = dateObj.toLocaleDateString('pt-BR');
        const horaFormatada = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        setReleaseDataHora(`${dataFormatada} às ${horaFormatada}`);
      }

      const apkAsset = data.assets?.find((asset: any) => asset.name.endsWith('.apk'));
      if (!apkAsset) {
        setStatusUpdate('⚠️ Nenhum APK foi encontrado na última release.');
        setLoadingUpdate(false);
        return;
      }

      if (somenteChecar) {
        setStatusUpdate('✅ Última release encontrada no GitHub.');
        setLoadingUpdate(false);
        return;
      }

      setStatusUpdate('Baixando APK (0%)...');
      const apkUrl = apkAsset.browser_download_url;
      const fileUri = `${FileSystem.cacheDirectory}update.apk`;

      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      }

      const downloadResumable = FileSystem.createDownloadResumable(
        apkUrl,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = Math.round(
            (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100
          );
          setStatusUpdate(`Baixando APK: ${progress}%`);
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result || !result.uri) {
        throw new Error('Falha no download do arquivo.');
      }

      setStatusUpdate('🟢 Download concluído! Abrindo instalador...');

      const contentUri = await FileSystem.getContentUriAsync(result.uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        type: 'application/vnd.android.package-archive',
        flags: 1,
      });

    } catch (e: any) {
      console.log('Erro ao buscar/instalar APK:', e);
      setStatusUpdate(`❌ Erro: ${e.message || 'Falha ao processar APK'}`);
    } finally {
      setLoadingUpdate(false);
    }
  };

  const salvarCooldowns = async (novos: Record<string, CooldownState>) => {
    setCooldowns(novos);
    try {
      await AsyncStorage.setItem('@cooldowns_state', JSON.stringify(novos));
    } catch (e) {
      console.warn('Erro ao salvar cooldowns:', e);
    }
  };

  const salvarEventosFixos = async (novos: EventoFixo[]) => {
    setEventos(novos);
    try {
      await AsyncStorage.setItem('@eventos_fixos', JSON.stringify(novos));
    } catch (e) {
      console.warn('Erro ao salvar eventos fixos:', e);
    }
  };

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

  const agendarNotificacaoExata = async (
    titulo: string,
    corpo: string,
    dataAlvo: Date,
    channelId: string = 'default'
  ): Promise<string | null> => {
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
          date: dataAlvo,
          channelId: channelId,
        } as any,
      });
    } catch (e) {
      console.warn('Erro ao agendar notificacao:', e);
      return null;
    }
  };

  const agendarEventosAtivos = async (listaEventos: EventoFixo[]): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const agoraRef = new Date();
    const canalUsado = modoDndAtivo ? 'channel_critical_alerts' : 'default';

    for (const ev of listaEventos) {
      if (ev.ativo) {
        const [hStr, mStr] = ev.inicio.split(':');
        const hora = parseInt(hStr, 10);
        const minuto = parseInt(mStr, 10);

        const dataAlvo5m = new Date(agoraRef);
        dataAlvo5m.setHours(hora, minuto - 5, 0, 0);
        if (dataAlvo5m.getTime() <= agoraRef.getTime()) {
          dataAlvo5m.setDate(dataAlvo5m.getDate() + 1);
        }
        await agendarNotificacaoExata(
          `Alertas Poke Membros - ${ev.nome} (5m)`,
          ev.aviso ? ev.aviso : `O evento ${ev.nome} começa em 5 minutos!`,
          dataAlvo5m,
          canalUsado
        );

        const dataAlvo1m = new Date(agoraRef);
        dataAlvo1m.setHours(hora, minuto - 1, 0, 0);
        if (dataAlvo1m.getTime() <= agoraRef.getTime()) {
          dataAlvo1m.setDate(dataAlvo1m.getDate() + 1);
        }
        await agendarNotificacaoExata(
          `Alertas Poke Membros - ${ev.nome} (1m)`,
          `Atenção! Falta apenas 1 minuto para o evento ${ev.nome}!`,
          dataAlvo1m,
          canalUsado
        );

        const dataAlvo0m = new Date(agoraRef);
        dataAlvo0m.setHours(hora, minuto, 0, 0);
        if (dataAlvo0m.getTime() <= agoraRef.getTime()) {
          dataAlvo0m.setDate(dataAlvo0m.getDate() + 1);
        }
        await agendarNotificacaoExata(
          `Alertas Poke Membros - ${ev.nome} (INICIOU)`,
          `O evento ${ev.nome} começou agora!`,
          dataAlvo0m,
          canalUsado
        );
      }
    }
  };

  const abrirEdicaoEvento = (ev: EventoFixo) => {
    setEventoEmEdicao(ev);
    setEditNome(ev.nome);
    setEditInicio(ev.inicio);
    setModalEditVisible(true);
  };

  const salvarEdicaoEvento = () => {
    if (!eventoEmEdicao) return;
    if (!editNome.trim() || !editInicio.trim() || !editInicio.includes(':')) {
      Alert.alert('Erro', 'Por favor informe um nome válido e o horário no formato HH:MM.');
      return;
    }

    const novas = eventos.map((ev) => {
      if (ev.id === eventoEmEdicao.id) {
        return { ...ev, nome: editNome.trim(), inicio: editInicio.trim() };
      }
      return ev;
    });

    salvarEventosFixos(novas);
    agendarEventosAtivos(novas);
    setModalEditVisible(false);
    setEventoEmEdicao(null);
    Alert.alert('Sucesso', 'Evento fixo atualizado com sucesso!');
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
      const novos = {
        ...cooldowns,
        [key]: { ativo: false, fimTimestamp: 0, tempoRestante: 0, notifId: null }
      };
      salvarCooldowns(novos);
    } else {
      const fimTimestamp = Date.now() + COOLDOWN_1H01 * 1000;
      const dataAlvo = new Date(fimTimestamp);
      const canalUsado = modoDndAtivo ? 'channel_critical_alerts' : 'default';
      const notifId = await agendarNotificacaoExata(
        'Alertas Poke Membros - Guilda',
        `Você já pode se juntar à próxima guilda! (${slot})`,
        dataAlvo,
        canalUsado
      );

      const novos = {
        ...cooldowns,
        [key]: { ativo: true, fimTimestamp, tempoRestante: COOLDOWN_1H01, notifId }
      };
      salvarCooldowns(novos);
    }
  };

  const alternarCooldown24h = async (slot: string): Promise<void> => {
    const key = `${slot}_24h`;
    const estadoAtual = cooldowns[key];

    if (estadoAtual && estadoAtual.ativo) {
      await cancelarNotificacao(estadoAtual.notifId);
      const novos = {
        ...cooldowns,
        [key]: { ativo: false, fimTimestamp: 0, tempoRestante: 0, notifId: null }
      };
      salvarCooldowns(novos);
    } else {
      const fimTimestamp = Date.now() + COOLDOWN_24H * 1000;
      const dataAlvo = new Date(fimTimestamp);
      const canalUsado = modoDndAtivo ? 'channel_critical_alerts' : 'default';
      const notifId = await agendarNotificacaoExata(
        'Alertas Poke Membros - Alerta 24h',
        `Chegou as 24h do dia anterior da guilda ${slot}`,
        dataAlvo,
        canalUsado
      );

      const novos = {
        ...cooldowns,
        [key]: { ativo: true, fimTimestamp, tempoRestante: COOLDOWN_24H, notifId }
      };
      salvarCooldowns(novos);
    }
  };

  const aplicarHorarioManual = async (slot: string): Promise<void> => {
    const hor = horariosManuais[slot];
    if (!hor || !hor.includes(':')) {
      Alert.alert('Atenção', 'Informe o horário no formato correto HH:MM (ex: 14:30)');
      return;
    }

    const partes = hor.trim().split(':');
    const h = parseInt(partes[0], 10);
    const m = parseInt(partes[1], 10);

    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      Alert.alert('Atenção', 'Horário inválido. Digite um horário entre 00:00 e 23:59.');
      return;
    }

    const agoraRef = new Date();
    let dataEntrada = new Date(agoraRef);
    dataEntrada.setHours(h, m, 0, 0);

    if (dataEntrada.getTime() > agoraRef.getTime()) {
      dataEntrada.setDate(dataEntrada.getDate() - 1);
    }

    const entradaMs = dataEntrada.getTime();
    const fim1hMs = entradaMs + COOLDOWN_1H01 * 1000;
    const fim24hMs = entradaMs + COOLDOWN_24H * 1000;
    const agoraMs = Date.now();

    const canalUsado = modoDndAtivo ? 'channel_critical_alerts' : 'default';
    let novosCooldowns = { ...cooldowns };

    const key1h = `${slot}_1h`;
    if (novosCooldowns[key1h]?.notifId) {
      await cancelarNotificacao(novosCooldowns[key1h].notifId);
    }

    if (fim1hMs > agoraMs) {
      const restante1h = Math.ceil((fim1hMs - agoraMs) / 1000);
      const notifId1h = await agendarNotificacaoExata(
        'Alertas Poke Membros - Guilda',
        `Você já pode se juntar à próxima guilda! (${slot})`,
        new Date(fim1hMs),
        canalUsado
      );
      novosCooldowns[key1h] = {
        ativo: true,
        fimTimestamp: fim1hMs,
        tempoRestante: restante1h,
        notifId: notifId1h,
      };
    } else {
      novosCooldowns[key1h] = { ativo: false, fimTimestamp: 0, tempoRestante: 0, notifId: null };
    }

    const key24h = `${slot}_24h`;
    if (novosCooldowns[key24h]?.notifId) {
      await cancelarNotificacao(novosCooldowns[key24h].notifId);
    }

    if (fim24hMs > agoraMs) {
      const restante24h = Math.ceil((fim24hMs - agoraMs) / 1000);
      const notifId24h = await agendarNotificacaoExata(
        'Alertas Poke Membros - Alerta 24h',
        `Chegou as 24h do dia anterior da guilda ${slot}`,
        new Date(fim24hMs),
        canalUsado
      );
      novosCooldowns[key24h] = {
        ativo: true,
        fimTimestamp: fim24hMs,
        tempoRestante: restante24h,
        notifId: notifId24h,
      };
    } else {
      novosCooldowns[key24h] = { ativo: false, fimTimestamp: 0, tempoRestante: 0, notifId: null };
    }

    salvarCooldowns(novosCooldowns);
    Alert.alert('Sucesso', `Cronômetro retroativo atualizado para o slot ${slot}!`);
  };

  const adicionarEventoCustom = async (): Promise<void> => {
    if (!novoNome.trim() || !novoHorario.trim()) {
      Alert.alert('Atenção', 'Preencha o nome e o horário do evento (formato HH:MM).');
      return;
    }

    const partes = novoHorario.trim().split(':');
    if (partes.length !== 2 || isNaN(parseInt(partes[0], 10)) || isNaN(parseInt(partes[1], 10))) {
      Alert.alert('Atenção', 'Informe o horário no formato correto Ex: 14:30');
      return;
    }

    const hAlvo = parseInt(partes[0], 10);
    const mAlvo = parseInt(partes[1], 10);

    const dataAlvo = new Date();
    dataAlvo.setHours(hAlvo, mAlvo, 0, 0);

    if (dataAlvo.getTime() <= Date.now()) {
      dataAlvo.setDate(dataAlvo.getDate() + 1);
    }

    const canalSelecionado = modoDndAtivo ? 'channel_critical_alerts' : 'default';

    const notifId = await agendarNotificacaoExata(
      `Alertas Poke Membros - ${novoNome.trim()}`,
      `O seu alerta customizado "${novoNome.trim()}" está acontecendo agora!`,
      dataAlvo,
      canalSelecionado
    );

    const novo: EventoCustom = {
      id: Date.now().toString(),
      nome: novoNome.trim(),
      horario: novoHorario.trim(),
      notifId
    };

    const listaAtualizada = [...eventosCustom, novo];
    setEventosCustom(listaAtualizada);
    await AsyncStorage.setItem('@eventos_custom', JSON.stringify(listaAtualizada));

    setNovoNome('');
    setNovoHorario('');
    Alert.alert('Sucesso', 'Alerta customizado agendado com sucesso!');
  };

  const removerEventoCustom = async (ev: EventoCustom): Promise<void> => {
    if (ev.notifId) {
      await cancelarNotificacao(ev.notifId);
    }
    const listaAtualizada = eventosCustom.filter((item) => item.id !== ev.id);
    setEventosCustom(listaAtualizada);
    await AsyncStorage.setItem('@eventos_custom', JSON.stringify(listaAtualizada));
  };

  const abrirConfiguracoesDnd = () => {
    if (Platform.OS === 'android') {
      Linking.openSettings();
    } else {
      Alert.alert('Info', 'Recurso de canal exclusivo Android.');
    }
  };

  const formatarContador = (segundosTotais: number): string => {
    const h = Math.floor(segundosTotais / 3600);
    const m = Math.floor((segundosTotais % 3600) / 60);
    const s = segundosTotais % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  };

  const getStatusEvento = (ev: EventoFixo): { status: string; tipoEstilo: string } => {
    const diaAtual = agora.getDay();
    if (ev.dias && !ev.dias.includes(diaAtual)) {
      return { status: 'HOJE NÃO', tipoEstilo: 'desativado' };
    }

    const [hIni, mIni] = ev.inicio.split(':').map(Number);
    const dataInicioHoje = new Date(agora);
    dataInicioHoje.setHours(hIni, mIni, 0, 0);

    const [hFim, mFim] = (ev.tipo === 'duracao' ? (ev.fim || ev.inicio) : ev.inicio).split(':').map(Number);
    const dataFimHoje = new Date(agora);
    if (ev.tipo === 'duracao') {
      dataFimHoje.setHours(hFim, mFim, 0, 0);
    } else {
      dataFimHoje.setHours(hIni, mIni + 5, 0, 0);
    }

    const agoraMs = agora.getTime();

    if (agoraMs >= dataInicioHoje.getTime() && agoraMs < dataFimHoje.getTime()) {
      return { status: 'Em andamento', tipoEstilo: 'emAndamento' };
    }

    if (agoraMs < dataInicioHoje.getTime()) {
      const diffSegundos = Math.floor((dataInicioHoje.getTime() - agoraMs) / 1000);
      return { status: `Falta ${formatarContador(diffSegundos)}`, tipoEstilo: 'pendente' };
    }

    const ehResetServidor = ev.id === '1' || ev.nome.toLowerCase().includes('reset');
    if (ehResetServidor) {
      const dataInicioAmanha = new Date(dataInicioHoje);
      dataInicioAmanha.setDate(dataInicioAmanha.getDate() + 1);
      const diffSegundosAmanha = Math.floor((dataInicioAmanha.getTime() - agoraMs) / 1000);
      return { status: `Falta ${formatarContador(diffSegundosAmanha)}`, tipoEstilo: 'pendente' };
    }

    return { status: 'Concluído hoje', tipoEstilo: 'concluido' };
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

  const renderSubAbaContent = (): React.JSX.Element | null => {
    if (subAba === 'fixos') {
      return (
        <View>
          <Text style={[styles.secaoHeader, { color: theme.text }]}>⌛ Timeline de Eventos Diários:</Text>
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
                <View key={ev.id} style={[styles.cardTimeline, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.cardTimelineInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.cardTitulo, { color: theme.text }]}>{ev.nome}</Text>
                      <TouchableOpacity onPress={() => abrirEdicaoEvento(ev)} style={{ marginLeft: 8, padding: 4 }}>
                        <Text style={{ fontSize: 14 }}>✏️</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.cardHorario, { color: theme.subtext }]}>
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

          <Text style={[styles.secaoHeader, { color: theme.text }]}>⚡ Notificações Automáticas (5m, 1m e Início):</Text>
          <View style={styles.botoesAcaoRow}>
            <TouchableOpacity
              style={styles.btnAtivarTodas}
              onPress={() => {
                const novas = eventos.map((e) => ({ ...e, ativo: true }));
                salvarEventosFixos(novas);
                agendarEventosAtivos(novas);
              }}
            >
              <Text style={styles.btnAcaoTexto}>🔔 Ativar Todas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnDesativarTodas}
              onPress={() => {
                const novas = eventos.map((e) => ({ ...e, ativo: false }));
                salvarEventosFixos(novas);
                Notifications.cancelAllScheduledNotificationsAsync();
              }}
            >
              <Text style={styles.btnAcaoTexto}>🔕 Desativar Todas</Text>
            </TouchableOpacity>
          </View>

          {eventos.map((ev) => (
            <View key={ev.id} style={[styles.cardToggle, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardTimelineInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.cardTitulo, { color: theme.text }]}>{ev.nome}</Text>
                  <TouchableOpacity onPress={() => abrirEdicaoEvento(ev)} style={{ marginLeft: 8, padding: 4 }}>
                    <Text style={{ fontSize: 14 }}>✏️</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.cardSub, { color: theme.subtext }]}>
                  Horário: {ev.tipo === 'duracao' ? `${ev.inicio} às ${ev.fim}` : ev.inicio}
                </Text>
                <Text style={styles.cardNotiInfo}>⚡ Notifica 5m, 1m antes e no início</Text>
              </View>
              <Switch
                value={ev.ativo}
                onValueChange={() => {
                  const novas = eventos.map((e) => e.id === ev.id ? { ...e, ativo: !e.ativo } : e);
                  salvarEventosFixos(novas);
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
          <Text style={[styles.secaoHeader, { color: theme.text }]}>⏳ Controle de Cooldowns de Guilda:</Text>
          <Text style={[styles.subTituloInstrucao, { color: theme.subtext }]}>
            Insira o horário de entrada manual para calcular o tempo retroativo ou ative os alertas diretamente.
          </Text>

          {DIAS_SLOTS.map((slot) => {
            const info1h = cooldowns[`${slot}_1h`] || { ativo: false, tempoRestante: 0 };
            const info24h = cooldowns[`${slot}_24h`] || { ativo: false, tempoRestante: 0 };

            return (
              <View key={slot} style={[styles.cardSystemSlot, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.cardTitulo, { color: theme.text }]}>Slot {slot}</Text>

                <View style={styles.rowManualInput}>
                  <TextInput
                    style={[styles.inputManual, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.inputBorder }]}
                    placeholder="Ex: 1430 (14:30)"
                    placeholderTextColor="#64748B"
                    value={horariosManuais[slot] || ''}
                    onChangeText={(val) => {
                      const textoFormatado = formatarEntradaHora(val);
                      setHorariosManuais((prev) => ({ ...prev, [slot]: textoFormatado }));
                    }}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                  <TouchableOpacity
                    style={styles.btnManual}
                    onPress={() => aplicarHorarioManual(slot)}
                  >
                    <Text style={styles.btnManualTexto}>⏱️ Retroativo</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.rowSystemControl}>
                  <View style={styles.cardTimelineInfo}>
                    <Text style={[styles.cardSubLabel, { color: theme.subtext }]}>Cooldown Guilda (1h01m)</Text>
                    <Text style={info1h.ativo ? styles.cardTimerAtivo : [styles.cardSub, { color: theme.subtext }]}>
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

                <View style={[styles.rowSystemControlDivider, { borderTopColor: theme.border }]}>
                  <View style={styles.cardTimelineInfo}>
                    <Text style={[styles.cardSubLabel, { color: theme.subtext }]}>Alerta Final (24h)</Text>
                    <Text style={info24h.ativo ? styles.cardTimerAtivo24 : [styles.cardSub, { color: theme.subtext }]}>
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
              </View>
            );
          })}
        </View>
      );
    }

    if (subAba === 'custom') {
      return (
        <View>
          <Text style={[styles.secaoHeader, { color: theme.text }]}>🛠️ Criar Alerta Customizado:</Text>

          <View style={[styles.formCustomBox, { backgroundColor: theme.card }]}>
            <TextInput
              style={[styles.inputCustom, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.inputBorder }]}
              placeholder="Nome do Evento (ex: Floresta Rica)"
              placeholderTextColor="#64748B"
              value={novoNome}
              onChangeText={setNovoNome}
            />
            <TextInput
              style={[styles.inputCustom, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.inputBorder }]}
              placeholder="Horário exato (ex: 2030 vira 20:30)"
              placeholderTextColor="#64748B"
              value={novoHorario}
              onChangeText={(val) => setNovoHorario(formatarEntradaHora(val))}
              keyboardType="numeric"
              maxLength={5}
            />
            <TouchableOpacity style={styles.btnAdicionarCustom} onPress={adicionarEventoCustom}>
              <Text style={styles.btnAcaoTexto}>➕ Adicionar Alerta</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.secaoHeader, { color: theme.text }]}>📋 Seus Eventos Customizados:</Text>
          {eventosCustom.length === 0 ? (
            <Text style={[styles.abaVaziaTexto, { color: theme.subtext }]}>Nenhum evento customizado adicionado.</Text>
          ) : (
            eventosCustom.map((ev) => (
              <View key={ev.id} style={[styles.cardToggle, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.cardTimelineInfo}>
                  <Text style={[styles.cardTitulo, { color: theme.text }]}>{ev.nome}</Text>
                  <Text style={[styles.cardSub, { color: theme.subtext }]}>Horário: {ev.horario}</Text>
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.header} />

      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerEmoji}>🛡️</Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Alertas Poke Membros</Text>
        </View>

        <TouchableOpacity onPress={alternarTema} style={{ marginRight: 10, padding: 4 }}>
          <Text style={{ fontSize: 18 }}>{isDarkMode ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>

        <View style={[styles.clockBox, { backgroundColor: theme.bg }]}>
          <Text style={styles.clockIcon}>🕒</Text>
          <Text style={styles.clockText}>{formatarRelogioDigital(agora)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {abaInferior === 'gerador' && (
          <View style={[styles.painelContainer, { backgroundColor: theme.panel, borderColor: theme.border }]}>
            <Text style={[styles.painelTitulo, { color: theme.text }]}>🔔 Painel de Notificações</Text>

            <View style={[styles.subAbasContainer, { backgroundColor: theme.bg }]}>
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

            {renderSubAbaContent()}
          </View>
        )}

        {abaInferior === 'dev' && (
          <View style={[styles.painelContainer, { backgroundColor: theme.panel, borderColor: theme.border }]}>
            <Text style={[styles.painelTitulo, { color: theme.text }]}>⚙️ Central do Desenvolvedor</Text>

            <View style={[styles.subAbasContainer, { backgroundColor: theme.bg }]}>
              <TouchableOpacity
                style={[styles.subAbaBtn, subAbaDev === 'geral' && styles.subAbaBtnAtivo]}
                onPress={() => setSubAbaDev('geral')}
              >
                <Text style={[styles.subAbaTexto, subAbaDev === 'geral' && styles.subAbaTextoAtivo]}>Geral & Build</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subAbaBtn, subAbaDev === 'testes' && styles.subAbaBtnAtivo]}
                onPress={() => setSubAbaDev('testes')}
              >
                <Text style={[styles.subAbaTexto, subAbaDev === 'testes' && styles.subAbaTextoAtivo]}>🧪 Testes</Text>
              </TouchableOpacity>
            </View>

            {subAbaDev === 'geral' && (
              <View>
                <View style={[styles.cardSystemSlot, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.cardTitulo, { color: theme.text }]}>Atualização do App (GitHub Release)</Text>
                  <Text style={[styles.cardSubLabel, { color: theme.subtext }]}>
                    Baixa e instala o arquivo APK publicado na release do seu repositório.
                  </Text>

                  <TouchableOpacity
                    style={[styles.btnAdicionarCustom, { marginTop: 10, backgroundColor: '#059669' }]}
                    onPress={() => checarEInstalarAPK(false)}
                    disabled={loadingUpdate}
                  >
                    {loadingUpdate ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.btnAcaoTexto}>🚀 Baixar e Instalar Último APK</Text>
                    )}
                  </TouchableOpacity>

                  <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.border }}>
                    <Text style={{ color: theme.text, fontSize: 12, fontWeight: '500' }}>
                      {statusUpdate}
                    </Text>

                    {releaseDataHora && (
                      <Text style={{ color: '#38BDF8', fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                        📅 Lançamento do APK disponível: {releaseDataHora}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={[styles.cardSystemSlot, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.cardTitulo, { color: theme.text }]}>Canal de Alertas Críticos (DND)</Text>
                  <Text style={[styles.cardSubLabel, { color: theme.subtext }]}>
                    Se ativo, novos alertas agendados usarão o canal crítico (vibração + furar Não Perturbe).
                  </Text>

                  <View style={styles.rowSystemControl}>
                    <Text style={[styles.cardSub, { color: theme.subtext }]}>Furar Não Perturbe</Text>
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
                    <Text style={styles.btnAcaoTexto}>📲 Abrir Permissões no Android</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {subAbaDev === 'testes' && (
              <View>
                <View style={[styles.cardSystemSlot, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.cardTitulo, { color: theme.text }]}>🧪 Teste de Notificação de Eventos Fixos</Text>
                  <Text style={[styles.cardSubLabel, { color: theme.subtext, marginBottom: 10 }]}>
                    Dispara um alerta imediato no padrão dos eventos fixos para verificar o som e a notificação visual.
                  </Text>

                  <TouchableOpacity
                    style={[styles.btnAdicionarCustom, { backgroundColor: '#10B981', marginBottom: 10 }]}
                    onPress={() => {
                      const dataTeste = new Date(Date.now() + 3000);
                      const canal = modoDndAtivo ? 'channel_critical_alerts' : 'default';
                      agendarNotificacaoExata(
                        'Alertas Poke Membros - Boss (INICIOU)',
                        'O evento Boss começou agora! [TESTE]',
                        dataTeste,
                        canal
                      );
                      Alert.alert('Teste Agendado', 'A notificação de Evento Fixo vai tocar em 3 segundos. Bloqueie a tela ou vá para a Home!');
                    }}
                  >
                    <Text style={styles.btnAcaoTexto}>🔔 Testar Notificação de Evento Fixo (3s)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnAdicionarCustom, { backgroundColor: '#2563EB' }]}
                    onPress={() => {
                      const dataTeste = new Date(Date.now() + 3000);
                      const canal = modoDndAtivo ? 'channel_critical_alerts' : 'default';
                      agendarNotificacaoExata(
                        '⚡ Teste Alerta Geral',
                        'Notificação de teste executada com sucesso!',
                        dataTeste,
                        canal
                      );
                      Alert.alert('Teste Agendado', 'Notificação genérica em 3 segundos.');
                    }}
                  >
                    <Text style={styles.btnAcaoTexto}>🚀 Testar Alerta Genérico (3s)</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {abaInferior !== 'gerador' && abaInferior !== 'dev' && (
          <View style={styles.abaVaziaContainer}>
            <Text style={[styles.abaVaziaTexto, { color: theme.subtext }]}>Tela: {abaInferior.toUpperCase()}</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalEditVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalEditVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitulo, { color: theme.text }]}>✏️ Editar Evento Fixo</Text>

            <Text style={[styles.inputLabel, { color: theme.subtext }]}>Nome do Evento:</Text>
            <TextInput
              style={[styles.inputCustom, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.inputBorder }]}
              value={editNome}
              onChangeText={setEditNome}
              placeholder="Nome"
              placeholderTextColor="#64748B"
            />

            <Text style={[styles.inputLabel, { color: theme.subtext }]}>Horário de Início (HH:MM):</Text>
            <TextInput
              style={[styles.inputCustom, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.inputBorder }]}
              value={editInicio}
              onChangeText={(val) => setEditInicio(formatarEntradaHora(val))}
              placeholder="Ex: 16:00"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              maxLength={5}
            />

            <View style={styles.modalBotoesRow}>
              <TouchableOpacity
                style={[styles.btnModal, { backgroundColor: '#334155' }]}
                onPress={() => setModalEditVisible(false)}
              >
                <Text style={styles.btnAcaoTexto}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnModal, { backgroundColor: '#059669' }]}
                onPress={salvarEdicaoEvento}
              >
                <Text style={styles.btnAcaoTexto}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={[styles.navBottom, { backgroundColor: theme.header, borderTopColor: theme.border }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => setAbaInferior('gerador')}>
          <Text style={styles.navIcon}>⚡</Text>
          <Text style={abaInferior === 'gerador' ? styles.navTextAtivo : styles.navText}>Gerador</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setAbaInferior('pessoas')}>
          <Text style={styles.navIcon}>👥</Text>
          <Text style={abaInferior === 'pessoas' ? styles.navTextAtivo : styles.navText}>Pessoas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setAbaInferior('historico')}>
          <Text style={styles.navIcon}>📜</Text>
          <Text style={abaInferior === 'historico' ? styles.navTextAtivo : styles.navText}>Histórico</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setAbaInferior('guilda')}>
          <Text style={styles.navIcon}>🏰</Text>
          <Text style={abaInferior === 'guilda' ? styles.navTextAtivo : styles.navText}>Guilda</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setAbaInferior('dev')}>
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={abaInferior === 'dev' ? styles.navTextAtivo : styles.navText}>Dev</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 14,
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
    fontSize: 13,
    fontWeight: 'bold',
    flexShrink: 1
  },
  clockBox: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  painelTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12
  },
  subAbasContainer: {
    flexDirection: 'row',
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
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 10
  },
  subTituloInstrucao: {
    fontSize: 12,
    marginBottom: 12
  },
  timelineBox: {
    marginBottom: 16
  },
  cardTimeline: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  cardTimelineInfo: {
    flex: 1
  },
  cardTitulo: {
    fontSize: 15,
    fontWeight: 'bold'
  },
  cardHorario: {
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
    fontSize: 13,
    textAlign: 'center'
  },
  cardToggle: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  cardSystemSlot: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  rowManualInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8
  },
  inputManual: {
    flex: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    borderWidth: 1,
    marginRight: 8
  },
  btnManual: {
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6
  },
  btnManualTexto: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold'
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
    paddingTop: 8
  },
  cardSubLabel: {
    fontSize: 12
  },
  cardSub: {
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
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  inputCustom: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1
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
    fontSize: 13,
    textAlign: 'center'
  },
  navBottom: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
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
    fontWeight: 'bold',
    fontSize: 10,
    marginTop: 2
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalBox: {
    width: '100%',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1
  },
  modalTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 14
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 4
  },
  modalBotoesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  btnModal: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    marginHorizontal: 4,
    alignItems: 'center'
  }
});
