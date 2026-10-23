import { bootstrapAdmin } from '../../app/bootstrap.js?v=20261023-13';
import { adminFunction, adminFunctionForm } from '../../services/admin-api.js?v=20261023-12';
import { confirmModal } from '../../ui/modal.js';

const BACKUP_KEY = 'pena_outra_mais_last_backup';
const backupButton = document.querySelector('#createBackupButton');
const lastBackup = document.querySelector('#lastBackup');
const backupMessage = document.querySelector('#backupMessage');
const automaticBackupStatus = document.querySelector('#automaticBackupStatus');
const automaticBackupDate = document.querySelector('#automaticBackupDate');
const BACKUP_RUNS_URL = 'https://api.github.com/repos/DTV79/PenaOutraMais/actions/workflows/pena-backup.yml/runs?per_page=30';


const statutesFile = document.querySelector('#statutesFile');
const statutesFileName = document.querySelector('#statutesFileName');
const uploadButton = document.querySelector('#uploadStatutesButton');
const deleteButton = document.querySelector('#deleteStatutesButton');
const openButton = document.querySelector('#openStatutesButton');
const statutesStatus = document.querySelector('#statutesStatus');
const statutesUpdated = document.querySelector('#statutesUpdated');
const statutesMessage = document.querySelector('#statutesMessage');

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function setMessage(element, message = '', type = 'ok') {
  element.hidden = !message;
  element.className = `tools-message ${type}`;
  element.textContent = message;
}

function downloadJson(data) {
  const stamp = new Date()
    .toISOString()
    .replace(/:/g, '-')
    .replace('T', '_')
    .slice(0, 19);

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pena-outra-mais-backup-${stamp}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function createBackup() {
  backupButton.disabled = true;
  backupButton.textContent = 'Creando copia…';
  setMessage(backupMessage);

  try {
    const data = await adminFunction('admin-utilidades', { action: 'backup' });
    if (!data?.backup) throw new Error('No se recibió la copia de seguridad.');

    downloadJson(data.backup);

    const now = new Date().toISOString();
    localStorage.setItem(BACKUP_KEY, now);
    lastBackup.textContent = formatDateTime(now);
    setMessage(backupMessage, 'Copia creada y descargada correctamente.');
  } catch (error) {
    setMessage(backupMessage, error?.message || 'No se pudo crear la copia.', 'error');
  } finally {
    backupButton.disabled = false;
    backupButton.textContent = 'Crear y descargar copia';
  }
}

async function loadAutomaticBackupStatus() {
  if (!automaticBackupStatus || !automaticBackupDate) return;

  try {
    const response = await fetch(BACKUP_RUNS_URL, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('No se puede consultar GitHub');
    const { workflow_runs: runs } = await response.json();
    if (!Array.isArray(runs)) throw new Error('Respuesta no válida de GitHub');

    const latest = runs[0];
    const latestSuccess = runs.find((run) => run.status === 'completed' && run.conclusion === 'success');
    automaticBackupDate.textContent = latestSuccess
      ? formatDateTime(latestSuccess.updated_at || latestSuccess.created_at)
      : 'Todavía ninguna';

    if (!latest) {
      automaticBackupStatus.textContent = 'Pendiente de primera copia';
    } else if (latest.status !== 'completed') {
      automaticBackupStatus.textContent = 'Copia en curso';
    } else if (latest.conclusion === 'success') {
      automaticBackupStatus.textContent = 'Correcta';
    } else {
      automaticBackupStatus.textContent = 'Revisar ejecución';
    }
  } catch {
    automaticBackupStatus.textContent = 'Consultar GitHub';
    automaticBackupDate.textContent = '—';
  }
}

function renderStatutes(status) {
  const exists = !!status?.exists;
  statutesStatus.textContent = exists ? 'PDF publicado' : 'Sin PDF';
  statutesStatus.classList.toggle('ok', exists);

  const extra = [];
  if (status?.updated_at) extra.push(`Actualizado: ${formatDateTime(status.updated_at)}`);
  if (status?.size) extra.push(formatBytes(status.size));
  statutesUpdated.textContent = extra.join(' · ');

  openButton.hidden = !exists || !status?.url;
  deleteButton.hidden = !exists;

  if (status?.url) openButton.href = status.url;
}

async function loadStatutesStatus() {
  try {
    const data = await adminFunction('admin-utilidades', { action: 'statutes_status' });
    renderStatutes(data?.statutes);
  } catch (error) {
    statutesStatus.textContent = 'No se pudo comprobar';
    statutesUpdated.textContent = '';
    setMessage(statutesMessage, error?.message || 'No se pudo consultar el PDF.', 'error');
  }
}

async function uploadStatutes() {
  const file = statutesFile.files?.[0];
  if (!file) return;

  uploadButton.disabled = true;
  uploadButton.textContent = 'Subiendo…';
  setMessage(statutesMessage);

  try {
    const form = new FormData();
    form.append('action', 'upload_statutes');
    form.append('file', file);

    const data = await adminFunctionForm('admin-utilidades', form);
    renderStatutes(data?.statutes);
    setMessage(statutesMessage, 'Estatutos publicados correctamente.');

    statutesFile.value = '';
    statutesFileName.textContent = 'Ningún archivo seleccionado';
    uploadButton.disabled = true;
  } catch (error) {
    setMessage(statutesMessage, error?.message || 'No se pudo subir el PDF.', 'error');
    uploadButton.disabled = false;
  } finally {
    uploadButton.textContent = 'Subir estatutos';
  }
}

async function deleteStatutes() {
  const confirmed = await confirmModal({
    title: 'Eliminar estatutos',
    message: '¿Quieres retirar el PDF de estatutos publicado?',
    confirmText: 'Eliminar'
  });

  if (!confirmed) return;

  deleteButton.disabled = true;
  setMessage(statutesMessage);

  try {
    const data = await adminFunction('admin-utilidades', { action: 'delete_statutes' });
    renderStatutes(data?.statutes);
    setMessage(statutesMessage, 'El PDF de estatutos se ha retirado.');
  } catch (error) {
    setMessage(statutesMessage, error?.message || 'No se pudo eliminar el PDF.', 'error');
  } finally {
    deleteButton.disabled = false;
  }
}

async function init() {
  if (!await bootstrapAdmin()) return;

  const storedBackup = localStorage.getItem(BACKUP_KEY);
  lastBackup.textContent = storedBackup ? formatDateTime(storedBackup) : '—';

  backupButton?.addEventListener('click', createBackup);
  await loadAutomaticBackupStatus();

  statutesFile?.addEventListener('change', () => {
    const file = statutesFile.files?.[0];
    statutesFileName.textContent = file
      ? `${file.name} · ${formatBytes(file.size)}`
      : 'Ningún archivo seleccionado';
    uploadButton.disabled = !file;
    setMessage(statutesMessage);
  });

  uploadButton?.addEventListener('click', uploadStatutes);
  deleteButton?.addEventListener('click', deleteStatutes);

  await loadStatutesStatus();
}

init();
