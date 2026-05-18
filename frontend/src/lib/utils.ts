import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

export function parseHostInput(input: string) {
  const match = input.match(/^(https?|wss?|mqtts?):\/\/([^:\/\s]+)(:\d+)?(\/.*)?$/i);
  if (match) {
    const protocol = match[1].toUpperCase();
    const host = match[2];
    const port = match[3] ? match[3].replace(":", "") : "";
    let path = match[4] || "";

    let defaultPort = port;
    if (!defaultPort) {
      if (protocol === "HTTP" || protocol === "WS") defaultPort = "80";
      else if (protocol === "HTTPS" || protocol === "WSS") defaultPort = "443";
      else if (protocol === "MQTT") defaultPort = "1883";
      else if (protocol === "MQTTS") defaultPort = "8883";
    }

    return {
      protocol,
      host,
      port: defaultPort,
      path
    };
  }
  return null;
}
