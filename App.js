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

// Configuração de comportamento das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const EVENTOS_FIXOS = [
  { id: '1', nome: 'Reset Servidor', inicio: '01:00', fim: '01:00', tipo: 'ponto' },
  { id: '2', nome: 'Interserver Duplo', inicio: '07:00', fim: '11:00', tipo: 'duracao' },
  { id: '3', nome: 'Transporte', inicio: '09:00', fim: '10:00', tipo: 'duracao' },
  { id: '4', nome: 'Boss', inicio: '16:00', fim: '16:00', tipo: 'ponto' },
  { id: '5', nome: 'Riot', inicio: '17:00', fim: '17:00', tipo: 'ponto' },
];

export default function App() {
  const [alertasAtivos, setAlertasAtivos] = useState(true);
  const [progressoNotificacao, setProgressoNotificacao] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('fixos');

  useEffect(() => {
    solicitarPermissoes();
  }, []);

  useEffect(() => {
    let interval = null;
    if (progressoNotificacao) {
      atualizarNotificacaoProgresso();
      interval = setInterval(atualizarNotificacaoProgresso, 60000); // Atualiza a cada minuto
    } else {
      cancelarNotificacaoProgresso();
    }
    return () => clearInterval(interval);
  }, [progressoNotificacao]);

  async function solicitarPermissoes() {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      alert('Permissão para notificações é necessária!');
    }
  }

  // Converte "HH:MM" para minutos do dia
  function getMinutos(horarioStr) {
    const [h, m] = horarioStr.split(':').map(Number);
    return h * 60 + m;
  }

  // Notificação com barra de progresso no Android
  async function atualizarNotificacaoProgresso() {
    const agora = new Date();
    const minutosAtuais = agora.getHours() * 60 + agora.getMinutes();
    const totalMinutosDia = 24 * 60;
    const porcentagem = Math.round((minutosAtuais / totalMinutosDia) * 100);

    // Encontra evento em andamento ou o próximo
    const eventoAtual = EVENTOS_FIXOS.find(e => {
      const ini = getMinutos(e.inicio);
      const fim = getMinutos(e.fim);
      return e.tipo === 'duracao' && minutosAtuais >= ini && minutosAtuais <= fim;
    });

    const proximoEvento = EVENTOS_FIXOS.find(e => getMinutos(e.inicio) > minutosAtuais) || EVENTOS_FIXOS[0];

    let textoNotificacao = eventoAtual 
      ? `Em andamento: ${eventoAtual.nome}`
      : `Próximo: ${proximoEvento.nome} às ${proximoEvento.inicio}`;

    await Notifications.scheduleNotificationAsync({
      identifier: 'progresso_notificacao',
      content: {
        title: '📊 Progresso dos Eventos do Dia',
        body: `[${porcentagem}% do dia] ${textoNotificacao}`,
        sticky: true, // Mantém a notificação fixa na barra
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#EAB308', // Cor amarela da notificação
      },
      trigger: null, // Exibe imediatamente
    });
  }

  async function cancelarNotificacaoProgresso() {
    await Notifications.dismissNotificationAsync('progresso_notificacao');
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.tituloHeader}>Alertas Poke_membros</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Toggle Alertas do Dia */}
        <View style={styles.cardToggle}>
          <View>
            <Text style={styles.tituloToggle}>Alertas do Dia</Text>
            <Text style={styles.subtituloToggle}>Notificar 5 min antes</Text>
          </View>
          <Switch
            value={alertasAtivos}
            onValueChange={setAlertasAtivos}
            trackColor={{ false: '#334155', true: '#0284C7' }}
            thumbColor={alertasAtivos ? '#38BDF8' : '#94A3B8'}
          />
        </View>

        {/* Toggle Ver progresso na notificação */}
        <View style={[styles.cardToggle, { borderColor: '#EAB308', borderWidth: 1 }]}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.tituloToggle}>Ver progresso na notificação</Text>
            <Text style={styles.subtituloToggle}>Exibe barra amarela de status do dia</Text>
          </View>
          <Switch
            value={progressoNotificacao}
            onValueChange={setProgressoNotificacao}
            trackColor={{ false: '#334155', true: '#CA8A04' }}
            thumbColor={progressoNotificacao ? '#FACC15' : '#94A3B8'}
          />
        </View>

        {/* Linha do Tempo / Timeline */}
        <Text style={styles.secaoTitulo}>Timeline de Eventos</Text>
        <View style={styles.timelineContainer}>
          {EVENTOS_FIXOS.map((evento, index) => (
            <View key={evento.id} style={styles.timelineItem}>
              
              {/* Coluna Esquerda: Horário */}
              <View style={styles.timelineHoraBox}>
                <Text style={styles.timelineHoraTexto}>{evento.inicio}</Text>
                {evento.tipo === 'duracao' && (
                  <Text style={styles.timelineHoraFim}>até {evento.fim}</Text>
                )}
              </View>

              {/* Coluna Meio: Linha e Ponto Visual */}
              <View style={styles.timelineLinhaBox}>
                <View style={styles.timelinePonto} />
                {index !== EVENTOS_FIXOS.length - 1 && <View style={styles.timelineLinha} />}
              </View>

              {/* Coluna Direita: Card do Evento */}
              <View style={styles.timelineCard}>
                <Text style={styles.eventoNome}>{evento.nome}</Text>
                <Text style={styles.eventoSub}>
                  {evento.tipo === 'duracao' 
                    ? `Evento ativo (${evento.inicio} - ${evento.fim})`
                    : `Horário fixo (${evento.inicio})`}
                </Text>
              </View>

            </View>
          ))}
        </View>

      </ScrollView>

      {/* Navegação Inferior por Abas */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, abaAtiva === 'fixos' && styles.navItemAtivo]}
          onPress={() => setAbaAtiva('fixos')}
        >
          <Text style={[styles.navTexto, abaAtiva === 'fixos' && styles.navTextoAtivo]}>
            Eventos Fixos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, abaAtiva === 'custom' && styles.navItemAtivo]}
          onPress={() => setAbaAtiva('custom')}
        >
          <Text style={[styles.navTexto, abaAtiva === 'custom' && styles.navTextoAtivo]}>
            Alertas Custom
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, abaAtiva === 'guilda' && styles.navItemAtivo]}
          onPress={() => setAbaAtiva('guilda')}
        >
          <Text style={[styles.navTexto, abaAtiva === 'guilda' && styles.navTextoAtivo]}>
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
    backgroundColor: '#0B1120',
  },
  header: {
    paddingVertical: 18,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  tituloHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  cardToggle: {
    flexDirection: 'row',
    justifyContent: 'space-[#1E293B]',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  tituloToggle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtituloToggle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  secaoTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginTop: 12,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
    minHeight: 60,
  },
  timelineHoraBox: {
    width: 70,
    alignItems: 'flex-end',
    paddingRight: 12,
    paddingTop: 4,
  },
  timelineHoraTexto: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: 'bold',
  },
  timelineHoraFim: {
    color: '#64748B',
    fontSize: 11,
  },
  timelineLinhaBox: {
    alignItems: 'center',
    marginRight: 12,
  },
  timelinePonto: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#38BDF8',
    borderWidth: 3,
    borderColor: '#0B1120',
    zIndex: 1,
  },
  timelineLinha: {
    width: 2,
    flex: 1,
    backgroundColor: '#334155',
    marginTop: -2,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    justifyContent: 'center',
  },
  eventoNome: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  eventoSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  bottomNav: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  navItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  navItemAtivo: {
    borderTopWidth: 2,
    borderTopColor: '#38BDF8',
  },
  navTexto: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  navTextoAtivo: {
    color: '#38BDF8',
    fontWeight: 'bold',
  },
});
    
