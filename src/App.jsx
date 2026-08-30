import React, { useState } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';

export default function App() {
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  // Solicita permissão nativa do Android
  const pedirPermissao = async () => {
    try {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display === 'granted') {
        addLog('Permissão NATIVA concedida!');
      } else {
        addLog('Permissão negada pelo usuário.');
      }
    } catch (err) {
      addLog('Erro de permissão: ' + err.message);
    }
  };

  // Dispara a notificação pelo próprio Android
  const agendarNotificacao = async () => {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: '🛡️ Kira Evento Notificações',
            body: 'Seu evento de guilda vai começar em breve!',
            id: new Date().getTime(),
            schedule: { at: new Date(Date.now() + 1000 * 3) }, // Dispara em 3 segundos
            sound: null,
            actionTypeId: '',
            extra: null
          }
        ]
      });
      addLog('Notificação agendada! Aguarde 3 segundos...');
    } catch (err) {
      addLog('Erro ao enviar: ' + err.message);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🛡️ Kira Evento notificações</h1>
        <p style={styles.subtitle}>Notificações Nativa do App</p>
      </header>

      <main style={styles.card}>
        <div style={styles.buttonGroup}>
          <button style={styles.btnPrimary} onClick={pedirPermissao}>
            1. Ativar Permissão
          </button>
          
          <button style={styles.btnSecondary} onClick={agendarNotificacao}>
            2. Testar Notificação (3s)
          </button>
        </div>

        <div style={styles.logContainer}>
          <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Histórico:</h3>
          <div style={styles.logBox}>
            {logs.length === 0 ? (
              <p style={{ opacity: 0.6, fontSize: '13px' }}>Clique nos botões acima para testar.</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} style={styles.logItem}>{log}</div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: { textAlign: 'center', marginBottom: '24px' },
  title: { fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' },
  subtitle: { fontSize: '14px', color: '#94a3b8' },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%'
  },
  buttonGroup: { display: 'flex', flexDirection: 'column', gap: '12px' },
  btnPrimary: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  btnSecondary: {
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  logContainer: { marginTop: '24px' },
  logBox: {
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    padding: '12px',
    maxHeight: '150px',
    overflowY: 'auto'
  },
  logItem: { fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }
};
