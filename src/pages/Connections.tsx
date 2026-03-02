import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NewConnectionModal } from '../components/ui/NewConnectionModal';
import { invoke } from '@tauri-apps/api/core';
import { ask } from '@tauri-apps/plugin-dialog';
import {
  Database,
  Plus,
  Power,
  Edit,
  Trash2,
  Shield,
  AlertCircle,
  Copy,
  Loader2,
  PlugZap,
  Search,
  X,
  LayoutGrid,
  List,
} from 'lucide-react';
import { getDriverColor, getDriverIcon } from '../utils/driverUI';
import { useDatabase } from '../hooks/useDatabase';
import { useDrivers } from '../hooks/useDrivers';
import clsx from 'clsx';
import { isLocalDriver, getCapabilitiesForDriver } from '../utils/driverCapabilities';

interface SavedConnection {
  id: string;
  name: string;
  params: {
    driver: string;
    host?: string;
    database: string | string[];
    port?: number;
    username?: string;
    password?: string;
    ssh_enabled?: boolean;
    ssh_host?: string;
    ssh_port?: number;
    ssh_user?: string;
    ssh_password?: string;
    ssh_key_file?: string;
  };
}

function connectionSubtitle(conn: SavedConnection, capabilities: ReturnType<typeof getCapabilitiesForDriver>): string {
  if (isLocalDriver(capabilities)) {
    const db = conn.params.database;
    return Array.isArray(db) ? db[0] ?? '' : db;
  }
  const db = conn.params.database;
  const dbStr = Array.isArray(db) ? `${db.length} databases` : db;
  return `${conn.params.host ?? 'localhost'}:${conn.params.port ?? ''}  ·  ${dbStr}`;
}

// ── Shared action buttons used by both views ─────────────────────────────────
interface ActionButtonsProps {
  conn: SavedConnection;
  isOpen: boolean;
  isDriverEnabled: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}
const ActionButtons = ({
  isOpen, isDriverEnabled, onConnect, onDisconnect, onEdit, onDuplicate, onDelete,
}: ActionButtonsProps) => {
  const { t } = useTranslation();
  return (
    <>
      {isOpen ? (
        <button
          onClick={e => { e.stopPropagation(); onDisconnect(); }}
          className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
          title={t('connections.disconnect')}
        >
          <Power size={13} />
        </button>
      ) : (
        <button
          onClick={e => { e.stopPropagation(); if (isDriverEnabled) onConnect(); }}
          disabled={!isDriverEnabled}
          className="p-1.5 rounded-lg text-muted hover:text-green-400 hover:bg-green-400/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title={isDriverEnabled ? t('connections.connect') : t('connections.pluginDisabled')}
        >
          <Power size={13} />
        </button>
      )}
      <button
        onClick={e => { e.stopPropagation(); if (isDriverEnabled) onEdit(); }}
        disabled={!isDriverEnabled}
        className="p-1.5 rounded-lg text-muted hover:text-blue-400 hover:bg-blue-400/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title={t('connections.edit')}
      >
        <Edit size={13} />
      </button>
      <button
        onClick={e => { e.stopPropagation(); if (isDriverEnabled) onDuplicate(); }}
        disabled={!isDriverEnabled}
        className="p-1.5 rounded-lg text-muted hover:text-purple-400 hover:bg-purple-400/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title={t('connections.clone')}
      >
        <Copy size={13} />
      </button>
      <button
        onClick={e => { e.stopPropagation(); void onDelete(); }}
        className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
        title={t('connections.delete')}
      >
        <Trash2 size={13} />
      </button>
    </>
  );
};

