package services

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

// GetValueByPath navigates deep nested maps/slices using dot-notation.
func GetValueByPath(obj interface{}, path string) (interface{}, bool) {
	if obj == nil || path == "" {
		return nil, false
	}
	parts := strings.Split(path, ".")
	var current interface{} = obj

	for _, part := range parts {
		if current == nil {
			return nil, false
		}

		switch typedObj := current.(type) {
		case map[string]interface{}:
			val, exists := typedObj[part]
			if !exists {
				return nil, false
			}
			current = val
		case []interface{}:
			// Convert part to integer index
			idx, err := strconv.Atoi(part)
			if err != nil || idx < 0 || idx >= len(typedObj) {
				return nil, false
			}
			current = typedObj[idx]
		default:
			return nil, false
		}
	}
	return current, true
}

type MappingRule struct {
	ExternalPath string `json:"externalPath"`
	InternalKey  string `json:"internalKey"`
	DataType     string `json:"dataType"`
}

// TransformPayload maps external webhook payload to internal variables based on mappings JSON.
func TransformPayload(payload map[string]interface{}, mappingsJSON string) map[string]interface{} {
	if mappingsJSON == "" {
		return payload
	}

	var rules []MappingRule
	err := json.Unmarshal([]byte(mappingsJSON), &rules)
	if err != nil {
		fmt.Printf("[MappingEngine] Error parsing mappings JSON: %v\n", err)
		return payload
	}

	if len(rules) == 0 {
		return payload
	}

	result := make(map[string]interface{})
	for _, rule := range rules {
		if rule.ExternalPath == "" || rule.InternalKey == "" {
			continue
		}

		rawValue, exists := GetValueByPath(payload, rule.ExternalPath)
		if !exists || rawValue == nil {
			continue
		}

		var castedValue interface{} = rawValue
		switch rule.DataType {
		case "number":
			switch v := rawValue.(type) {
			case float64:
				castedValue = v
			case int:
				castedValue = float64(v)
			case string:
				if parsed, err := strconv.ParseFloat(v, 64); err == nil {
					castedValue = parsed
				}
			}
		case "boolean":
			switch v := rawValue.(type) {
			case bool:
				castedValue = v
			case string:
				castedValue = (v == "true" || v == "1")
			case float64:
				castedValue = (v == 1.0)
			}
		case "string":
			switch v := rawValue.(type) {
			case string:
				castedValue = v
			case map[string]interface{}, []interface{}:
				if bs, err := json.Marshal(v); err == nil {
					castedValue = string(bs)
				}
			default:
				castedValue = fmt.Sprintf("%v", v)
			}
		}

		result[rule.InternalKey] = castedValue
	}

	if len(result) > 0 {
		return result
	}
	return payload
}
