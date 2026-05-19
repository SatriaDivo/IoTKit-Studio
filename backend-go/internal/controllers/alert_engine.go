package controllers

import "iotkit-studio-go/internal/rules"

// Forwarder to the shared rules package to prevent circular dependencies
func EvaluatePayloadRules(projectID string, payloadJSON string) {
	rules.EvaluatePayloadRules(projectID, payloadJSON)
}
