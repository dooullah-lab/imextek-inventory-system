// src/hooks/useOfflineQueue.js
// Saves failed sales locally when offline and syncs them when back online.
// Uses localStorage to persist the queue across page refreshes.

import { useState, useEffect, useCallback } from "react";
import api from "../api/client";

const QUEUE_KEY = "imextek_offline_queue";

function loadQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

export default function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState(loadQueue);
  const [syncing, setSyncing] = useState(false);

  // Track online/offline status
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Persist queue to localStorage whenever it changes
  useEffect(() => {
    saveQueue(queue);
  }, [queue]);

  // Auto-sync when back online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      syncQueue();
    }
  }, [isOnline]);

  const addToQueue = useCallback((items, groupId, cart, total) => {
    const entry = {
      offlineId: "offline_" + Date.now(),
      groupId,
      items,
      cart,
      total,
      timestamp: new Date().toISOString(),
    };
    setQueue((prev) => {
      const updated = [...prev, entry];
      saveQueue(updated);
      return updated;
    });
    return entry;
  }, []);

  const syncQueue = useCallback(async () => {
    const current = loadQueue();
    if (current.length === 0 || syncing) return;
    setSyncing(true);
    try {
      const allItems = current.flatMap((entry) =>
        entry.items.map((item) => ({
          ...item,
          offlineId: entry.offlineId,
          groupId: entry.groupId,
          timestamp: entry.timestamp,
        }))
      );
      const res = await api.post("/transactions/sync", { items: allItems });
      if (res.data.synced > 0) {
        setQueue([]);
        saveQueue([]);
      }
      return res.data;
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  return { isOnline, queue, addToQueue, syncQueue, syncing, pendingCount: queue.length };
}
