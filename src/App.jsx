import React, { useState, useEffect } from 'react';

export default function App() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Este navegador ou WebView não suporta notificações.');
      return;
    }

    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === 'granted') {
        addLog('Permissão para notificações concedida!');
      } else {
        addLog('Permissão negada.');
      }
    } catch (err) {
      addLog('Erro ao solicitar permissão: ' + err.message);
    }
  };

  const sendTestNotification = () => {
    if (permission !== 'granted') {
      alert('Por favor, ative as notificações primeiro.');
      return;
    }

    const title = '🛡️ Kira Evento Notificações';
    const options = {
      body: 'Esta é uma notificação de teste enviada pelo aplicativo!',
      icon: 'https://via.placeholder.com/128/2563eb/ffffff?text=Kira',
      vibrate: [200, 100, 200]
    };

    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, options);
      });
    } else {
      new Notification(title, options);
    }

    addLog('Notificação de teste enviada.');
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🛡️ Kira Evento notificações</h1>
        <p style={styles.subtitle}>Painel de Controle de Notificações</p>
      </header>

      <main style={styles.card}>
        <div style={styles.statusBox}>
          <span>Status das Notificações:</span>
          <strong style={{
            color: permission === 'granted' ? '#22c55e' : permission === 'denied' ? '#ef4444' : '#f59e0b'
          }}>
            {permission.toUpperCase()}
          </strong>
        </div>

        <div style={styles.buttonGroup}>
          {permission !== 'granted' && (
            <button style={styles.btnPrimary} onClick={requestNotificationPermission}>
              Ativar Notificações
            </button>
          )}

          <button style={styles.btnSecondary} onClick={sendTestNotification}>
            Testar Notificação
          </button>
        </div>

        <div style={styles.logContainer}>
          <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Histórico de Eventos:</h3>
          <div style={styles.logBox}>
            {logs.length === 0 ? (
              <p style={{ opacity: 0.6, fontSize: '13px' }}>Nenhum evento registrado ainda.</p>
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
  header: {
    textAlign: 'center',
    marginBottom: '24px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#94a3b8'
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
  },
  statusBox: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px',
    backgroundColor: '#334155',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px'
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
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
    backgroundColor: '#475569',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  logContainer: {
    marginTop: '24px'
  },
  logBox: {
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    padding: '12px',
    maxHeight: '150px',
    overflowY: 'auto'
  },
  logItem: {
    fontSize: '12px',
    color: '#cbd5e1',
    marginBottom: '4px',
    fontFamily: 'monospace'
  }
};
