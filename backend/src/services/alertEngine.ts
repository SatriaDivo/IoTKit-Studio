import { PrismaClient } from "@prisma/client";
import { io } from "../index";
import { Logger } from "../utils/logger";

const prisma = new PrismaClient();

// Helper to get nested value by dot path (e.g., "sensor.temperature")
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, part) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[part];
  }, obj);
}

// Helper to convert value to number if possible
function tryParseNumber(val: any): { num: number; isNum: boolean } {
  if (typeof val === 'number') return { num: val, isNum: true };
  if (typeof val === 'string') {
    const num = parseFloat(val);
    if (!isNaN(num)) return { num, isNum: true };
  }
  return { num: 0, isNum: false };
}

export class AlertEngine {
  public static async evaluatePayloadRules(projectId: string, payload: any): Promise<void> {
    try {
      // 1. Fetch active rules for the project
      const rules = await prisma.alertRule.findMany({
        where: {
          projectId,
          isActive: true,
        },
      });

      if (!rules || rules.length === 0) return;

      // 2. Normalize payload object (if string, parse it)
      let payloadObj = payload;
      if (typeof payload === "string") {
        try {
          payloadObj = JSON.parse(payload);
        } catch (err) {
          Logger.error(`[AlertEngine] Failed to parse payload string to JSON: ${err}`);
          return;
        }
      }

      // If payload is array, evaluate the first item
      if (Array.isArray(payloadObj) && payloadObj.length > 0) {
        payloadObj = payloadObj[0];
      }

      // 3. Evaluate each rule
      for (const rule of rules) {
        const val = getNestedValue(payloadObj, rule.field);
        if (val === undefined || val === null) continue; // Field not present in this payload, skip rule

        let triggered = false;
        const valStr = String(val);

        const { num: valNum, isNum: valIsNum } = tryParseNumber(val);
        const { num: thresholdNum, isNum: thresholdIsNum } = tryParseNumber(rule.value);

        if (valIsNum && thresholdIsNum) {
          // Numeric comparison
          switch (rule.operator) {
            case ">":
              triggered = valNum > thresholdNum;
              break;
            case "<":
              triggered = valNum < thresholdNum;
              break;
            case ">=":
              triggered = valNum >= thresholdNum;
              break;
            case "<=":
              triggered = valNum <= thresholdNum;
              break;
            case "==":
              triggered = valNum === thresholdNum;
              break;
            case "!=":
              triggered = valNum !== thresholdNum;
              break;
          }
        } else {
          // String / Boolean comparison
          const valLower = valStr.trim().toLowerCase();
          const thresholdLower = rule.value.trim().toLowerCase();

          switch (rule.operator) {
            case "==":
              triggered = valLower === thresholdLower;
              break;
            case "!=":
              triggered = valLower !== thresholdLower;
              break;
            case "contains":
              triggered = valLower.includes(thresholdLower);
              break;
          }
        }

        if (triggered) {
          const logMsg = `Rule '${rule.name}' triggered: field '${rule.field}' (value: ${valStr}) met condition '${rule.operator} ${rule.value}'`;
          Logger.warn(`[AlertEngine] 🚨 Alert Triggered on project ${projectId}: ${logMsg}`);

          // 4. Save to AlertLog
          const alert = await prisma.alertLog.create({
            data: {
              ruleId: rule.id,
              projectId,
              message: logMsg,
              value: valStr,
              severity: rule.severity,
              read: false,
            },
          });

          // 5. Broadcast to project subscribers over Socket.IO
          io.to(`project:${projectId}`).emit("alertTriggered", {
            id: alert.id,
            projectId,
            title: `🚨 Alert: ${rule.name}`,
            message: logMsg,
            severity: rule.severity,
            timestamp: alert.timestamp,
          });
        }
      }
    } catch (error) {
      Logger.error(`[AlertEngine] Error evaluating rules on project ${projectId}:`, error);
    }
  }
}
