package services

import (
	"encoding/json"
	"log"
	"time"

	"iotkit-studio-go/internal/database"
	"iotkit-studio-go/pkg/utils"
)

// GetHeadersForProject retrieves dynamic auth headers for a project if active auth config is defined.
func GetHeadersForProject(projectID string) (map[string]string, error) {
	headers := make(map[string]string)

	var authConfig database.AuthConfig
	err := database.DB.Where(`"projectId" = ? AND active = ?`, projectID, true).First(&authConfig).Error
	if err != nil {
		// No active auth config, return empty headers without error
		return headers, nil
	}

	// Check if token is expired or expiring soon (within buffer)
	now := time.Now()
	bufferSecs := authConfig.RefreshBeforeExpiry
	if bufferSecs <= 0 {
		bufferSecs = 300
	}
	buffer := time.Duration(bufferSecs) * time.Second

	isExpired := authConfig.CurrentToken == nil || authConfig.TokenExpiry == nil || authConfig.TokenExpiry.Sub(now) <= buffer

	if isExpired && authConfig.RefreshEnabled {
		log.Printf("[Dynamic Auth] Token for project %s is expired or expiring soon. Refreshing synchronously...", projectID)
		// Try to refresh token synchronously
		refreshedConfig, err := PerformTokenRefreshSync(&authConfig)
		if err == nil {
			authConfig = *refreshedConfig
		} else {
			log.Printf("[Dynamic Auth] Synchronous token refresh failed for project %s: %v", projectID, err)
		}
	}

	if authConfig.CurrentToken == nil || *authConfig.CurrentToken == "" {
		log.Printf("[Dynamic Auth] No token available for project %s", projectID)
		return headers, nil
	}

	// Decrypt the token
	token, err := utils.Decrypt(*authConfig.CurrentToken)
	if err != nil {
		log.Printf("[Dynamic Auth] Failed to decrypt token for project %s: %v", projectID, err)
		return headers, err
	}

	// Standard Bearer header
	headers["Authorization"] = "Bearer " + token

	// Append custom headers if configured
	if authConfig.CustomHeaders != nil && *authConfig.CustomHeaders != "" && *authConfig.CustomHeaders != "{}" {
		var custom map[string]interface{}
		if err := json.Unmarshal([]byte(*authConfig.CustomHeaders), &custom); err == nil {
			for k, v := range custom {
				if strVal, ok := v.(string); ok {
					headers[k] = strVal
				}
			}
		}
	}

	return headers, nil
}
