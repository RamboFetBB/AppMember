import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const STORAGE_KEY = '@alertas_customizados';

export default function NotificacoesPersonalizadasScreen() {
  const [titulo, setTitulo] = useState('');
  const [horario, setHorario] = useState('');
  const [lembretes, setLembretes] = useState([]);

  useEffect(() => {
    carregarLembretes();
  }, []);

  const carregarLembretes = async () => {
    try {
      const dados = await AsyncStorage.getItem(STORAGE_KEY);
      if (dados) setLembretes(JSON.parse(dados));
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar os lembretes.');
    }
  };

  const salvarLembretes = async (novosLembretes) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novosLembretes));
      setLembretes(novosLembretes);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar o lembrete.');
    }
  };

  const adicionarLembrete = async () => {
    if (!titulo.trim() || !horario.trim()) {
      Alert.alert('Campos Obrigatórios', 'Preencha o título e o horário (ex: 14:30).');
      return;
    }

    const regexHorario = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!regexHorario.test(horario)) {
      Alert.alert('Horário Inválido', 'Use o formato HH:MM (exemplo: 08:30 ou 19:00).');
      return;
    }

    const [horas, minutos] = horario.split(':').map(Number);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `📌 Lembrete: ${titulo}`,
        body: `Está na hora do seu compromisso agendado!`,
        sound: true,
      },
      trigger: {
        hour: horas,
        minute: minutos,
        repeats: true,
      },
    });

    const novoLembrete = {
      id: notificationId,
      titulo,
      horario,
    };

    const novaLista = [...lembretes, novoLembrete];
    await salvarLembretes(novaLista);

    setTitulo('');
    setHorario('');
    Alert.alert('Sucesso', 'Alerta personalizado agendado!');
  };

  const removerLembrete = async (id) => {
    await Notifications.cancelScheduledNotificationAsync(id);
    const novaLista = lembretes.filter((item) => item.id !== id);
    await salvarLembretes(novaLista);
  };

  return (
    <View style={styles.container}>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Novo Alerta Personalizado</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Descrição (ex: Pegar Recompensa)"
          placeholderTextColor="#64748b"
          value={titulo}
          onChangeText={setTitulo}
        />

        <TextInput
          style={styles.input}
          placeholder="Horário (HH:MM)"
          placeholderTextColor="#64748b"
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          value={horario}
          onChangeText={setHorario}
        />

        <TouchableOpacity style={styles.button} onPress={adicionarLembrete}>
          <Text style={styles.buttonText}>Agendar Alerta</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={lembretes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View>
              <Text style={styles.itemTitle}>{item.titulo}</Text>
              <Text style={styles.itemTime}>Diariamente às {item.horario}</Text>
            </View>
            <TouchableOpacity style={styles.deleteButton} onPress={() => removerLembrete(item.id)}>
              <Text style={styles.deleteText}>Excluir</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0f172a' },
  formCard: { backgroundColor: '#1e293b', padding: 16, borderRadius: 8, marginBottom: 16 },
  formTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  input: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: { backgroundColor: '#0284c7', padding: 14, borderRadius: 6, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  itemCard: {
    backgroundColor: '#1e293b',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '600' },
  itemTime: { color: '#38bdf8', fontSize: 13, marginTop: 2 },
  deleteButton: { backgroundColor: '#ef4444', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4 },
  deleteText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});
