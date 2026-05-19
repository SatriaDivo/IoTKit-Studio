package rules

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"strings"

	"iotkit-studio-go/internal/database"
	"iotkit-studio-go/internal/websocket"
)

// Helper function to extract a nested value from a map by dot-separated path (e.g. "sensor.temperature")
func getNestedValue(data map[string]interface{}, path string) (interface{}, bool) {
	parts := strings.Split(path, ".")
	var current interface{} = data
	for _, part := range parts {
		m, ok := current.(map[string]interface{})
		if !ok {
			return nil, false
		}
		val, exists := m[part]
		if !exists {
			return nil, false
		}
		current = val
	}
	return current, true
}

// EvaluatePayloadRules parses a JSON payload and checks it against all active alert rules for the project.
func EvaluatePayloadRules(projectID string, payloadJSON string) {
	// 1. Fetch active alert rules for this project
	var rules []database.AlertRule
	if err := database.DB.Where("\"projectId\" = ? AND \"isActive\" = ?", projectID, true).Find(&rules).Error; err != nil {
		log.Printf("[RuleEngine] Error fetching rules for project %s: %v", projectID, err)
		return
	}

	if len(rules) == 0 {
		return
	}

	// 2. Parse the payload JSON
	var payloadMap map[string]interface{}
	if err := json.Unmarshal([]byte(payloadJSON), &payloadMap); err != nil {
		// Try parsing if it's wrapped or an array (just grab first element if it's an array)
		var arrayMap []map[string]interface{}
		if errArr := json.Unmarshal([]byte(payloadJSON), &arrayMap); errArr == nil && len(arrayMap) > 0 {
			payloadMap = arrayMap[0]
		} else {
			log.Printf("[RuleEngine] Failed to parse payload JSON for rule evaluation: %v", err)
			return
		}
	}

	// 3. Evaluate each rule
	for _, rule := range rules {
		val, exists := getNestedValue(payloadMap, rule.Field)
		if !exists {
			continue // Field not present in this payload, skip rule
		}

		triggered := false
		triggeredValStr := fmt.Sprintf("%v", val)

		// Try parsing as float for numerical comparisons
		valNum, valIsNum := parseAsFloat(val)
		thresholdNum, thresholdIsNum := parseAsFloat(rule.Value)

		if valIsNum && thresholdIsNum {
			// Numeric comparison
			switch rule.Operator {
			case ">":
				triggered = valNum > thresholdNum
			case "<":
				triggered = valNum < thresholdNum
			case ">=":
				triggered = valNum >= thresholdNum
			case "<=":
				triggered = valNum <= thresholdNum
			case "==":
				triggered = valNum == thresholdNum
			case "!=":
				triggered = valNum != thresholdNum
			}
		} else {
			// String / Boolean comparison
			valStr := strings.ToLower(strings.TrimSpace(fmt.Sprintf("%v", val)))
			ruleStr := strings.ToLower(strings.TrimSpace(rule.Value))

			switch rule.Operator {
			case "==":
				triggered = valStr == ruleStr
			case "!=":
				triggered = valStr != ruleStr
			case "contains":
				triggered = strings.Contains(valStr, ruleStr)
			}
		}

		if triggered {
			// 4. Anomaly detected! Create AlertLog
			logMsg := fmt.Sprintf("Rule '%s' triggered: field '%s' (value: %s) met condition '%s %s'",
				rule.Name, rule.Field, triggeredValStr, rule.Operator, rule.Value)
			
			log.Printf("[RuleEngine] 🚨 Alert Triggered on project %s: %s", projectID, logMsg)

			alert := database.AlertLog{
				RuleID:    &rule.ID,
				ProjectID: projectID,
				Message:   logMsg,
				Value:     triggeredValStr,
				Severity:  rule.Severity,
				Read:      false,
			}

			if err := database.DB.Create(&alert).Error; err != nil {
				log.Printf("[RuleEngine] Error creating AlertLog: %v", err)
				continue
			}

			// 5. Broadcast alertTriggered event over WebSocket
			websocket.HubInstance.BroadcastToProject(projectID, "alertTriggered", map[string]interface{}{
				"id":        alert.ID,
				"projectId": projectID,
				"title":     fmt.Sprintf("🚨 Alert: %s", rule.Name),
				"message":   logMsg,
				"severity":  rule.Severity,
				"timestamp": alert.Timestamp,
			})
		}
	}
}

// Helper to parse interface{} as float64 if possible
func parseAsFloat(val interface{}) (float64, bool) {
	switch v := val.(type) {
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	case string:
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f, true
		}
	}
	return 0, false
}
