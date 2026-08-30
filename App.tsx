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
  Platform
} from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async function () {
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});

var EVENTOS_FIXOS_INICIAIS = [
  { id: '1', nome: 'Reset Servidor', inicio: '01:00', fim: '01:05', tipo: 'ponto', ativo: true, dias: [0, 1, 2, 3, 4, 5, 6] },
  { id: '2', nome: 'Interserver Double', inicio: '07:00', fim: '11:00', tipo: 'duracao', ativo: true, dias: [0, 1, 2, 3, 4, 5, 6] },
  { id: '3', nome: 'Transporte Duplo', inicio: '09:00', fim: '10:00', tipo: 'duracao', ativo: true, dias: [0, 1, 2, 3, 4, 5, 6] },
  { id: '4', nome: 'GuildasXGuildas', inicio: '15:30', fim: '15:35', tipo: 'ponto', ativo: true, dias: [6], aviso: 'A GvG ira iniciar em breve!' },
  { id: '5', nome: 'Boss', inicio: '16:00', fim: '16:05', tipo: 'ponto', ativo: true, dias: [0, 1, 2, 3, 4, 5, 6] },
  { id: '6', nome: 'Riot', inicio: '17:00', fim: '17:05', tipo: 'ponto', ativo: true, dias: [0, 1, 2, 3, 4, 5, 6] }
];

var DIAS_SLOTS = [
  'Seg1', 'Seg2', 'Ter1', 'Ter2', 'Qua1', 'Qua2',
  'Qui1', 'Qui2', 'Sex1', 'Sex2', 'Sab1', 'Sab2', 'Dom1', 'Dom2'
];

var COOLDOWN_1H01 = 3660;
var COOLDOWN_24H = 86400;

