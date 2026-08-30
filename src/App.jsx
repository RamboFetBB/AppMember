import React, { useState, useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';

export default function App() {
  const [activeTab, setActiveTab] = useState('fixos'); // 'fixos', 'sistema', 'custom'
  const [jaEnviei, setJaEnviei] = useState(false);

  // Estados - Eventos Fixos (Switches)
  const [notifFixas, setNotifFixas] = useState({
    interserver: true,
    transporte: true,
    boss: true,
    riot: true,
  });

  // Estados - Sistema (Guilda)
  const [selectedGuilda, setSelectedGuilda] = useState(2);
  const [horarioSaida, setHorarioSaida] = useState('20:28');
  const [conteudoSistema, setConteudoSistema] = useState('Entrar na sab1');

  // Estados - Customizável
  const [tituloCustom, setTituloCustom] = useState('Lembrete GvG');
  const [horarioCustom, setHorarioCustom] = useState('19:00');
  const [conteudoCustom, setConteudoCustom] = useState('Hora de verificar e enviar a escala do rodízio!');
  const [diasSelecionados, setDiasSelecionados] = useState(['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']);

  useEffect(() => {
    LocalNotifications.requestPermissions();
  }, []);

  const getIntId = () => Math.floor(Math.random() * 2147483647);

  // Alternar Notificações Fixas
  const toggleFixa = (key) => {
    setNotifFixas((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const alternarTodasFixas = (status) => {
    setNotifFixas({
      interserver: status,
      transporte: status,
      boss: status,
      riot: status,
    });
  };

  // Agendar Notificação de Sistema (Guilda)
  const agendarSistema = async () => {
    try {
      const [horas, minutos] = horarioSaida.split(':').map(Number);
      if (isNaN(horas) || isNaN(minutos)) {
        alert('Digite um horário válido (HH:MM)');
        return;
      }

      const dataTarget = new Date();
      dataTarget.setHours(horas, minutos + 61, 0, 0); // +1h e 01m

      if (dataTarget.getTime() <= Date.now()) {
        dataTarget.setDate(dataTarget.getDate() + 1);
      }

      const h = String(dataTarget.getHours()).padStart(2, '0');
      const m = String(dataTarget.getMinutes()).padStart(2, '0');

      await LocalNotifications.schedule({
        notifications: [
          {
            title: `🛡️ Guilda ${selectedGuilda}`,
            body: `Você já consegue se juntar a Guilda ${selectedGuilda}! (${conteudoSistema})`,
            id: getIntId(),
            schedule: { at: dataTarget },
            sound: null,
          },
        ],
      });

      alert(`✅ Sucesso!\n\nLiberado às ${h}:${m} (1h01 após a saída).`);
    } catch (err) {
      alert('Erro ao agendar: ' + err.message);
    }
  };

  // Agendar Customizável
  const agendarCustom = async () => {
    try {
      const [horas, minutos] = horarioCustom.split(':').map(Number);
      const dataTarget = new Date();
      dataTarget.setHours(horas, minutos, 0, 0);

      if (dataTarget.getTime() <= Date.now()) {
        dataTarget.setDate(dataTarget.getDate() + 1);
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title: `🛡️ ${tituloCustom}`,
            body: conteudoCustom,
            id: getIntId(),
            schedule: { at: dataTarget },
            sound: null,
          },
        ],
      });

      alert(`✅ Lembrete "${tituloCustom}" agendado com sucesso!`);
    } catch (err) {
      alert('Erro: ' + err.message);
    }
  };

  const toggleDia = (dia) => {
    setDiasSelecionados((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  };

  return (
    <div style={styles.body}>
      {/* Header Topo */}
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.topTitle}>🛡️ GvG Dev Manager</h1>
          <span style={styles.resetTimer}>⏳ Reseta às 01:00: 04:07:20</span>
        </div>
        <button
          style={jaEnviei ? styles.btnStatusCheck : styles.btnStatusUncheck}
          onClick={() => setJaEnviei(!jaEnviei)}
        >
          {jaEnviei ? '✅ Já Enviei Hoje' : '☐ Marcar Enviei'}
        </button>
      </div>

      <div style={styles.container}>
        {/* Card Principal */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>🔔 Painel de Notificações</h2>

          {/* Abas */}
          <div style={styles.tabGroup}>
            <button
              style={activeTab === 'fixos' ? styles.tabBtnActive : styles.tabBtn}
              onClick={() => setActiveTab('fixos')}
            >
              Eventos Fixos
            </button>
            <button
              style={activeTab === 'sistema' ? styles.tabBtnActive : styles.tabBtn}
              onClick={() => setActiveTab('sistema')}
            >
              Sistema
            </button>
            <button
              style={activeTab === 'custom' ? styles.tabBtnActive : styles.tabBtn}
              onClick={() => setActiveTab('custom')}
            >
              Customizável
            </button>
          </div>

          {/* ABA 1: EVENTOS FIXOS */}
          {activeTab === 'fixos' && (
            <div style={{ marginTop: '16px' }}>
              <div style={styles.sectionSubTitle}>⏳ Timeline de Eventos Diários:</div>

              <div style={styles.timelineItem}>
                <div>
                  <strong>Interserver Double</strong>
                  <div style={styles.timeBadge}>⏰ 07:00 - 11:00</div>
                </div>
                <span style={styles.doneBadge}>Concluído Hoje</span>
              </div>

              <div style={styles.timelineItem}>
                <div>
                  <strong>Transporte Duplo</strong>
                  <div style={styles.timeBadge}>⏰ 09:00 - 10:00</div>
                </div>
                <span style={styles.doneBadge}>Concluído Hoje</span>
              </div>

              <div style={styles.timelineItem}>
                <div>
                  <strong>Boss</strong>
                  <div style={styles.timeBadge}>⏰ 16:00</div>
                </div>
                <span style={styles.doneBadge}>Concluído Hoje</span>
              </div>

              <div style={styles.timelineItem}>
                <div>
                  <strong>Riot</strong>
                  <div style={styles.timeBadge}>⏰ 17:00</div>
                </div>
                <span style={styles.doneBadge}>Concluído Hoje</span>
              </div>

              <div style={{ ...styles.sectionSubTitle, marginTop: '20px' }}>
                ⚡ Notificações Automáticas (5m antes):
              </div>

              <div style={styles.actionGrid}>
                <button style={styles.btnBlue} onClick={() => alternarTodasFixas(true)}>
                  🔔 Ativar Todas
                </button>
                <button style={styles.btnDarkGray} onClick={() => alternarTodasFixas(false)}>
                  🔕 Desativar Todas
                </button>
              </div>

              {/* Switches */}
              <div style={styles.switchBox}>
                <div>
                  <strong>Interserver Double</strong>
                  <div style={styles.subText}>Horário: 07:00 às 11:00</div>
                  <div style={styles.subTextHighlight}>⚡ Notifica diariamente 5m antes</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifFixas.interserver}
                  onChange={() => toggleFixa('interserver')}
                  style={styles.toggleInput}
                />
              </div>

              <div style={styles.switchBox}>
                <div>
                  <strong>Transporte Duplo</strong>
                  <div style={styles.subText}>Horário: 09:00 às 10:00</div>
                  <div style={styles.subTextHighlight}>⚡ Notifica diariamente 5m antes</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifFixas.transporte}
                  onChange={() => toggleFixa('transporte')}
                  style={styles.toggleInput}
                />
              </div>

              <div style={styles.switchBox}>
                <div>
                  <strong>Boss</strong>
                  <div style={styles.subText}>Horário: 16:00</div>
                  <div style={styles.subTextHighlight}>⚡ Notifica diariamente 5m antes</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifFixas.boss}
                  onChange={() => toggleFixa('boss')}
                  style={styles.toggleInput}
                />
              </div>

              <div style={styles.switchBox}>
                <div>
                  <strong>Riot</strong>
                  <div style={styles.subText}>Horário: 17:00</div>
                  <div style={styles.subTextHighlight}>⚡ Notifica diariamente 5m antes</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifFixas.riot}
                  onChange={() => toggleFixa('riot')}
                  style={styles.toggleInput}
                />
              </div>
            </div>
          )}

          {/* ABA 2: SISTEMA */}
          {activeTab === 'sistema' && (
            <div style={{ marginTop: '16px' }}>
              <div style={styles.rowBetween}>
                <span style={{ fontWeight: 'bold', fontSize: '14px' }}>⚙️ Notificação do Sistema</span>
                <input type="checkbox" defaultChecked style={styles.toggleInput} />
              </div>

              <label style={styles.label}>Título da Guilda (Travado):</label>
              <div style={styles.guildaGrid}>
                <button
                  style={selectedGuilda === 1 ? styles.guildaBtnActive : styles.guildaBtn}
                  onClick={() => setSelectedGuilda(1)}
                >
                  Guilda 1
                </button>
                <button
                  style={selectedGuilda === 2 ? styles.guildaBtnActive : styles.guildaBtn}
                  onClick={() => setSelectedGuilda(2)}
                >
                  Guilda 2
                </button>
              </div>

              <label style={styles.label}>Horário que saiu da guilda anterior (HH:MM):</label>
              <div style={styles.inputActionGrid}>
                <input
                  type="text"
                  style={styles.input}
                  value={horarioSaida}
                  onChange={(e) => setHorarioSaida(e.target.value)}
                />
                <button style={styles.btnGreen} onClick={agendarSistema}>
                  ✈️ Salvar & Agendar
                </button>
              </div>

              <small style={styles.warningText}>
                ⏳ Dispara 1h e 01 minuto após a saída dizendo: "Você já consegue se juntar a Guilda {selectedGuilda}"
              </small>

              <label style={{ ...styles.label, marginTop: '16px' }}>Conteúdo da Notificação:</label>
              <input
                type="text"
                style={styles.input}
                value={conteudoSistema}
                onChange={(e) => setConteudoSistema(e.target.value)}
              />
            </div>
          )}

          {/* ABA 3: CUSTOMIZÁVEL */}
          {activeTab === 'custom' && (
            <div style={{ marginTop: '16px' }}>
              <label style={styles.label}>Título da Notificação:</label>
              <input
                type="text"
                style={styles.input}
                value={tituloCustom}
                onChange={(e) => setTituloCustom(e.target.value)}
              />

              <label style={styles.label}>Horário (HH:MM):</label>
              <input
                type="text"
                style={styles.input}
                value={horarioCustom}
                onChange={(e) => setHorarioCustom(e.target.value)}
              />

              <label style={styles.label}>Conteúdo:</label>
              <textarea
                style={{ ...styles.input, height: '70px', resize: 'none' }}
                value={conteudoCustom}
                onChange={(e) => setConteudoCustom(e.target.value)}
              />

              <label style={styles.label}>Dias para Notificar:</label>
              <div style={styles.diasGrid}>
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia, idx) => {
                  const selected = diasSelecionados.includes(dia);
                  return (
                    <button
                      key={idx}
                      style={selected ? styles.diaBtnActive : styles.diaBtn}
                      onClick={() => toggleDia(dia)}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>

              <button style={{ ...styles.btnBlue, width: '100%', marginTop: '16px' }} onClick={agendarCustom}>
                ➕ Agendar Padrão
              </button>

              <div style={{ ...styles.sectionSubTitle, marginTop: '20px' }}>
                📋 Notificações Customizadas Ativas:
              </div>
            </div>
          )}
        </div>

        {/* Card Backup */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>💾 Backup de Dados</h2>
          <div style={styles.actionGrid}>
            <button style={styles.btnBlue}>💾 Exportar</button>
            <button style={styles.btnDarkGray}>📂 Importar</button>
          </div>
        </div>
      </div>

      {/* Menu Inferior */}
      <div style={styles.bottomNav}>
        <div style={styles.navItem}>⚡<br />Gerador</div>
        <div style={styles.navItem}>👥<br />Pessoas</div>
        <div style={styles.navItem}>📜<br />Histórico</div>
        <div style={styles.navItem}>🏰<br />Guilda</div>
        <div style={{ ...styles.navItem, color: '#3b82f6', fontWeight: 'bold' }}>⚙️<br />Dev</div>
      </div>
    </div>
  );
}

const styles = {
  body: {
    backgroundColor: '#0d1527',
    color: '#f8fafc',
    minHeight: '100vh',
    paddingBottom: '70px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #1e293b',
  },
  topTitle: { fontSize: '18px', fontWeight: 'bold' },
  resetTimer: { fontSize: '12px', color: '#10b981', display: 'block', marginTop: '4px' },
  btnStatusCheck: {
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '12px',
  },
  btnStatusUncheck: {
    backgroundColor: '#374151',
    color: '#9ca3af',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '12px',
  },
  container: { padding: '12px' },
  card: {
    backgroundColor: '#131d31',
    border: '1px solid #1e2d4a',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
  },
  cardTitle: { fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' },
  tabGroup: {
    display: 'flex',
    backgroundColor: '#090e1a',
    padding: '3px',
    borderRadius: '8px',
  },
  tabBtn: {
    flex: 1,
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    padding: '8px 4px',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '6px',
  },
  tabBtnActive: {
    flex: 1,
    backgroundColor: '#2563eb',
    border: 'none',
    color: '#fff',
    padding: '8px 4px',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '6px',
  },
  sectionSubTitle: { fontSize: '13px', color: '#94a3b8', marginBottom: '10px' },
  timelineItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0d1527',
    border: '1px solid #1e2d4a',
    padding: '10px 12px',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  timeBadge: { fontSize: '11px', color: '#94a3b8', marginTop: '2px' },
  doneBadge: {
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    fontSize: '11px',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  actionGrid: { display: 'flex', gap: '8px', marginBottom: '12px' },
  btnBlue: {
    flex: 1,
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '10px',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '13px',
  },
  btnDarkGray: {
    flex: 1,
    backgroundColor: '#374151',
    color: '#fff',
    border: 'none',
    padding: '10px',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '13px',
  },
  switchBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0d1527',
    border: '1px solid #1e2d4a',
    padding: '10px 12px',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  subText: { fontSize: '11px', color: '#94a3b8' },
  subTextHighlight: { fontSize: '11px', color: '#10b981' },
  toggleInput: { width: '18px', height: '18px', accentColor: '#10b981' },
  rowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: '12px', color: '#94a3b8', display: 'block', marginTop: '12px', marginBottom: '4px' },
  guildaGrid: { display: 'flex', gap: '8px' },
  guildaBtn: {
    flex: 1,
    backgroundColor: '#1e2d4a',
    color: '#94a3b8',
    border: 'none',
    padding: '10px',
    borderRadius: '6px',
    fontWeight: '600',
  },
  guildaBtnActive: {
    flex: 1,
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '10px',
    borderRadius: '6px',
    fontWeight: '600',
  },
  inputActionGrid: { display: 'flex', gap: '8px' },
  input: {
    width: '100%',
    backgroundColor: '#0d1527',
    border: '1px solid #1e2d4a',
    color: '#fff',
    padding: '10px',
    borderRadius: '6px',
    boxSizing: 'border-box',
  },
  btnGreen: {
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    padding: '10px 14px',
    borderRadius: '6px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  warningText: { color: '#f59e0b', fontSize: '11px', display: 'block', marginTop: '6px' },
  diasGrid: { display: 'flex', gap: '4px' },
  diaBtn: {
    flex: 1,
    backgroundColor: '#1e2d4a',
    color: '#94a3b8',
    border: 'none',
    padding: '8px 2px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  diaBtnActive: {
    flex: 1,
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '8px 2px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#090e1a',
    borderTop: '1px solid #1e2d4a',
    display: 'flex',
    justifyContent: 'space-around',
    padding: '8px 0',
  },
  navItem: { textAlign: 'center', fontSize: '11px', color: '#94a3b8' },
};
