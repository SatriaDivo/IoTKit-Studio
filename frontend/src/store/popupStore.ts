import { create } from "zustand";

interface PopupOptions {
  title?: string;
  message: string;
  type: "confirm" | "prompt";
  defaultValue?: string;
  resolve?: (value: any) => void;
}

interface PopupState {
  isOpen: boolean;
  options: PopupOptions | null;
  confirm: (message: string, title?: string) => Promise<boolean>;
  prompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>;
  submit: (value?: any) => void;
  cancel: () => void;
}

export const usePopupStore = create<PopupState>((set, get) => ({
  isOpen: false,
  options: null,
  confirm: (message, title = "Confirm Action") => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        options: {
          title,
          message,
          type: "confirm",
          resolve,
        },
      });
    });
  },
  prompt: (message, defaultValue = "", title = "Input Required") => {
    return new Promise<string | null>((resolve) => {
      set({
        isOpen: true,
        options: {
          title,
          message,
          type: "prompt",
          defaultValue,
          resolve,
        },
      });
    });
  },
  submit: (value) => {
    const { options } = get();
    if (options && options.resolve) {
      if (options.type === "confirm") {
        options.resolve(true);
      } else {
        options.resolve(value);
      }
    }
    set({ isOpen: false, options: null });
  },
  cancel: () => {
    const { options } = get();
    if (options && options.resolve) {
      if (options.type === "confirm") {
        options.resolve(false);
      } else {
        options.resolve(null);
      }
    }
    set({ isOpen: false, options: null });
  },
}));