export default function App() {
  var stateAba = useState('gerador');
  var abaInferior = stateAba[0];
  var setAbaInferior = stateAba[1];

  var stateSubAba = useState('fixos');
  var subAba = stateSubAba[0];
  var setSubAba = stateSubAba[1];

  var stateEventos = useState(EVENTOS_FIXOS_INICIAIS);
  var eventos = stateEventos[0];
  var setEventos = stateEventos[1];

  var stateAgora = useState(new Date());
  var agora = stateAgora[0];
  var setAgora = stateAgora[1];

  var stateCooldowns = useState<Record<string, any>>({});
  var cooldowns = stateCooldowns[0];
  var setCooldowns = stateCooldowns[1];

  var stateEventosCustom = useState<any[]>([]);
  var eventosCustom = stateEventosCustom[0];
  var setEventosCustom = stateEventosCustom[1];

  var stateNovoNome = useState('');
  var novoNome = stateNovoNome[0];
  var setNovoNome = stateNovoNome[1];

  var stateNovoHorario = useState('');
  var novoHorario = stateNovoHorario[0];
  var setNovoHorario = stateNovoHorario[1];

  useEffect(function () {
    configurarNotificacoes();
    var timer = setInterval(function () {
      var agoraAtual = new Date();
      setAgora(agoraAtual);

      var agoraMs = agoraAtual.getTime();
      setCooldowns(function (prev: any) {
        var mudou = false;
        var novos = Object.assign({}, prev);

        Object.keys(novos).forEach(function (key) {
          var item = novos[key];
          if (item && item.ativo) {
            var restante = Math.max(0, Math.ceil((item.fimTimestamp - agoraMs) / 1000));
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

    return function () {
      clearInterval(timer);
    };
  }, []);

  async function configurarNotificacoes() {
    var perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Alertas Fixos',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }
  }

  async function agendarNotificacao(titulo: string, corpo: string, segundos: number) {
    if (segundos <= 0) return null;
    try {
      return await Notifications.scheduleNotificationAsync({
        content: {
          title: titulo,
          body: corpo,
          sound: true,
          sticky: true,
          autoDismiss: false,
          data: { autoDismiss: false },
        },
        trigger: { seconds: segundos }
      });
    } catch (e) {
      console.warn('Erro ao agendar notificacao:', e);
      return null;
    }
  }

  async function agendarEventosAtivos(listaEventos: any[]) {
    await Notifications.cancelAllScheduledNotificationsAsync();

    var diaAtual = agora.getDay();
    var minutosAtuais = agora.getHours() * 60 + agora.getMinutes();
    var segundosAtuais = agora.getSeconds();

    for (var i = 0; i < listaEventos.length; i++) {
      var ev = listaEventos[i];
      if (ev.ativo && ev.dias && ev.dias.indexOf(diaAtual) !== -1) {
        var partes = ev.inicio.split(':');
        var iniMin = parseInt(partes[0], 10) * 60 + parseInt(partes[1], 10);
        
        var alvoMin = iniMin - 5; 
        var diffSegundos = (alvoMin - minutosAtuais) * 60 - segundosAtuais;

        if (diffSegundos > 0) {
          await agendarNotificacao(
            'Kira Alertas - ' + ev.nome,
            ev.aviso ? ev.aviso : 'O evento ' + ev.nome + ' comeca em 5 minutos!',
            diffSegundos
          );
        }
      }
    }
  }

  async function cancelarNotificacao(id: string | null) {
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  }

  async function alternarCooldown1h(slot: string) {
    var key = slot + '_1h';
    var estadoAtual = cooldowns[key];

    if (estadoAtual && estadoAtual.ativo) {
      await cancelarNotificacao(estadoAtual.notifId);
      setCooldowns(function (prev: any) {
        var n = Object.assign({}, prev);
        n[key] = { ativo: false, fimTimestamp: 0, tempoRestante: 0, notifId: null };
        return n;
      });
    } else {
      var fimTimestamp = Date.now() + COOLDOWN_1H01 * 1000;
      var notifId = await agendarNotificacao(
        'Kira Alertas - Guilda',
        'Voce ja pode se juntar a proxima guilda',
        COOLDOWN_1H01
      );

      setCooldowns(function (prev: any) {
        var n = Object.assign({}, prev);
        n[key] = { ativo: true, fimTimestamp: fimTimestamp, tempoRestante: COOLDOWN_1H01, notifId: notifId };
        return n;
      });
    }
  }

  async function alternarCooldown24h(slot: string) {
    var key = slot + '_24h';
    var estadoAtual = cooldowns[key];

    if (estadoAtual && estadoAtual.ativo) {
      await cancelarNotificacao(estadoAtual.notifId);
      setCooldowns(function (prev: any) {
        var n = Object.assign({}, prev);
        n[key] = { ativo: false, fimTimestamp: 0, tempoRestante: 0, notifId: null };
        return n;
      });
    } else {
      var fimTimestamp = Date.now() + COOLDOWN_24H * 1000;
      var notifId = await agendarNotificacao(
        'Kira Alertas - Alerta 24h',
        'Ja se passaram 24h desde a ultima guilda',
        COOLDOWN_24H
      );

      setCooldowns(function (prev: any) {
        var n = Object.assign({}, prev);
        n[key] = { ativo: true, fimTimestamp: fimTimestamp, tempoRestante: COOLDOWN_24H, notifId: notifId };
        return n;
      });
    }
  }

  function adicionarEventoCustom() {
    if (!novoNome.trim() || !novoHorario.trim()) {
      Alert.alert('Atencao', 'Preencha o nome e o horario do evento.');
      return;
    }

    var novo = {
      id: Date.now().toString(),
      nome: novoNome.trim(),
      horario: novoHorario.trim()
    };

    setEventosCustom(function (prev: any[]) {
      return prev.concat([novo]);
    });
    setNovoNome('');
    setNovoHorario('');
  }

  function removerEventoCustom(id: string) {
    setEventosCustom(function (prev: any[]) {
      return prev.filter(function (ev: any) {
        return ev.id !== id;
      });
    });
  }

  function getMinutos(horarioStr: string) {
    var partes = horarioStr.split(':');
    return parseInt(partes[0], 10) * 60 + parseInt(partes[1], 10);
  }

  function getStatusEvento(ev: any) {
    var diaAtual = agora.getDay();
    if (ev.dias && ev.dias.indexOf(diaAtual) === -1) {
      return { status: 'HOJE NAO', tipoEstilo: 'desativado' };
    }

    var minutosAtuais = agora.getHours() * 60 + agora.getMinutes();
    var segundosAtuais = agora.getSeconds();
    var iniMin = getMinutos(ev.inicio);
    var fimMin = ev.tipo === 'duracao' ? getMinutos(ev.fim) : iniMin + 5;

    if (minutosAtuais >= iniMin && minutosAtuais < fimMin) {
      return { status: 'Em andamento', tipoEstilo: 'emAndamento' };
    }

    if (minutosAtuais >= fimMin) {
      return { status: 'Concluido hoje', tipoEstilo: 'concluido' };
    }

    var diffMinutosTotal = (iniMin - minutosAtuais) * 60 - segundosAtuais;
    var h = Math.floor(diffMinutosTotal / 3600);
    var m = Math.floor((diffMinutosTotal % 3600) / 60);
    var s = diffMinutosTotal % 60;

    var textoTempo = h > 0 ? h + 'h ' + m + 'm ' + s + 's' : m + 'm ' + s + 's';
    return { status: 'Falta ' + textoTempo, tipoEstilo: 'pendente' };
  }

  function formatarTempo(segundos: number) {
    var h = Math.floor(segundos / 3600);
    var m = Math.floor((segundos % 3600) / 60);
    var s = segundos % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function formatarRelogioDigital(dateObj: Date) {
    var h = String(dateObj.getHours()).padStart(2, '0');
    var m = String(dateObj.getMinutes()).padStart(2, '0');
    var s = String(dateObj.getSeconds()).padStart(2, '0');
    return h + ':' + m + ':' + s;
  }

  function renderSubAbaContent() {
    if (subAba === 'fixos') {
      return (
        <View>
          <Text style={styles.secaoHeader}>⌛ Timeline de Eventos Diarios:</Text>
          <View style={styles.timelineBox}>
            {eventos.map(function (ev) {
              var infoStatus = getStatusEvento(ev);
              
              var badgeStyle = styles.badgePendente;
              var badgeTextStyle = styles.badgeTextoPendente;

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
                      ⏰ {ev.tipo === 'duracao' ? ev.inicio + ' - ' + ev.fim : ev.inicio}
                    </Text>
                    {ev.aviso ? (
                      <Text style={styles.cardAvisoTexto}>📢 {ev.aviso}</Text>
                    ) : null}
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
              onPress={function () {
                var novas = eventos.map(function (e) { return Object.assign({}, e, { ativo: true }); });
                setEventos(novas);
                agendarEventosAtivos(novas);
              }}
            >
              <Text style={styles.btnAcaoTexto}>🔔 Ativar Todas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnDesativarTodas}
              onPress={function () {
                var novas = eventos.map(function (e) { return Object.assign({}, e, { ativo: false }); });
                setEventos(novas);
                Notifications.cancelAllScheduledNotificationsAsync();
              }}
            >
              <Text style={styles.btnAcaoTexto}>🔕 Desativar Todas</Text>
            </TouchableOpacity>
          </View>

          {eventos.map(function (ev) {
            return (
              <View key={ev.id} style={styles.cardToggle}>
                <View style={styles.cardTimelineInfo}>
                  <Text style={styles.cardTitulo}>{ev.nome}</Text>
                  <Text style={styles.cardSub}>
                    Horario: {ev.tipo === 'duracao' ? ev.inicio + ' as ' + ev.fim : ev.inicio}
                  </Text>
                  <Text style={styles.cardNotiInfo}>⚡ Notifica 5m antes</Text>
                </View>
                <Switch
                  value={ev.ativo}
                  onValueChange={function () {
                    var novas = eventos.map(function (e) {
                      return e.id === ev.id ? Object.assign({}, e, { ativo: !e.ativo }) : e;
                    });
                    setEventos(novas);
                    agendarEventosAtivos(novas);
                  }}
                  trackColor={{ false: '#334155', true: '#059669' }}
                  thumbColor={ev.ativo ? '#10B981' : '#94A3B8'}
                />
              </View>
            );
          })}
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

          {DIAS_SLOTS.map(function (slot) {
            var ehFinal1 = slot.indexOf('1', slot.length - 1) !== -1;
            var info1h = cooldowns[slot + '_1h'] || { ativo: false, tempoRestante: 0 };
            var info24h = cooldowns[slot + '_24h'] || { ativo: false, tempoRestante: 0 };

            return (
              <View key={slot} style={styles.cardSystemSlot}>
                <Text style={styles.cardTitulo}>Slot {slot}</Text>

                <View style={styles.rowSystemControl}>
                  <View style={styles.cardTimelineInfo}>
                    <Text style={styles.cardSubLabel}>Cooldown Guilda (1h01m)</Text>
                    <Text style={info1h.ativo ? styles.cardTimerAtivo : styles.cardSub}>
                      {info1h.ativo ? '⏳ ' + formatarTempo(info1h.tempoRestante) : 'Inativo'}
                    </Text>
                  </View>
                  <Switch
                    value={Boolean(info1h.ativo)}
                    onValueChange={function () { alternarCooldown1h(slot); }}
                    trackColor={{ false: '#334155', true: '#2563EB' }}
                    thumbColor={info1h.ativo ? '#3B82F6' : '#94A3B8'}
                  />
                </View>

                {ehFinal1 ? (
                  <View style={styles.rowSystemControlDivider}>
                    <View style={styles.cardTimelineInfo}>
                      <Text style={styles.cardSubLabel}>Alerta Final (24h)</Text>
                      <Text style={info24h.ativo ? styles.cardTimerAtivo24 : styles.cardSub}>
                        {info24h.ativo ? '⌛ ' + formatarTempo(info24h.tempoRestante) : 'Inativo'}
                      </Text>
                    </View>
                    <Switch
                      value={Boolean(info24h.ativo)}
                      onValueChange={function () { alternarCooldown24h(slot); }}
                      trackColor={{ false: '#334155', true: '#D97706' }}
                      thumbColor={info24h.ativo ? '#F59E0B' : '#94A3B8'}
                    />
                  </View>
                ) : null}
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
              placeholder="Horario (ex: 20:30)"
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
            eventosCustom.map(function (ev) {
              return (
                <View key={ev.id} style={styles.cardToggle}>
                  <View style={styles.cardTimelineInfo}>
                    <Text style={styles.cardTitulo}>{ev.nome}</Text>
                    <Text style={styles.cardSub}>Horario: {ev.horario}</Text>
                  </View>
                  <TouchableOpacity onPress={function () { removerEventoCustom(ev.id); }} style={styles.btnDeletar}>
                    <Text style={styles.btnDeletarTexto}>🗑️ Excluir</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      );
    }

    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <View style={styles.header}>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerEmoji}>🛡️</Text>
          <Text style={styles.headerTitle}>Kira Alertas Sistema</Text>
        </View>
        <View style={styles.clockBox}>
          <Text style={styles.clockIcon}>🕒</Text>
          <Text style={styles.clockText}>{formatarRelogioDigital(agora)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {abaInferior === 'gerador' ? (
          <View style={styles.painelContainer}>
            <Text style={styles.painelTitulo}>🔔 Painel de Notificacoes</Text>

            <View style={styles.subAbasContainer}>
              <TouchableOpacity
                style={[styles.subAbaBtn, subAba === 'fixos' ? styles.subAbaBtnAtivo : null]}
                onPress={function () { setSubAba('fixos'); }}
              >
                <Text style={[styles.subAbaTexto, subAba === 'fixos' ? styles.subAbaTextoAtivo : null]}>Eventos Fixos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subAbaBtn, subAba === 'sistema' ? styles.subAbaBtnAtivo : null]}
                onPress={function () { setSubAba('sistema'); }}
              >
                <Text style={[styles.subAbaTexto, subAba === 'sistema' ? styles.subAbaTextoAtivo : null]}>Sistema</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subAbaBtn, subAba === 'custom' ? styles.subAbaBtnAtivo : null]}
                onPress={function () { setSubAba('custom'); }}
              >
                <Text style={[styles.subAbaTexto, subAba === 'custom' ? styles.subAbaTextoAtivo : null]}>Customizavel</Text>
              </TouchableOpacity>
            </View>

          
