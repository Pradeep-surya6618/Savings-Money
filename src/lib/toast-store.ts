"use client";

import { create } from "zustand";

export type ToastTone = "success" | "error" | "info";
export type Toast = { id: number; tone: ToastTone; message: string };

type ToastState = {
  toasts: Toast[];
  add: (tone: ToastTone, message: string) => void;
  dismiss: (id: number) => void;
};

let counter = 0;
const DURATION = 3500;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (tone, message) => {
    counter += 1;
    const id = counter;
    set((s) => ({ toasts: [...s.toasts, { id, tone, message }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), DURATION);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Fire a toast from anywhere (event handlers, action-result flows). */
export const toast = {
  success: (message: string) => useToastStore.getState().add("success", message),
  error: (message: string) => useToastStore.getState().add("error", message),
  info: (message: string) => useToastStore.getState().add("info", message),
};
