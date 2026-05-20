package services

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"iotkit-studio-go/internal/database"
	"iotkit-studio-go/pkg/utils"
)

// PerformTokenRefreshSync refreshes the token synchronously and updates DB record & logs.
func PerformTokenRefreshSync(authConfig *database.AuthConfig) (*database.AuthConfig, error) {
	// Decrypt credentials
	var decryptedSecret string
	var err error
	if authConfig.ClientSecret != "" {
		decryptedSecret, err = utils.Decrypt(authConfig.ClientSecret)
		if err != nil {
			errMsg := "Failed to decrypt clientSecret: " + err.Error()
			logEntry := database.RefreshLog{
				AuthConfigID:   authConfig.ID,
				Success:        false,
				ErrorMessage:   &errMsg,
				OldTokenExpiry: authConfig.TokenExpiry,
			}
			database.DB.Create(&logEntry)
			return nil, errors.New(errMsg)
		}
	}

	// Build standard OAuth 2.0 payload
	form := url.Values{}
	form.Set("grant_type", authConfig.GrantType)
	form.Set("client_id", authConfig.ClientID)
	form.Set("client_secret", decryptedSecret)
	if authConfig.Scope != nil && *authConfig.Scope != "" {
		form.Set("scope", *authConfig.Scope)
	}

	// Parse custom body parameters
	var customBody map[string]interface{}
	if authConfig.CustomBody != nil && *authConfig.CustomBody != "" && *authConfig.CustomBody != "{}" {
		json.Unmarshal([]byte(*authConfig.CustomBody), &customBody)
	}

	// JSON payload mapping if needed
	jsonData := make(map[string]interface{})
	jsonData["grant_type"] = authConfig.GrantType
	jsonData["client_id"] = authConfig.ClientID
	jsonData["client_secret"] = decryptedSecret
	if authConfig.Scope != nil && *authConfig.Scope != "" {
		jsonData["scope"] = *authConfig.Scope
	}
	for k, v := range customBody {
		form.Set(k, fmt.Sprintf("%v", v))
		jsonData[k] = v
	}

	// Prepare Headers
	contentType := "application/x-www-form-urlencoded"
	var customHeaders map[string]string
	if authConfig.CustomHeaders != nil && *authConfig.CustomHeaders != "" && *authConfig.CustomHeaders != "{}" {
		json.Unmarshal([]byte(*authConfig.CustomHeaders), &customHeaders)
	}

	for k, v := range customHeaders {
		if strings.ToLower(k) == "content-type" {
			contentType = v
		}
	}

	var req *http.Request
	if strings.Contains(contentType, "application/json") {
		bodyBytes, _ := json.Marshal(jsonData)
		req, err = http.NewRequest("POST", authConfig.TokenEndpoint, bytes.NewBuffer(bodyBytes))
	} else {
		req, err = http.NewRequest("POST", authConfig.TokenEndpoint, strings.NewReader(form.Encode()))
	}

	if err != nil {
		errMsg := "Failed to create HTTP request: " + err.Error()
		logEntry := database.RefreshLog{
			AuthConfigID:   authConfig.ID,
			Success:        false,
			ErrorMessage:   &errMsg,
			OldTokenExpiry: authConfig.TokenExpiry,
		}
		database.DB.Create(&logEntry)
		return nil, errors.New(errMsg)
	}

	req.Header.Set("Content-Type", contentType)
	for k, v := range customHeaders {
		req.Header.Set(k, v)
	}

	// Perform HTTP call
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		errMsg := "HTTP request failed: " + err.Error()
		logEntry := database.RefreshLog{
			AuthConfigID:   authConfig.ID,
			Success:        false,
			ErrorMessage:   &errMsg,
			OldTokenExpiry: authConfig.TokenExpiry,
		}
		database.DB.Create(&logEntry)
		return nil, errors.New(errMsg)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		errMsg := fmt.Sprintf("Token endpoint returned status %d: %s", resp.StatusCode, string(respBody))
		logEntry := database.RefreshLog{
			AuthConfigID:   authConfig.ID,
			Success:        false,
			ErrorMessage:   &errMsg,
			OldTokenExpiry: authConfig.TokenExpiry,
		}
		database.DB.Create(&logEntry)
		return nil, errors.New(errMsg)
	}

	// Parse JSON
	var responseData map[string]interface{}
	if err := json.Unmarshal(respBody, &responseData); err != nil {
		errMsg := fmt.Sprintf("Failed to parse JSON response: %v", err)
		logEntry := database.RefreshLog{
			AuthConfigID:   authConfig.ID,
			Success:        false,
			ErrorMessage:   &errMsg,
			OldTokenExpiry: authConfig.TokenExpiry,
		}
		database.DB.Create(&logEntry)
		return nil, err
	}

	// Extract access token
	var newToken string
	if t, ok := responseData["access_token"].(string); ok {
		newToken = t
	} else if t, ok := responseData["token"].(string); ok {
		newToken = t
	} else if d, ok := responseData["data"].(map[string]interface{}); ok {
		if t, ok := d["token"].(string); ok {
			newToken = t
		}
	}

	if newToken == "" {
		errMsg := "No token found in response: " + string(respBody)
		logEntry := database.RefreshLog{
			AuthConfigID:   authConfig.ID,
			Success:        false,
			ErrorMessage:   &errMsg,
			OldTokenExpiry: authConfig.TokenExpiry,
		}
		database.DB.Create(&logEntry)
		return nil, errors.New(errMsg)
	}

	// Extract expiry
	expiresIn := 3600.0
	if exp, ok := responseData["expires_in"].(float64); ok {
		expiresIn = exp
	} else if exp, ok := responseData["expiresIn"].(float64); ok {
		expiresIn = exp
	}

	tokenExpiry := time.Now().Add(time.Duration(expiresIn) * time.Second)

	// Encrypt token
	encryptedToken, err := utils.Encrypt(newToken)
	if err != nil {
		errMsg := "Encryption of token failed: " + err.Error()
		logEntry := database.RefreshLog{
			AuthConfigID:   authConfig.ID,
			Success:        false,
			ErrorMessage:   &errMsg,
			OldTokenExpiry: authConfig.TokenExpiry,
		}
		database.DB.Create(&logEntry)
		return nil, err
	}

	// Update DB record
	authConfig.CurrentToken = &encryptedToken
	authConfig.TokenExpiry = &tokenExpiry
	authConfig.UpdatedAt = time.Now()

	if err := database.DB.Save(authConfig).Error; err != nil {
		errMsg := "Failed to save AuthConfig record: " + err.Error()
		logEntry := database.RefreshLog{
			AuthConfigID:   authConfig.ID,
			Success:        false,
			ErrorMessage:   &errMsg,
			OldTokenExpiry: authConfig.TokenExpiry,
		}
		database.DB.Create(&logEntry)
		return nil, err
	}

	// Success Log
	logEntry := database.RefreshLog{
		AuthConfigID:   authConfig.ID,
		Success:        true,
		OldTokenExpiry: authConfig.TokenExpiry,
		NewTokenExpiry: &tokenExpiry,
	}
	database.DB.Create(&logEntry)

	return authConfig, nil
}

