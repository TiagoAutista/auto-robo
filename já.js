// 🎯 Estado Global
const AppState = {
  mode: 'DEV', // DEV | PROD
  tasks: {
    GOI_CHECK: { status: 'idle', element: null },
    WFM_CPF: { status: 'idle', element: null },
    GPS_OPEN: { status: 'idle', element: null },
    FULL: { status: 'idle', element: null }
  }
};

// 🔌 Socket.io (se aplicável)
const socket = io ? io() : null;

// 🚀 Inicialização
document.addEventListener('DOMContentLoaded', () => {
  initModeSelector();
  initTaskCards();
  initMasks();
  initKeyboardShortcuts();
  updateGlobalStatus();
  
  log('🤖 Auto Robô v2.0 inicializado!', 'system');
});

// 🎛️ Seleção de Modo Global
function initModeSelector() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mode = e.currentTarget.dataset.mode;
      setGlobalMode(mode);
    });
  });
}

function setGlobalMode(mode) {
  AppState.mode = mode;
  
  // Atualiza UI
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.mode-btn[data-mode="${mode}"]`).classList.add('active');
  
  // Atualiza indicadores
  document.getElementById('modeIndicator').textContent = mode;
  document.getElementById('globalStatusText').innerHTML = 
    `Modo: <strong>${mode}</strong> • ${mode === 'DEV' ? 'Mock Local' : 'Rede Corporativa'}`;
  
  // Atualiza status dot
  const dot = document.getElementById('globalStatusDot');
  dot.className = `status-dot ${mode === 'PROD' ? 'ready' : 'idle'}`;
  
  log(`🔧 Modo alterado para: <strong>${mode}</strong>`, 'system');
  
  // Notifica backend se houver socket
  if (socket) socket.emit('mode:change', { mode });
}

// 🧩 Inicialização dos Cards de Tarefa
function initTaskCards() {
  Object.keys(AppState.tasks).forEach(taskKey => {
    const card = document.querySelector(`.task-card[data-task="${taskKey}"]`);
    if (card) {
      AppState.tasks[taskKey].element = card;
      
      // Máscara específica por task
      if (taskKey === 'WFM_CPF' || taskKey === 'FULL') {
        const input = card.querySelector('input[id*="Cpf"]');
        if (input) input.addEventListener('input', formatCPF);
      }
    }
  });
}

// 🎭 Máscaras de Input
function initMasks() {
  // CPF: 000.000.000-00
  document.querySelectorAll('input[id*="Cpf"]').forEach(input => {
    input.addEventListener('input', formatCPF);
  });
  
  // Ordem: remove caracteres especiais, mantém números e letras
  document.querySelectorAll('input[id*="Order"]').forEach(input => {
    input.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, '');
    });
  });
}

function formatCPF(e) {
  let value = e.target.value.replace(/\D/g, '').slice(0, 11);
  value = value.replace(/(\d{3})(\d)/, '$1.$2');
  value = value.replace(/(\d{3})(\d)/, '$1.$2');
  value = value.replace(/(\d{3})(\d{1,2})/, '$1-$2');
  e.target.value = value;
}

// ▶️ Executar Task
async function runTask(taskKey) {
  const task = AppState.tasks[taskKey];
  if (!task || task.status === 'running') return;
  
  // Coleta parâmetros
  const params = collectTaskParams(taskKey);
  
  // Validação básica
  if (!validateTaskParams(taskKey, params)) return;
  
  // Atualiza UI para "executando"
  setTaskStatus(taskKey, 'running');
  log(`🚀 Iniciando <strong>${getTaskLabel(taskKey)}</strong>...`, taskKey);
  
  try {
    if (AppState.mode === 'DEV') {
      // Mock para desenvolvimento
      await mockExecution(taskKey, params);
    } else {
      // Chamada real para backend
      await executeTaskAPI(taskKey, params);
    }
    
    setTaskStatus(taskKey, 'success');
    log(`✅ <strong>${getTaskLabel(taskKey)}</strong> concluído com sucesso!`, taskKey);
    
  } catch (error) {
    setTaskStatus(taskKey, 'error');
    log(`❌ Erro em <strong>${getTaskLabel(taskKey)}</strong>: ${error.message}`, taskKey);
    console.error(error);
  }
}

// 📥 Coletar parâmetros da task
function collectTaskParams(taskKey) {
  const params = {};
  
  switch(taskKey) {
    case 'GOI_CHECK':
      params.order = document.getElementById('goiOrder')?.value.trim();
      break;
    case 'WFM_CPF':
      params.cpf = document.getElementById('wfmCpf')?.value.replace(/\D/g, '');
      break;
    case 'GPS_OPEN':
      params.param = document.getElementById('gpsParam')?.value.trim();
      break;
    case 'FULL':
      params.cpf = document.getElementById('fullCpf')?.value.replace(/\D/g, '');
      params.order = document.getElementById('fullOrder')?.value.trim();
      break;
  }
  
  return params;
}

// ✅ Validação de parâmetros
function validateTaskParams(taskKey, params) {
  switch(taskKey) {
    case 'GOI_CHECK':
      if (!params.order) {
        alert('⚠️ Informe o número da ordem para consultar no GOI.');
        document.getElementById('goiOrder')?.focus();
        return false;
      }
      break;
    case 'WFM_CPF':
      if (!params.cpf || params.cpf.length !== 11) {
        alert('⚠️ Informe um CPF válido (11 dígitos).');
        document.getElementById('wfmCpf')?.focus();
        return false;
      }
      break;
    case 'FULL':
      if (!params.cpf || params.cpf.length !== 11) {
        alert('⚠️ Informe um CPF válido para automação completa.');
        document.getElementById('fullCpf')?.focus();
        return false;
      }
      if (!params.order) {
        alert('⚠️ Informe o número da ordem para automação completa.');
        document.getElementById('fullOrder')?.focus();
        return false;
      }
      break;
  }
  return true;
}

// 🔄 Atualizar status visual da task
function setTaskStatus(taskKey, status) {
  const task = AppState.tasks[taskKey];
  if (!task) return;
  
  task.status = status;
  
  const statusEl = document.getElementById(`${taskKey.toLowerCase().replace('_','')}Status`);
  const btnRun = task.element?.querySelector('.btn-run');
  
  if (statusEl) {
    statusEl.className = `task-status ${status}`;
    statusEl.innerHTML = {
      idle: '<i class="fas fa-circle"></i> Pronto',
      running: '<i class="fas fa-spinner fa-spin"></i> Executando...',
      success: '<i class="fas fa-check-circle"></i> Concluído',
      error: '<i class="fas fa-exclamation-circle"></i> Erro'
    }[status];
  }
  
  if (btnRun) {
    btnRun.disabled = (status === 'running');
  }
}

// 🧹 Limpar task
function clearTask(taskKey) {
  const inputs = document.querySelector(`.task-card[data-task="${taskKey}"]`)?.querySelectorAll('input');
  inputs?.forEach(input => input.value = '');
  setTaskStatus(taskKey, 'idle');
  log(`🧹 Campos de <strong>${getTaskLabel(taskKey)}</strong> limpos.`, taskKey);
}

// 📝 Sistema de Logs
function log(message, taskKey = 'system') {
  const logsEl = document.getElementById('logs');
  if (!logsEl) return;
  
  const entry = document.createElement('div');
  entry.className = `log-entry ${taskKey !== 'system' ? '' : 'system'}`;
  entry.setAttribute('data-task', taskKey);
  entry.innerHTML = `
    <small style="opacity:0.7">[${new Date().toLocaleTimeString()}]</small>
    ${taskKey !== 'system' ? `<strong>[${getTaskLabel(taskKey)}]</strong> ` : ''}
    ${message}
  `;
  
  logsEl.prepend(entry);
  
  // Limita quantidade de logs
  if (logsEl.children.length > 100) {
    logsEl.removeChild(logsEl.lastChild);
  }
}

function filterLogs() {
  const filter = document.getElementById('logFilter').value;
  document.querySelectorAll('.log-entry').forEach(entry => {
    const task = entry.dataset.task;
    entry.classList.toggle('hidden', filter !== 'all' && task !== filter && task !== 'system');
  });
}

function clearLogs() {
  document.getElementById('logs').innerHTML = '';
  log('🗑️ Logs limpos pelo usuário.', 'system');
}

// 🎹 Atalhos de Teclado
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl + 1/2/3 para focar inputs
    if (e.ctrlKey && ['1','2','3'].includes(e.key)) {
      e.preventDefault();
      const targets = {
        '1': 'goiOrder',
        '2': 'wfmCpf', 
        '3': 'gpsParam'
      };
      document.getElementById(targets[e.key])?.focus();
    }
    
    // Ctrl + Enter para executar task com foco
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      const activeInput = document.activeElement;
      const taskCard = activeInput?.closest('.task-card');
      if (taskCard) {
        const taskKey = taskCard.dataset.task;
        runTask(taskKey);
      }
    }
  });
}

// 🔍 Diagnóstico
async function runDiagnostics() {
  const resultEl = document.getElementById('diagnosticResult');
  resultEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
  
  const checks = [
    { name: 'Conexão com Backend', test: () => fetch('/api/health').then(r => r.ok) },
    { name: 'Socket.IO', test: () => Promise.resolve(!!socket?.connected) },
    { name: 'Permissões de Clipboard', test: () => Promise.resolve(navigator.clipboard !== undefined) }
  ];
  
  let results = [];
  
  for (const check of checks) {
    try {
      const ok = await check.test();
      results.push(`<span style="color:${ok ? 'green' : 'red'}">
        <i class="fas fa-${ok ? 'check' : 'times'}-circle"></i> ${check.name}
      </span>`);
    } catch {
      results.push(`<span style="color:red"><i class="fas fa-times-circle"></i> ${check.name}</span>`);
    }
  }
  
  resultEl.innerHTML = results.join(' • ');
  log('🔍 Diagnóstico executado.', 'system');
}

// 🎭 Mock para DEV
function mockExecution(taskKey, params) {
  return new Promise(resolve => {
    const delay = 1500 + Math.random() * 2000;
    setTimeout(() => {
      // Simula 90% de sucesso
      if (Math.random() > 0.1) {
        resolve({ success: true, data: { mock: true, task: taskKey, params } });
      } else {
        throw new Error('Erro simulado (10% de chance em DEV)');
      }
    }, delay);
  });
}

// 🌐 Chamada API real (PROD)
async function executeTaskAPI(taskKey, params) {
  const response = await fetch('/api/task/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: taskKey, params, mode: AppState.mode })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.message || 'Falha na execução');
  }
  
  return await response.json();
}

// 🏷️ Helpers
function getTaskLabel(key) {
  return {
    'GOI_CHECK': 'GOI',
    'WFM_CPF': 'WFM',
    'GPS_OPEN': 'GPS',
    'FULL': 'FULL'
  }[key] || key;
}

function updateGlobalStatus() {
  // Atualiza status global baseado nas tasks
  const allIdle = Object.values(AppState.tasks).every(t => t.status === 'idle');
  const anyRunning = Object.values(AppState.tasks).some(t => t.status === 'running');
  
  const dot = document.getElementById('globalStatusDot');
  if (anyRunning) {
    dot.className = 'status-dot running';
  } else if (allIdle) {
    dot.className = `status-dot ${AppState.mode === 'PROD' ? 'ready' : 'idle'}`;
  }
}

// 📡 Socket Events (se aplicável)
if (socket) {
  socket.on('task:progress', (data) => {
    log(`⏳ ${data.message}`, data.task);
  });
  
  socket.on('task:complete', (data) => {
    setTaskStatus(data.task, 'success');
    log(`✅ ${data.message}`, data.task);
  });
  
  socket.on('task:error', (data) => {
    setTaskStatus(data.task, 'error');
    log(`❌ ${data.message}`, data.task);
  });
}
