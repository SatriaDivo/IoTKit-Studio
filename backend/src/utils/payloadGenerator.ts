import { PayloadField } from "../types";

export class PayloadGenerator {
  private incrementalCounters: Map<string, number> = new Map();

  generatePayload(fields: PayloadField[]): any {
    const payload: any = {};

    for (const field of fields) {
      payload[field.name] = this.generateFieldValue(field);
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

    switch (field.mode) {
      case "static":
        return field.value ?? 0;
      case "random":
        return Math.random() * (max - min) + min;
      case "incremental":
        const key = field.name;
        const current = this.incrementalCounters.get(key) || min;
        const next = current >= max ? min : current + 1;
        this.incrementalCounters.set(key, next);
        return current;
      case "timestamp":
        return Date.now();
      default:
        return 0;
    }
  }

  private generateBoolean(field: PayloadField): boolean {
    switch (field.mode) {
      case "static":
        return field.value ?? false;
      case "random":
        return Math.random() > 0.5;
      default:
        return false;
    }
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
