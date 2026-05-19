"use client";

import { useEffect, useState, useRef } from "react";
import { usePopupStore } from "@/store/popupStore";
import { Trash2, FileEdit, HelpCircle, Check } from "lucide-react";

export default function PopupModal() {
  const { isOpen, options, submit, cancel } = usePopupStore();
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && options) {
      setInputValue(options.defaultValue || "");
      if (options.type === "prompt") {
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
          }
        }, 50);
      }
    }
  }, [isOpen, options]);

  if (!isOpen || !options) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      submit(options.type === "prompt" ? inputValue : undefined);
    } else if (e.key === "Escape") {
      cancel();
    }
  };

  // Determine theme based on title or message content
  const isDelete = 
    options.title?.toLowerCase().includes("delete") || 
    options.title?.toLowerCase().includes("clear") || 
    options.message.toLowerCase().includes("delete") ||
    options.message.toLowerCase().includes("clear");

  const isPrompt = options.type === "prompt";

  let theme = {
    icon: <HelpCircle className="h-5 w-5 text-slate-500" />,
    iconBg: "bg-slate-50 border border-slate-100",
    subtitle: "Please confirm your choice",
    actionBtnClass: "bg-[#6A89A7] hover:bg-[#5A7997] text-white focus:ring-[#6A89A7]/50",
    actionIcon: null as React.ReactNode
  };

  if (isDelete) {
    theme = {
      icon: <Trash2 className="h-5 w-5 text-red-500" />,
      iconBg: "bg-red-50 border border-red-100",
      subtitle: "This action cannot be undone",
      actionBtnClass: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500/50",
      actionIcon: <Trash2 className="h-4 w-4 mr-2" />
    };
  } else if (isPrompt) {
    theme = {
      icon: <FileEdit className="h-5 w-5 text-blue-500" />,
      iconBg: "bg-blue-50 border border-blue-100",
      subtitle: "Enter the required input details below",
      actionBtnClass: "bg-[#6A89A7] hover:bg-[#5A7997] text-white focus:ring-[#6A89A7]/50",
      actionIcon: <Check className="h-4 w-4 mr-2" />
    };
  }

  // Format message to highlight quotes or specific names bolded (like "Agrisense CC 03")
  const renderFormattedMessage = (msg: string) => {
    const parts = msg.split(/(".*?")/);
    return parts.map((part, index) => {
      if (part.startsWith('"') && part.endsWith('"')) {
        return <strong key={index} className="font-semibold text-slate-800">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#384959]/40 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={cancel}
      />

      {/* Modal Box */}
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
        onKeyDown={handleKeyDown}
      >
        {/* Header Block */}
        <div className="flex items-start gap-4 p-6 pb-4">
          <div className={`p-3 rounded-full flex-shrink-0 flex items-center justify-center ${theme.iconBg}`}>
            {theme.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-slate-900 leading-tight">
              {options.title}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium tracking-wide">
              {theme.subtitle}
            </p>
          </div>
        </div>

        {/* Divider line */}
        <div className="border-b border-slate-100 w-full" />

        {/* Content Block */}
        <div className="p-6 pt-5">
          <p className="text-sm text-slate-600 leading-relaxed font-normal mb-5">
            {renderFormattedMessage(options.message)}
          </p>

          {/* Input Field (for prompts) */}
          {options.type === "prompt" && (
            <div className="mb-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6A89A7]/40 focus:border-[#6A89A7] bg-slate-50/30 text-slate-800"
                placeholder="Enter value..."
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 px-6 pb-6 pt-2">
          <button
            type="button"
            onClick={cancel}
            className="px-4 py-2 text-sm font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-800 active:bg-slate-100 transition-all focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => submit(options.type === "prompt" ? inputValue : undefined)}
            className={`px-5 py-2 text-sm font-semibold rounded-lg flex items-center justify-center transition-all focus:outline-none focus:ring-2 ${theme.actionBtnClass}`}
          >
            {theme.actionIcon}
            {options.title || "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
