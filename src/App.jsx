import { useState } from "react";
import AppMenu from "./components/AppMenu.jsx";
import LeftPanel from "./components/LeftPanel.jsx";
import WorkspacePage from "./pages/WorkspacePage.jsx";
import GapCoPanel from "./components/GapCoPanel.jsx";
import GapCoPage from "./pages/GapCoPage.jsx";
import HelpDialog from "./components/HelpDialog.jsx";
import GapCoHelpDialog from "./components/GapCoHelpDialog.jsx";
import ToastNotification from "./components/ToastNotification.jsx";
import { useCheckerApp } from "./hooks/useCheckerApp.js";
import { useGapCoApp } from "./hooks/useGapCoApp.js";
import { useToasts } from "./hooks/useToasts.js";

/**
 * Shell aplikasi.
 *
 * Menu rail kiri: Ownership Digital / GAP CO. Menu yang aktif menentukan control
 * panel + workspace yang dirender, jadi tiap menu memakai pola yang sama:
 * control panel kiri (304px) + workspace kanan.
 *
 * Desktop : tinggi terkunci 100vh sehingga tabel hasil punya scroll internal.
 * Mobile  : menu, control panel, lalu workspace ditumpuk satu kolom.
 */
export default function App() {
  const toasts = useToasts();
  const checker = useCheckerApp({ pushToast: toasts.push });
  const gapco = useGapCoApp({ pushToast: toasts.push });

  const [menu, setMenu] = useState("ownership");
  const [helpOpen, setHelpOpen] = useState(false);
  const [gapHelpOpen, setGapHelpOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-canvas lg:h-screen lg:flex-row lg:overflow-hidden">
      <AppMenu active={menu} onChange={setMenu} />

      {menu === "ownership" ? (
        <>
          <LeftPanel app={checker} onOpenHelp={() => setHelpOpen(true)} />
          <WorkspacePage app={checker} />
        </>
      ) : (
        <>
          <GapCoPanel app={gapco} onOpenHelp={() => setGapHelpOpen(true)} />
          <GapCoPage app={gapco} />
        </>
      )}

      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <GapCoHelpDialog open={gapHelpOpen} onClose={() => setGapHelpOpen(false)} />
      <ToastNotification toasts={toasts.items} onDismiss={toasts.dismiss} />
    </div>
  );
}
