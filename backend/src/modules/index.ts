/**
 * Module Registry
 * Export all module services
 */

export { heraService, HeraService } from "./hera/service";
export { droneService, DroneService } from "./drone/service";
export { carbonService, CarbonService } from "./carbon/service";

// Module types
export type ModuleName = "hera" | "drone" | "carbon" | "custom";

// Module service interface
export interface ModuleService {
  moduleName: string;
  defaultPayloadKind: string;
  allowedPayloadKinds: Set<string>;
  generate(payloadKind?: string, options?: any): Promise<any>;
  validate(payload: any, payloadKind?: string): boolean;
  getInfo(): any;
}