// StartTokenRefreshWorker runs a background goroutine checking for tokens that need refresh every 5 minutes.
func StartTokenRefreshWorker() {
	log.Println("[Token Refresh Worker] Starting background worker...")
	ticker := time.NewTicker(5 * time.Minute)

	go func() {
		// Run check immediately on start
		checkAndRefreshActiveTokens()

		for range ticker.C {
			checkAndRefreshActiveTokens()
		}
	}()
}

func checkAndRefreshActiveTokens() {
	var authConfigs []database.AuthConfig
	err := database.DB.Where("\"refreshEnabled\" = ? AND active = ?", true, true).Find(&authConfigs).Error
	if err != nil {
		log.Printf("[Token Refresh Worker] Error checking auth configs: %v", err)
		return
	}

	for _, ac := range authConfigs {
		// Check if related project is active
		var project database.Project
		if err := database.DB.First(&project, "id = ?", ac.ProjectID).Error; err == nil {
			if project.Status != "active" {
				continue
			}
		}

		if shouldRefreshToken(&ac) {
			log.Printf("[Token Refresh Worker] Refreshing token for project ID: %s", ac.ProjectID)
			_, err := PerformTokenRefreshSync(&ac)
			if err != nil {
				log.Printf("[Token Refresh Worker] Failed to refresh token for project ID %s: %v", ac.ProjectID, err)
			} else {
				log.Printf("[Token Refresh Worker] Refreshed token successfully for project ID: %s", ac.ProjectID)
			}
		}
	}
}

func shouldRefreshToken(authConfig *database.AuthConfig) bool {
	// If no token, refresh
	if authConfig.CurrentToken == nil || *authConfig.CurrentToken == "" {
		return true
	}

	bufferSecs := authConfig.RefreshBeforeExpiry
	if bufferSecs <= 0 {
		bufferSecs = 300
	}
	buffer := time.Duration(bufferSecs) * time.Second

	// If no expiry set, refresh every 24 hours based on updatedAt
	if authConfig.TokenExpiry == nil {
		return time.Since(authConfig.UpdatedAt) >= 24*time.Hour
	}

	return authConfig.TokenExpiry.Sub(time.Now()) <= buffer
}
