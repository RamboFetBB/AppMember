import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Switch, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

const EVENTOS_FIXOS = [
  { id: '1', nome: 'Transporte Duplo', horario: '12:00', avisoMinutos: 5 },
  { id: '2', nome: 'Boss Interserver', horario: '15:00', avisoMinutos: 5 },
  { id: '3', nome: 'Interserver Double', horario: '19:00', avisoMinutos: 5 },
  { id: '4', nome: 'Riot de Guilda', horario: '21:00', avisoMinutos: 5 },
];

export default function EventosFixosScreen() {
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(true);

  const toggleSwitch = async () => {
    const novoStatus = !notificacoesAtivas;
    setNotificacoesAtivas(novoStatus);

    if (novoStatus) {
      await agendarAlertasEventos();
      Alert.alert('Notificações Ativadas', 'Alertas de eventos fixos agendados com sucesso!');
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      Alert.alert('Notificações Desativadas', 'Todos os alertas de eventos foram cancelados.');
    }
  };

  const agendarAlertasEventos = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão Necessária', 'Ative as permissões de notificação no seu dispositivo.');
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const evento of EVENTOS_FIXOS) {
      const [horas, minutos] = evento.horario.split(':').map(Number);
      
      let minutoAlerta = minutos - evento.avisoMinutos;
      let horaAlerta = horas;
      if (minutoAlerta < 0) {
        minutoAlerta += 60;
        horaAlerta -= 1;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `⚠️ Evento Próximo: ${evento.nome}`,
          body: `O evento ${evento.nome} começará em ${evento.avisoMinutos} minutos (${evento.horario})!`,
          sound: true,
        },
        trigger: {
          hour: horaAlerta,
          minute: minutoAlerta,
          repeats: true,
        },
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topCard}>
        <Text style={styles.topTitle}>Alertas do Dia</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Notificar 5 min antes</Text>
          <Switch
            trackColor={{ false: '#475569', true: '#0284c7' }}
            thumbColor={notificacoesAtivas ? '#38bdf8' : '#cbd5e1'}
            onValueChange={toggleSwitch}
            value={notificacoesAtivas}
          />
        </View>
      </View>

      <FlatList
        data={EVENTOS_FIXOS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.eventCard}>
            <View>
              <Text style={styles.eventName}>{item.nome}</Text>
              <Text style={styles.eventSub}>Alerta prévio de {item.avisoMinutos} minutos</Text>
            </View>
            <Text style={styles.eventTime}>{item.horario}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0f172a' },
  topCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { color: '#94a3b8', fontSize: 12, marginRight: 8 },
  eventCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#38bdf8',
  },
  eventName: { color: '#f8fafc', fontSize: 16, fontWeight: '600' },
  eventSub: { color: '#64748b', fontSize: 12, marginTop: 4 },
  eventTime: { color: '#38bdf8', fontSize: 18, fontWeight: 'bold' },
});
