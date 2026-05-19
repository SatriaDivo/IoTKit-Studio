export class MappingEngine {
  /**
   * Navigates deep nested objects using a dot-separated path (e.g. "data.sensors.0.val")
   */
  public static getValueByPath(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }

  /**
   * Transforms an external webhook payload using the defined mappings
   */
  public static transformPayload(payload: any, mappingsJson: string | null | undefined): any {
    if (!payload || !mappingsJson) return payload;
    try {
      const mappings = JSON.parse(mappingsJson);
      if (!Array.isArray(mappings) || mappings.length === 0) return payload;

      const result: any = {};
      for (const rule of mappings) {
        const { externalPath, internalKey, dataType } = rule;
        if (!externalPath || !internalKey) continue;

        const rawValue = this.getValueByPath(payload, externalPath);
        if (rawValue === undefined || rawValue === null) continue;

        // Cast based on dataType
        let castedValue: any = rawValue;
        if (dataType === 'number') {
          castedValue = Number(rawValue);
          if (isNaN(castedValue)) castedValue = rawValue; // fallback
        } else if (dataType === 'boolean') {
          castedValue = rawValue === 'true' || rawValue === true || rawValue === 1 || rawValue === '1';
        } else if (dataType === 'string') {
          castedValue = typeof rawValue === 'object' ? JSON.stringify(rawValue) : String(rawValue);
        }

        result[internalKey] = castedValue;
      }

      // If mapping resulted in an empty object, default back to original payload
      return Object.keys(result).length > 0 ? result : payload;
    } catch (e) {
      console.error("[MappingEngine] Error transforming webhook payload:", e);
      return payload;
    }
  }
}
