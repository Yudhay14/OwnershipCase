import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  KeyRound,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { ADMIN_PASSWORD, ADMIN_USERNAME } from "../config/admin.js";
import { AGENT_LISTS, agentKey, getRemovedAgents, isAddedAgent } from "../utils/agentStore.js";
import { useAgentStore } from "../hooks/useAgentStore.js";

/**
 * Gerbang admin + pengelola daftar agent.
 *
 * Alur: klik logo di pojok -> login -> panel untuk menambah/menghapus Agent
 * Utama dan menambah agent Support. Daftar dasar di src/data/agents.js tidak
 * pernah diubah; perubahan disimpan sebagai override di localStorage sehingga
 * bisa dibalik lewat "Kembalikan daftar awal".
 */

const INPUT =
  "focus-ring w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-[12.5px] text-ink transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-400";

const LABEL = "mb-1 block text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-500";

const PRIMARY_BTN =
  "focus-ring inline-flex items-center justify-center gap-1.5 rounded-md bg-brand-600 px-3.5 py-2 text-[11.5px] font-bold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-px hover:bg-brand-700 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:hover:translate-y-0";

export default function AdminDialog({ open, onClose }) {
  const store = useAgentStore();

  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [tab, setTab] = useState(AGENT_LISTS.REGULAR);
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [newLdap, setNewLdap] = useState("");
  const [formMessage, setFormMessage] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  // Reset seluruh state saat dialog ditutup supaya login diminta lagi.
  useEffect(() => {
    if (open) return;
    setAuthed(false);
    setUsername("");
    setPassword("");
    setLoginError("");
    setTab(AGENT_LISTS.REGULAR);
    setQuery("");
    setNewName("");
    setNewLdap("");
    setFormMessage(null);
    setPendingDelete(null);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const lists = {
    [AGENT_LISTS.REGULAR]: { label: "Agent Utama", list: store.agentMaster },
    [AGENT_LISTS.SUPPORT]: { label: "Support", list: store.supportMaster },
  };
  const active = lists[tab];
  const removedAgents = getRemovedAgents(tab);

  const keyword = query.trim().toLowerCase();
  const filtered = keyword
    ? active.list.filter(
        (agent) =>
          agent.name.toLowerCase().includes(keyword) ||
          String(agent.ldap || "").toLowerCase().includes(keyword)
      )
    : active.list;

  function submitLogin(event) {
    event.preventDefault();
    if (username.trim() === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setAuthed(true);
      setLoginError("");
      return;
    }
    setLoginError("Username atau password salah.");
  }

  function switchTab(next) {
    setTab(next);
    setQuery("");
    setNewName("");
    setNewLdap("");
    setFormMessage(null);
    setPendingDelete(null);
  }

  function submitAdd(event) {
    event.preventDefault();
    const result =
      tab === AGENT_LISTS.REGULAR
        ? store.addRegular({ name: newName, ldap: newLdap })
        : store.addSupport({ name: newName, ldap: newLdap });

    if (result.ok) {
      setFormMessage({ tone: "success", text: `Ditambahkan ke ${active.label}.` });
      setNewName("");
      setNewLdap("");
    } else {
      setFormMessage({ tone: "danger", text: result.message });
    }
  }

  function handleDelete(key) {
    if (pendingDelete !== key) {
      setPendingDelete(key);
      return;
    }
    if (tab === AGENT_LISTS.REGULAR) store.removeRegular(key);
    else store.removeSupport(key);
    setPendingDelete(null);
    setFormMessage(null);
  }

  function handleRestore(key) {
    if (tab === AGENT_LISTS.REGULAR) store.restoreRegular(key);
    else store.restoreSupport(key);
  }

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/45"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-title"
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`relative my-auto flex max-h-[90vh] w-full flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_18px_50px_rgba(16,24,40,0.22)] ${
              authed ? "max-w-3xl" : "max-w-sm"
            }`}
          >
            {authed ? (
              <>
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-600 text-white">
                      <ShieldCheck size={15} />
                    </span>
                    <div>
                      <h2 id="admin-title" className="text-[13px] font-bold text-slate-800">
                        Pengaturan Daftar Agent
                      </h2>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Daftar dasar tidak diubah - perubahan disimpan di browser ini dan bisa
                        dibalik.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="focus-ring -mr-1 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Tutup pengaturan agent"
                  >
                    <X size={16} />
                  </button>
                </header>

                {/* Tabs */}
                <div className="flex items-center gap-1 border-b border-slate-200 px-4 pt-2.5">
                  {[AGENT_LISTS.REGULAR, AGENT_LISTS.SUPPORT].map((id) => {
                    const isActive = tab === id;
                    const count = id === AGENT_LISTS.REGULAR ? store.masterCount : store.supportCount;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => switchTab(id)}
                        className={`focus-ring -mb-px flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-[11.5px] font-bold uppercase tracking-[0.05em] transition-colors ${
                          isActive
                            ? "border-brand-600 text-brand-700"
                            : "border-transparent text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        <Users size={12.5} />
                        {lists[id].label}
                        <span
                          id={id === AGENT_LISTS.REGULAR ? "admin-regular-count" : "admin-support-count"}
                          className="tnum rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-bold text-slate-500"
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="sd-scroll flex-1 overflow-y-auto px-4 py-3.5">
                  {/* Tambah agent */}
                  <form onSubmit={submitAdd} className="rounded-md border border-line bg-surface p-3">
                    <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-500">
                      <UserPlus size={12} />
                      Tambah {active.label}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <div>
                        <label htmlFor="admin-add-name" className={LABEL}>
                          Nama agent
                        </label>
                        <input
                          id="admin-add-name"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="Contoh: Budi Santoso"
                          className={INPUT}
                        />
                      </div>
                      <div>
                        <label htmlFor="admin-add-ldap" className={LABEL}>
                          LDAP (opsional)
                        </label>
                        <input
                          id="admin-add-ldap"
                          value={newLdap}
                          onChange={(e) => setNewLdap(e.target.value)}
                          placeholder="Contoh: VADS.BUDIS"
                          className={INPUT}
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          id="admin-add-submit"
                          type="submit"
                          disabled={!newName.trim()}
                          className={`${PRIMARY_BTN} w-full sm:w-auto`}
                        >
                          <UserPlus size={13} />
                          Tambah
                        </button>
                      </div>
                    </div>
                    {formMessage ? (
                      <p
                        role="status"
                        className={`mt-2 text-[11px] font-medium ${
                          formMessage.tone === "success" ? "text-success-600" : "text-red-600"
                        }`}
                      >
                        {formMessage.text}
                      </p>
                    ) : null}
                  </form>

                  {/* Cari */}
                  <div className="relative mt-3.5">
                    <Search
                      size={13}
                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={`Cari di ${active.label}...`}
                      aria-label={`Cari di ${active.label}`}
                      className={`${INPUT} pl-7`}
                    />
                  </div>

                  {/* Daftar */}
                  <p className="mt-3 text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400">
                    {filtered.length} dari {active.list.length} agent
                  </p>
                  <ul id="admin-list" className="mt-1.5 divide-y divide-line rounded-md border border-line">
                    {filtered.slice(0, 400).map((agent) => {
                      const key = agentKey(agent);
                      const added = isAddedAgent(tab, agent);
                      const confirming = pendingDelete === key;
                      return (
                        <li
                          key={key}
                          className="flex items-center gap-2 bg-white px-2.5 py-1.5 transition-colors hover:bg-slate-50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12.5px] font-medium text-ink" title={agent.name}>
                              {agent.name}
                            </p>
                            {agent.ldap ? (
                              <p className="tnum truncate text-[10.5px] text-slate-400">{agent.ldap}</p>
                            ) : null}
                          </div>

                          {added ? (
                            <span className="shrink-0 rounded border border-steel-100 bg-steel-50 px-1.5 py-0.5 text-[10px] font-semibold text-steel-700">
                              Ditambahkan
                            </span>
                          ) : null}

                          {confirming ? (
                            <span className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDelete(key)}
                                className="focus-ring rounded bg-red-600 px-2 py-1 text-[10px] font-bold uppercase text-white transition-colors hover:bg-red-700"
                              >
                                Hapus
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDelete(null)}
                                className="focus-ring rounded border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase text-slate-500 transition-colors hover:bg-slate-100"
                              >
                                Batal
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDelete(key)}
                              className="focus-ring shrink-0 rounded p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600"
                              aria-label={`Hapus ${agent.name}`}
                              title="Hapus dari daftar"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </li>
                      );
                    })}
                    {filtered.length === 0 ? (
                      <li className="bg-white px-2.5 py-4 text-center text-[11.5px] text-slate-400">
                        Tidak ada agent yang cocok.
                      </li>
                    ) : null}
                  </ul>

                  {/* Yang dihapus */}
                  {removedAgents.length > 0 ? (
                    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-3">
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-amber-700">
                        Dihapus dari {active.label} ({removedAgents.length})
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {removedAgents.map((agent) => {
                          const key = agentKey(agent);
                          return (
                            <li key={key} className="flex items-center gap-2">
                              <span className="min-w-0 flex-1 truncate text-[11.5px] text-slate-600">
                                {agent.name}
                                {agent.ldap ? (
                                  <span className="tnum ml-1.5 text-[10.5px] text-slate-400">
                                    {agent.ldap}
                                  </span>
                                ) : null}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRestore(key)}
                                className="focus-ring inline-flex shrink-0 items-center gap-1 rounded border border-amber-300 bg-white px-2 py-1 text-[10px] font-bold uppercase text-amber-700 transition-colors hover:bg-amber-100"
                              >
                                <Check size={11} />
                                Pulihkan
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                </div>

                <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
                  <button
                    id="admin-reset"
                    type="button"
                    onClick={() => {
                      store.reset();
                      setPendingDelete(null);
                      setFormMessage({ tone: "success", text: "Daftar dikembalikan ke kondisi awal." });
                    }}
                    className="focus-ring inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.05em] text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    <RotateCcw size={12} />
                    Kembalikan daftar awal
                  </button>
                  <button type="button" onClick={onClose} className={PRIMARY_BTN}>
                    Selesai
                  </button>
                </footer>
              </>
            ) : (
              <>
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3">
                  <div>
                    <h2 id="admin-title" className="text-[13px] font-bold text-slate-800">
                      Login Admin
                    </h2>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Masuk untuk mengelola daftar Agent Utama dan Support.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="focus-ring -mr-1 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Tutup login admin"
                  >
                    <X size={16} />
                  </button>
                </header>

                <form onSubmit={submitLogin} className="px-4 py-4">
                  <div>
                    <label htmlFor="admin-user" className={LABEL}>
                      Username
                    </label>
                    <input
                      id="admin-user"
                      autoFocus
                      autoComplete="off"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={INPUT}
                    />
                  </div>
                  <div className="mt-3">
                    <label htmlFor="admin-pass" className={LABEL}>
                      Password
                    </label>
                    <input
                      id="admin-pass"
                      type="password"
                      autoComplete="off"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={INPUT}
                    />
                  </div>

                  {loginError ? (
                    <p
                      id="admin-login-error"
                      role="alert"
                      className="mt-2.5 rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-600"
                    >
                      {loginError}
                    </p>
                  ) : null}

                  <button type="submit" className={`${PRIMARY_BTN} mt-4 w-full`}>
                    <KeyRound size={13} />
                    Masuk
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