export const Connections = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { connect, activeConnectionId, disconnect, isConnectionOpen, switchConnection } = useDatabase();
  const { drivers, allDrivers } = useDrivers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<SavedConnection | null>(null);
  const [connections, setConnections] = useState<SavedConnection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadConnections = async () => {
    try {
      const result = await invoke<SavedConnection[]>('get_connections');
      setConnections(result);
    } catch (e) {
      console.error('Failed to load connections:', e);
    }
  };

  useEffect(() => { void loadConnections(); }, []);

  const handleSave = () => {
    loadConnections();
    setIsModalOpen(false);
    setEditingConnection(null);
  };

  const handleConnect = async (conn: SavedConnection) => {
    setError(null);
    if (isConnectionOpen(conn.id)) {
      switchConnection(conn.id);
      navigate('/editor');
      return;
    }
    setConnectingId(conn.id);
    try {
      await connect(conn.id);
      navigate('/editor');
    } catch (e) {
      const msg = typeof e === 'string' ? e : (e as Error).message || String(e);
      setError(`${t('connections.failConnect', { name: conn.name })}\n\nError: ${msg}`);
    } finally {
      setConnectingId(null);
    }
  };

  const handleDisconnect = async (connId: string) => {
    setError(null);
    try {
      await disconnect(connId);
    } catch (e) {
      const msg = typeof e === 'string' ? e : (e as Error).message || String(e);
      setError(`${t('connections.failDisconnect')}\n\nError: ${msg}`);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await ask(t('connections.confirmDelete'), {
      title: t('connections.deleteTitle'),
      kind: 'warning',
    });
    if (confirmed) {
      try {
        if (isConnectionOpen(id)) await disconnect(id);
        await invoke('delete_connection', { id });
        loadConnections();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const openEdit = async (conn: SavedConnection) => {
    if (isConnectionOpen(conn.id)) {
      await disconnect(conn.id);
    }
    setEditingConnection(conn);
    setIsModalOpen(true);
  };

  const handleDuplicate = async (id: string) => {
    try {
      const newConn = await invoke<SavedConnection>('duplicate_connection', { id });
      await loadConnections();
      openEdit(newConn);
    } catch (e) {
      console.error(e);
      setError(t('connections.failDuplicate'));
    }
  };

  const filtered = search.trim()
    ? connections.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.params.driver.toLowerCase().includes(search.toLowerCase())
      )
    : connections;

  const openCount = connections.filter(c => isConnectionOpen(c.id)).length;

  // ── Status badge ────────────────────────────────────────────────────────────
  const StatusBadge = ({ conn }: { conn: SavedConnection }) => {
    const isActive = activeConnectionId === conn.id;
    const isOpen = isConnectionOpen(conn.id);
    const isConnecting = connectingId === conn.id;
    if (isConnecting) return <Loader2 size={13} className="animate-spin text-blue-400" />;
    if (isActive) return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/12 border border-green-400/25 px-1.5 py-0.5 rounded-full whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        {t('connections.active')}
      </span>
    );
    if (isOpen) return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400/80 bg-green-400/8 border border-green-400/20 px-1.5 py-0.5 rounded-full whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400/70" />
        {t('connections.open')}
      </span>
    );
    return null;
  };

  // ── Card border style ────────────────────────────────────────────────────────
  const cardClass = (conn: SavedConnection) => {
    const isActive = activeConnectionId === conn.id;
    const isOpen = isConnectionOpen(conn.id);
    if (isActive) return 'border-blue-500/40 bg-blue-500/5 ring-1 ring-blue-500/20 shadow-lg shadow-blue-500/8';
    if (isOpen) return 'border-green-500/35 bg-green-500/4 ring-1 ring-green-500/15 shadow-md shadow-green-500/6';
    return 'border-strong bg-elevated hover:border-blue-400/30 hover:bg-surface-primary hover:shadow-md hover:shadow-black/10';
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-base">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-between px-8 pt-7 pb-6 border-b border-default bg-elevated shrink-0 overflow-hidden">
        {/* Decorative gradients */}
        <div className="absolute top-0 right-0 w-72 h-full bg-gradient-to-bl from-blue-600/10 via-blue-600/3 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-indigo-600/6 to-transparent pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-1.5 mb-2">
            <Database size={12} className="text-blue-400" />
            <span className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.15em]">
              Database Manager
            </span>
          </div>
          <h1 className="text-xl font-bold text-primary tracking-tight">{t('connections.title')}</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-muted">
              {connections.length === 0
                ? t('connections.noConnections')
                : t('connections.connectionCount', { count: connections.length })}
            </span>
            {openCount > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-default" />
                <span className="flex items-center gap-1.5 text-xs text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  {openCount} active
                </span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => { setEditingConnection(null); setIsModalOpen(true); }}
          className="relative flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-px"
        >
          <Plus size={15} />
          {t('connections.addConnection')}
        </button>
      </div>

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-6 mt-4 p-3.5 bg-red-900/20 border border-red-900/40 rounded-xl flex items-start gap-3 text-red-400 shrink-0">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span className="text-sm whitespace-pre-wrap flex-1 leading-relaxed">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400/50 hover:text-red-400 transition-colors shrink-0 mt-0.5">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {connections.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-2xl bg-elevated border border-default flex items-center justify-center shadow-sm">
                <Database size={32} className="text-muted" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg">
                <Plus size={14} className="text-white" />
              </div>
            </div>
            <p className="text-base font-bold text-primary mb-1.5">{t('connections.noConnections')}</p>
            <p className="text-sm text-muted mb-6 max-w-xs leading-relaxed">
              {t('connections.noConnectionsHint')}
            </p>
            <button
              onClick={() => { setEditingConnection(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 hover:-translate-y-px"
            >
              <Plus size={14} />
              {t('connections.createFirst')}
            </button>
          </div>
        ) : (
          <>
            {/* ── Toolbar: search + view toggle ─────────────────────────── */}
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('connections.searchPlaceholder')}
                  className="w-full pl-10 pr-9 py-2.5 bg-elevated border border-strong rounded-xl text-sm text-primary placeholder:text-muted focus:border-blue-500/70 focus:outline-none transition-colors"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-0.5 bg-elevated border border-strong rounded-xl p-1 shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={clsx(
                    'p-1.5 rounded-lg transition-all duration-150',
                    viewMode === 'grid'
                      ? 'bg-blue-500/15 text-blue-400 shadow-sm'
                      : 'text-muted hover:text-secondary hover:bg-surface-secondary',
                  )}
                  title={t('connections.gridView')}
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={clsx(
                    'p-1.5 rounded-lg transition-all duration-150',
                    viewMode === 'list'
                      ? 'bg-blue-500/15 text-blue-400 shadow-sm'
                      : 'text-muted hover:text-secondary hover:bg-surface-secondary',
                  )}
                  title={t('connections.listView')}
                >
                  <List size={15} />
                </button>
              </div>
            </div>

            {/* ── Grid view ─────────────────────────────────────────────── */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map(conn => {
                  const isOpen = isConnectionOpen(conn.id);
                  const isConnecting = connectingId === conn.id;
                  const capabilities = getCapabilitiesForDriver(conn.params.driver, allDrivers);
                  const driverManifest = allDrivers.find(d => d.id === conn.params.driver);
                  const isDriverEnabled = drivers.some(d => d.id === conn.params.driver);
                  const subtitle = connectionSubtitle(conn, capabilities);
                  const driverColor = getDriverColor(driverManifest);

                  return (
                    <div
                      key={conn.id}
                      onDoubleClick={() => isDriverEnabled && !isConnecting && handleConnect(conn)}
                      className={clsx(
                        'group relative flex flex-col rounded-2xl border transition-all duration-150 cursor-pointer select-none overflow-hidden',
                        !isDriverEnabled && 'opacity-60 cursor-not-allowed',
                        isConnecting && 'pointer-events-none',
                        cardClass(conn),
                      )}
                    >
                      {/* Card body */}
                      <div className="flex items-start gap-3.5 px-4 pt-4 pb-3">
                        {/* Driver icon */}
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md"
                          style={{ backgroundColor: driverColor }}
                        >
                          {getDriverIcon(driverManifest, 20)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="font-bold text-sm text-primary leading-snug truncate">{conn.name}</span>
                            <div className="shrink-0">
                              <StatusBadge conn={conn} />
                            </div>
                          </div>

                          {/* Driver + SSH badges */}
                          <div className="flex items-center gap-1.5 flex-wrap mb-2">
                            <span className="text-[10px] font-semibold text-secondary bg-surface-secondary border border-strong/40 px-1.5 py-0.5 rounded-md capitalize">
                              {conn.params.driver}
                            </span>
                            {conn.params.ssh_enabled && (
                              <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-md">
                                <Shield size={8} /> SSH
                              </span>
                            )}
                            {!isDriverEnabled && (
                              <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-md">
                                <PlugZap size={8} /> {t('connections.pluginDisabled')}
                              </span>
                            )}
                          </div>

                          {/* Subtitle */}
                          <p className="text-[11px] text-muted truncate">{subtitle}</p>
                        </div>
                      </div>

                      {/* Action bar */}
                      <div className="flex items-center justify-end gap-0.5 px-3 py-2 border-t border-default/50 mt-auto opacity-40 group-hover:opacity-100 transition-opacity duration-150">
                        <ActionButtons
                          conn={conn}
                          isOpen={isOpen}
                          isDriverEnabled={isDriverEnabled}
                          onConnect={() => handleConnect(conn)}
                          onDisconnect={() => handleDisconnect(conn.id)}
                          onEdit={() => void openEdit(conn)}
                          onDuplicate={() => handleDuplicate(conn.id)}
                          onDelete={() => handleDelete(conn.id)}
                        />
                      </div>
                    </div>
                  );
                })}

                {filtered.length === 0 && search && (
                  <div className="col-span-full text-center py-12 text-sm text-muted">
                    {t('connections.noSearchResults', { query: search })}
                  </div>
                )}
              </div>
            ) : (
              /* ── List view ──────────────────────────────────────────────── */
              <div className="flex flex-col gap-1.5">
                {filtered.map(conn => {
                  const isOpen = isConnectionOpen(conn.id);
                  const isConnecting = connectingId === conn.id;
                  const capabilities = getCapabilitiesForDriver(conn.params.driver, allDrivers);
                  const driverManifest = allDrivers.find(d => d.id === conn.params.driver);
                  const isDriverEnabled = drivers.some(d => d.id === conn.params.driver);
                  const subtitle = connectionSubtitle(conn, capabilities);
                  const driverColor = getDriverColor(driverManifest);

                  return (
                    <div
                      key={conn.id}
                      onDoubleClick={() => isDriverEnabled && !isConnecting && handleConnect(conn)}
                      className={clsx(
                        'group flex items-center gap-3 px-3.5 py-2 rounded-xl border transition-all duration-150 cursor-pointer select-none',
                        !isDriverEnabled && 'opacity-60 cursor-not-allowed',
                        isConnecting && 'pointer-events-none',
                        cardClass(conn),
                      )}
                    >
                      {/* Driver icon */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"
                        style={{ backgroundColor: driverColor }}
                      >
                        {getDriverIcon(driverManifest, 14)}
                      </div>

                      {/* Name + subtitle stacked */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-primary truncate leading-snug">
                          {conn.name}
                        </p>
                        <p className="text-[11px] text-muted truncate leading-snug mt-0.5">
                          {subtitle}
                        </p>
                      </div>

                      {/* Badges — visible on hover or when status is set */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusBadge conn={conn} />
                        <span className="text-[10px] font-semibold text-secondary bg-surface-secondary border border-strong/40 px-1.5 py-0.5 rounded-md capitalize">
                          {conn.params.driver}
                        </span>
                        {conn.params.ssh_enabled && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-md">
                            <Shield size={8} /> SSH
                          </span>
                        )}
                        {!isDriverEnabled && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-md">
                            <PlugZap size={8} /> {t('connections.pluginDisabled')}
                          </span>
                        )}
                      </div>

                      {/* Actions — always visible */}
                      <div className="flex items-center gap-0.5 shrink-0 pl-1 border-l border-default/50">
                        <ActionButtons
                          conn={conn}
                          isOpen={isOpen}
                          isDriverEnabled={isDriverEnabled}
                          onConnect={() => handleConnect(conn)}
                          onDisconnect={() => handleDisconnect(conn.id)}
                          onEdit={() => void openEdit(conn)}
                          onDuplicate={() => handleDuplicate(conn.id)}
                          onDelete={() => handleDelete(conn.id)}
                        />
                      </div>
                    </div>
                  );
                })}

                {filtered.length === 0 && search && (
                  <div className="text-center py-12 text-sm text-muted">
                    {t('connections.noSearchResults', { query: search })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <NewConnectionModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingConnection(null); }}
        onSave={handleSave}
        initialConnection={editingConnection}
      />
    </div>
  );
};
