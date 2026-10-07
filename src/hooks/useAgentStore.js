import { useMemo, useSyncExternalStore } from "react";
import {
  AGENT_LISTS,
  addAgent,
  getEffectiveAgentMaster,
  getEffectiveSupportMaster,
  getVersion,
  removeAgent,
  resetOverrides,
  restoreAgent,
  subscribe,
} from "../utils/agentStore.js";

/**
 * Binding React untuk agentStore: daftar agent efektif + aksi admin.
 * Re-render otomatis setiap kali daftar berubah.
 */
export function useAgentStore() {
  const version = useSyncExternalStore(subscribe, getVersion, getVersion);

  const agentMaster = useMemo(() => getEffectiveAgentMaster(), [version]);
  const supportMaster = useMemo(() => getEffectiveSupportMaster(), [version]);

  const store = useMemo(
    () => ({
      agentMaster,
      supportMaster,
      masterCount: agentMaster.length,
      supportCount: supportMaster.length,
      addRegular: (input) => addAgent(AGENT_LISTS.REGULAR, input),
      addSupport: (input) => addAgent(AGENT_LISTS.SUPPORT, input),
      removeRegular: (key) => removeAgent(AGENT_LISTS.REGULAR, key),
      removeSupport: (key) => removeAgent(AGENT_LISTS.SUPPORT, key),
      restoreRegular: (key) => restoreAgent(AGENT_LISTS.REGULAR, key),
      restoreSupport: (key) => restoreAgent(AGENT_LISTS.SUPPORT, key),
      reset: resetOverrides,
    }),
    [agentMaster, supportMaster]
  );

  return store;
}
