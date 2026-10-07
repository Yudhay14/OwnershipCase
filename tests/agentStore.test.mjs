import { test } from "node:test";
import assert from "node:assert/strict";

import { agentMaster as BASE_AGENT_MASTER, supportMaster as BASE_SUPPORT_MASTER } from "../src/data/agents.js";
import {
  AGENT_LISTS,
  addAgent,
  agentKey,
  getEffectiveAgentMaster,
  getEffectiveSupportMaster,
  getMasterAgentCount,
  getRemovedAgents,
  getSupportAgentCount,
  isAddedAgent,
  loadOverrides,
  removeAgent,
  resetOverrides,
  restoreAgent,
} from "../src/utils/agentStore.js";
import { findRegularAgent, findSupportAgent } from "../src/utils/agents.js";

/**
 * Daftar dasar tidak boleh berubah; admin hanya menambah/menghapus lewat
 * lapisan override. Test ini memastikan daftar efektif sama persis dengan
 * daftar dasar ketika belum ada perubahan admin, dan perubahan bisa dibalik.
 */

const STORAGE_KEY = "od.agentOverrides.v1";

test("daftar efektif identik dengan daftar dasar saat belum ada perubahan admin", () => {
  resetOverrides();

  const regular = getEffectiveAgentMaster();
  const support = getEffectiveSupportMaster();

  assert.equal(regular.length, BASE_AGENT_MASTER.length);
  assert.equal(support.length, BASE_SUPPORT_MASTER.length);
  assert.deepEqual(
    regular.map((a) => a.name),
    BASE_AGENT_MASTER.map((a) => a.name)
  );
  assert.deepEqual(
    support.map((a) => a.name),
    BASE_SUPPORT_MASTER.map((a) => a.name)
  );

  // Ukuran master list yang dipakai header.
  assert.equal(getMasterAgentCount(), 234);
  assert.equal(getSupportAgentCount(), 27);
  assert.equal(getRemovedAgents(AGENT_LISTS.REGULAR).length, 0);
  assert.equal(getRemovedAgents(AGENT_LISTS.SUPPORT).length, 0);
});

test("agentKey memakai LDAP bila ada, kalau tidak nama", () => {
  assert.equal(agentKey({ name: "Yulia Prihatini", ldap: "VADS.YULI1524" }), "ldap:vadsyuli1524");
  assert.equal(agentKey({ name: "Tanpa Ldap", ldap: "" }), "name:tanpaldap");
});

test("menambah Agent Utama langsung dikenali lookup dan bisa dihapus", () => {
  resetOverrides();
  const entry = { name: "Budi Santoso", ldap: "VADS.BUDIS" };

  assert.equal(findRegularAgent("VADS.BUDIS"), null);

  assert.equal(addAgent(AGENT_LISTS.REGULAR, entry).ok, true);
  assert.equal(getMasterAgentCount(), 235);
  assert.equal(getEffectiveAgentMaster().at(-1).name, "Budi Santoso");
  assert.equal(isAddedAgent(AGENT_LISTS.REGULAR, entry), true);

  // Dikenali lewat LDAP maupun nama.
  assert.equal(findRegularAgent("VADS.BUDIS").name, "Budi Santoso");
  assert.equal(findRegularAgent("budi santoso").ldap, "VADS.BUDIS");

  removeAgent(AGENT_LISTS.REGULAR, agentKey(entry));
  assert.equal(getMasterAgentCount(), 234);
  assert.equal(findRegularAgent("VADS.BUDIS"), null);
  // Agent tambahan tidak masuk daftar "dihapus".
  assert.equal(getRemovedAgents(AGENT_LISTS.REGULAR).length, 0);
});

test("validasi tambah agent menolak input kosong dan duplikat", () => {
  resetOverrides();

  assert.equal(addAgent(AGENT_LISTS.REGULAR, { name: "   ", ldap: "VADS.X" }).ok, false);

  // Duplikat nama (tanpa peduli huruf besar/kecil).
  const dupName = addAgent(AGENT_LISTS.REGULAR, { name: "yulia prihatini", ldap: "" });
  assert.equal(dupName.ok, false);
  assert.match(dupName.message, /sudah ada/);

  // Duplikat LDAP.
  const dupLdap = addAgent(AGENT_LISTS.REGULAR, { name: "Nama Baru", ldap: "vads.yuli1524" });
  assert.equal(dupLdap.ok, false);

  // Duplikat di dalam daftar Support.
  const dupSupport = addAgent(AGENT_LISTS.SUPPORT, { name: "Eka Arsyad Handayani", ldap: "" });
  assert.equal(dupSupport.ok, false);

  assert.equal(getMasterAgentCount(), 234);
  assert.equal(getSupportAgentCount(), 27);
});

