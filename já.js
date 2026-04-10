// Substitua o manipulador do banner de telemetria por:
const telemDialog = document.getElementById('telemetryDialog');
if (!localStorage.getItem('robô_telemetry_seen')) setTimeout(() => telemDialog.showModal(), 1500);

document.getElementById('telemetryForm').addEventListener('submit', e => {
  const choice = e.submitter.value;
  localStorage.setItem('robô_telemetry', choice === 'accept' ? 'true' : 'false');
  localStorage.setItem('robô_telemetry_seen', 'true');
  telemDialog.close();
  utils.toast(choice === 'accept' ? '📊 Telemetria ativada' : '📊 Telemetria desativada', 'info');
});

// Config Dialog
document.getElementById('openConfig').addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('configDialog').showModal();
});

document.getElementById('configForm').addEventListener('submit', e => {
  e.preventDefault();
  App.saveConfig();
  document.getElementById('configDialog').close();
});
