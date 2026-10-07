import { useCallback, useState } from "react";

/**
 * Toast host bersama. Baik menu Ownership Digital maupun GAP CO memakai instance
 * yang sama supaya hanya ada satu tumpukan notifikasi di pojok kanan atas.
 * Pesan yang dilewatkan tetap berasal dari jalur kode yang sama seperti sebelumnya.
 */

let toastSeq = 0;

export function useToasts() {
  const [items, setItems] = useState([]);

  const dismiss = useCallback((id) => {
    setItems((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type, message) => {
    const id = ++toastSeq;
    setItems((current) => [...current, { id, type, message }]);
    // Legacy auto-hid the notification after 7s.
    setTimeout(() => {
      setItems((current) => current.filter((t) => t.id !== id));
    }, 7000);
  }, []);

  return { items, push, dismiss };
}
