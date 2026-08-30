import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const COOLDOWN_KEY = '@cooldown_guilda_timestamp';
const TEMPO_COOLDOWN_MS = (1 * 60 + 1) * 60 * 1000; // 1 hora e 1 minuto

export default function CooldownGuildaScreen() {
  const [tempoRestante, setTempoRestante] = useState(0);
  const [guildaAlvo, setGuildaAlvo] = useState('');

  useEffect(() => {
    verificarCooldownAtivo();
  }, []);

  useEffect(() => {
    let interval = null;
    if (tempoRestante > 0) {
      interval = setInterval(() => {
        setTempoRestante((prev) => (prev <= 1000 ? 0 : prev - 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [tempoRestante]);

  const verificarCooldownAtivo = async () => {
    const dados = await AsyncStorage.getItem(COOLDOWN_KEY);
    if (dados) {
      const { timestampFim, guilda } = JSON.parse(dados);
      const agora = Date.now();
      if (timestampFim > agora) {
        setTempoRestante(timestampFim - agora);
        setGuildaAlvo(guilda);
      } else {
        await AsyncStorage.removeItem(COOLDOWN_KEY);
      }
    }
  };

  const iniciarCooldown = async (nomeGuilda) => {
    const agora = Date.now();
    const timestampFim = agora + TEMPO_COOLDOWN_MS;

    await AsyncStorage.setItem(
      COOLDOWN_KEY,
      JSON.stringify({ timestampFim, guilda: nomeGuilda })
    );

    setTempoRestante(TEMPO_COOLDOWN_MS);
    setGuildaAlvo(nomeGuilda);

    // Agenda a notificação local para avisar o término da contagem
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🛡️ Cooldown de Guilda Finalizado!',
        body: `Seu tempo de espera terminou. Você já pode entrar na ${nomeGuilda}!`,
        sound: true,
      },
      trigger: {
        seconds: (1 * 60 + 1) * 60,
      },
    });

    Alert.alert(
      'Cooldown Iniciado',
      `Timer de 1h01m ativado para entrar na ${nomeGuilda}. Você será notificado!`
    );
  };

  const cancelarCooldown = async () => {
    await AsyncStorage.removeItem(COOLDOWN_KEY);
    setTempoRestante(0);
    setGuildaAlvo('');
  };

  const formatarTempo = (ms) => {
    const totalSegundos = Math.floor(ms / 1000);
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;

    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Cooldown de Troca de Guilda</Text>
        <Text style={styles.subtitle}>
          Inicie o cronômetro assim que sair da guilda atual para receber um aviso no fim do tempo de espera (1h01m).
        </Text>

        {tempoRestante > 0 ? (
          <View style={styles.timerContainer}>
            <Text style={styles.targetText}>Troca para: {guildaAlvo}</Text>
            <Text style={styles.timerText}>{formatarTempo(tempoRestante)}</Text>
            
            <TouchableOpacity style={styles.cancelButton} onPress={cancelarCooldown}>
              <Text style={styles.cancelButtonText}>Cancelar Timer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.guildButton, styles.guild1]}
              onPress={() => iniciarCooldown('Guilda 1')}
            >
              <Text style={styles.guildButtonText}>Sair & Ir para Guilda 1</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.guildButton, styles.guild2]}
              onPress={() => iniciarCooldown('Guilda 2')}
            >
              <Text style={styles.guildButtonText}>Sair & Ir para Guilda 2</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0f172a', justifyContent: 'center' },
  card: { backgroundColor: '#1e293b', padding: 20, borderRadius: 12, alignItems: 'center' },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  timerContainer: { alignItems: 'center', width: '100%' },
  targetText: { color: '#38bdf8', fontSize: 16, fontWeight: '600' },
  timerText: { color: '#f8fafc', fontSize: 42, fontWeight: 'bold', marginVertical: 16 },
  cancelButton: { backgroundColor: '#ef4444', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6 },
  cancelButtonText: { color: '#fff', fontWeight: 'bold' },
  buttonContainer: { width: '100%', gap: 12 },
  guildButton: { padding: 16, borderRadius: 8, alignItems: 'center' },
  guild1: { backgroundColor: '#0284c7' },
  guild2: { backgroundColor: '#0d9488' },
  guildButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