test("menghapus Agent Utama menyembunyikannya dan bisa dipulihkan", () => {
  resetOverrides();
  const key = agentKey({ name: "Yulia Prihatini", ldap: "VADS.YULI1524" });

  assert.equal(findRegularAgent("VADS.YULI1524").name, "Yulia Prihatini");

  removeAgent(AGENT_LISTS.REGULAR, key);
  assert.equal(getMasterAgentCount(), 233);
  assert.equal(findRegularAgent("VADS.YULI1524"), null);
  assert.equal(findRegularAgent("Yulia Prihatini"), null);
  assert.deepEqual(
    getRemovedAgents(AGENT_LISTS.REGULAR).map((a) => a.name),
    ["Yulia Prihatini"]
  );

  restoreAgent(AGENT_LISTS.REGULAR, key);
  assert.equal(getMasterAgentCount(), 234);
  assert.equal(findRegularAgent("VADS.YULI1524").name, "Yulia Prihatini");
  assert.equal(getRemovedAgents(AGENT_LISTS.REGULAR).length, 0);
});

test("hapus di Agent Utama tidak ikut menghapus entri di Support", () => {
  resetOverrides();

  // "Ninung Kumalasari" memang ada di kedua daftar (VADS.NINUNGK).
  const key = agentKey({ name: "Ninung Kumalasari", ldap: "VADS.NINUNGK" });
  removeAgent(AGENT_LISTS.REGULAR, key);

  assert.equal(
    getEffectiveAgentMaster().some((a) => a.name === "Ninung Kumalasari"),
    false
  );
  assert.equal(
    getEffectiveSupportMaster().some((a) => a.name === "Ninung Kumalasari"),
    true
  );
  assert.equal(getRemovedAgents(AGENT_LISTS.REGULAR).length, 1);
  assert.equal(getRemovedAgents(AGENT_LISTS.SUPPORT).length, 0);
  assert.equal(findSupportAgent("VADS.NINUNGK").name, "Ninung Kumalasari");
});

test("menambah agent Support membuat creator Support baru ikut dikenali", () => {
  resetOverrides();
  const entry = { name: "Support Tambahan", ldap: "VADS.STAMBAHAN" };

  assert.equal(findSupportAgent("VADS.STAMBAHAN"), null);
  // Belum ada di Support, dan bukan Agent Utama.
  assert.equal(findRegularAgent("VADS.STAMBAHAN"), null);

  assert.equal(addAgent(AGENT_LISTS.SUPPORT, entry).ok, true);
  assert.equal(getSupportAgentCount(), 28);
  assert.equal(findSupportAgent("VADS.STAMBAHAN").name, "Support Tambahan");
  assert.equal(findSupportAgent("support tambahan").ldap, "VADS.STAMBAHAN");

  resetOverrides();
  assert.equal(findSupportAgent("VADS.STAMBAHAN"), null);
});

test("override disimpan ke storage dan dimuat kembali", () => {
  resetOverrides();

  const data = new Map();
  globalThis.localStorage = {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };

  try {
    addAgent(AGENT_LISTS.SUPPORT, { name: "Support Tersimpan", ldap: "VADS.STSIMPAN" });

    const saved = data.get(STORAGE_KEY);
    assert.ok(saved, "override harus ditulis ke localStorage");
    assert.match(saved, /Support Tersimpan/);

    // Simulasi buka aplikasi lagi: baca ulang dari storage.
    resetOverrides();
    data.set(STORAGE_KEY, saved);
    loadOverrides();

    assert.equal(getSupportAgentCount(), 28);
    assert.equal(findSupportAgent("VADS.STSIMPAN").name, "Support Tersimpan");
  } finally {
    resetOverrides();
    delete globalThis.localStorage;
  }
});
