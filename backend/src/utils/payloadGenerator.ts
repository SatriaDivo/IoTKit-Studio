import { PayloadField } from "../types";

export class PayloadGenerator {
  private incrementalCounters: Map<string, number> = new Map();
  private chaosMode: boolean;
  private chaosProbability: number;
  private chaosFields: string[];

  constructor(chaosMode = false, chaosProbability = 5, chaosFields: string[] = []) {
    this.chaosMode = chaosMode;
    this.chaosProbability = chaosProbability;
    this.chaosFields = chaosFields;
  }

  generatePayload(fields: PayloadField[]): any {
    const payload: any = {};

    for (const field of fields) {
      const value = this.generateFieldValue(field);
      
      // Un-flatten dot notation for nested objects (e.g., "location.latitude")
      const keys = field.name.split('.');
      let current = payload;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key] || typeof current[key] !== 'object') {
          current[key] = {};
        }
        current = current[key];
      }
      
      current[keys[keys.length - 1]] = value;
    }

    return payload;
  }

  private generateFieldValue(field: PayloadField): any {
    switch (field.type) {
      case "string":
        return this.generateString(field);
      case "number":
        return this.generateNumber(field);
      case "boolean":
        return this.generateBoolean(field);
      case "object":
        return this.generateObject(field);
      case "array":
        return this.generateArray(field);
      default:
        return null;
    }
  }

  private generateString(field: PayloadField): string {
    switch (field.mode) {
      case "static":
        return field.value || "";
      case "timestamp":
        return new Date().toISOString();
      case "random":
        return `value_${Math.random().toString(36).substring(7)}`;
      case "incremental":
        const key = field.name;
        const current = this.incrementalCounters.get(key) || 0;
        this.incrementalCounters.set(key, current + 1);
        return `${field.value || "item"}_${current}`;
      default:
        return "";
    }
  }

  private generateNumber(field: PayloadField): number {
    const min = field.min ?? 0;
    const max = field.max ?? 100;
    let result = 0;

    switch (field.mode) {
      case "static":
        result = field.value ?? 0;
        break;
      case "random":
        result = Math.random() * (max - min) + min;
        break;
      case "incremental":
        const key = field.name;
        const current = this.incrementalCounters.get(key) || min;
        const next = current >= max ? min : current + 1;
        this.incrementalCounters.set(key, next);
        result = current;
        break;
      case "timestamp":
        result = Date.now();
        break;
      default:
        result = 0;
    }

    // Chaos Injector: Anomaly Spike (only for random mode fields)
    const isChaosField = this.chaosFields.length === 0 || this.chaosFields.includes(field.name);
    if (this.chaosMode && isChaosField && field.mode === "random" && Math.random() * 100 < this.chaosProbability) {
      const spikeFactor = Math.random() > 0.5 ? 10 : -10; 
      result = (max > 0 ? max : 100) * spikeFactor;
    }

    return result;
  }

  private generateBoolean(field: PayloadField): boolean {
    let result = false;
    switch (field.mode) {
      case "static":
        result = field.value ?? false;
        break;
      case "random":
        result = Math.random() > 0.5;
        break;
      default:
        result = false;
    }

    // Chaos Injector: Boolean Inversion (only for random mode fields)
    const isChaosField = this.chaosFields.length === 0 || this.chaosFields.includes(field.name);
    if (this.chaosMode && isChaosField && field.mode === "random" && Math.random() * 100 < this.chaosProbability) {
      result = !result;
    }

    return result;
  }

  private generateObject(field: PayloadField): any {
    if (!field.children || field.children.length === 0) {
      return {};
    }

    const obj: any = {};
    for (const child of field.children) {
      obj[child.name] = this.generateFieldValue(child);
    }
    return obj;
  }

  private generateArray(field: PayloadField): any[] {
    const length = field.value ?? 3;
    const arr: any[] = [];

    if (field.children && field.children.length > 0) {
      for (let i = 0; i < length; i++) {
        const item: any = {};
        for (const child of field.children) {
          item[child.name] = this.generateFieldValue(child);
        }
        arr.push(item);
      }
    } else {
      for (let i = 0; i < length; i++) {
        arr.push(i);
      }
    }

    return arr;
  }

  reset() {
    this.incrementalCounters.clear();
  }
}
