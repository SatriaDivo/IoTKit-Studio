# Requirements Document

## Introduction

Fitur **Dynamic Auth & Headers** memungkinkan IoTKit Studio untuk melakukan injeksi token autentikasi JWT/API Key secara dinamis dengan kemampuan auto-refresh untuk mendukung simulasi IoT non-stop 24/7 di server aman. Fitur ini mengatasi masalah token expired yang menyebabkan simulasi gagal di tengah jalan, dengan menyediakan mekanisme penyimpanan konfigurasi auth, background worker untuk refresh token otomatis, dan injeksi token dinamis ke dalam request simulasi.

Implementasi akan dilakukan di dua backend: Node.js (Express + TypeScript) sebagai backend utama, dan Golang (Fiber) sebagai backend yang sedang dikembangkan, dengan sinkronisasi schema database menggunakan Prisma.

## Glossary

- **Auth_Manager**: Komponen yang mengelola konfigurasi autentikasi dan token refresh
- **Token_Refresher**: Background worker yang melakukan auto-refresh token sebelum expired
- **Simulation_Engine**: Komponen yang menjalankan simulasi IoT dan mengirim payload
- **Auth_Config**: Model database yang menyimpan konfigurasi autentikasi per project
- **Refresh_Log**: Model database yang mencatat history refresh token
- **Token_Injector**: Komponen yang menyuntikkan token ke dalam request simulasi
- **OAuth_Provider**: Layanan penyedia autentikasi (OAuth2, Keycloak, Auth0, Okta, Custom)
- **Access_Token**: Token yang digunakan untuk autentikasi request
- **Refresh_Token**: Token yang digunakan untuk mendapatkan access token baru
- **Token_Expiry**: Waktu kadaluarsa token dalam format DateTime
- **Grant_Type**: Jenis OAuth flow (client_credentials, password, authorization_code, refresh_token)

## Requirements

### Requirement 1: Auth Configuration Management

**User Story:** As a user, I want to configure authentication settings for my IoT project, so that my simulations can authenticate with secure endpoints.

#### Acceptance Criteria

1. THE Auth_Manager SHALL store OAuth provider configuration (provider name, token endpoint URL, client ID, client secret, scope, grant type)
2. THE Auth_Manager SHALL encrypt sensitive data (client secret, current token) before storing in database
3. WHEN a user creates auth configuration, THE Auth_Manager SHALL validate required fields (provider, tokenEndpoint, clientId, clientSecret)
4. WHEN a user updates auth configuration, THE Auth_Manager SHALL preserve existing token if credentials unchanged
5. THE Auth_Manager SHALL support multiple OAuth providers (oauth2, keycloak, auth0, okta, custom)
6. THE Auth_Manager SHALL allow custom headers and body parameters for token requests
7. WHEN a user deletes a project, THE Auth_Manager SHALL cascade delete associated auth configuration

### Requirement 2: Token Acquisition

**User Story:** As a system, I want to acquire access tokens from OAuth providers, so that simulations can authenticate their requests.

#### Acceptance Criteria

1. WHEN auth configuration is created, THE Auth_Manager SHALL immediately request initial access token from token endpoint
2. THE Auth_Manager SHALL send token request with grant type, client credentials, and optional custom parameters
3. WHEN token request succeeds, THE Auth_Manager SHALL extract access token and expiry time from response
4. WHEN token request succeeds, THE Auth_Manager SHALL encrypt and store access token with expiry timestamp
5. IF token request fails, THEN THE Auth_Manager SHALL log error message and set auth configuration as inactive
6. THE Auth_Manager SHALL support multiple grant types (client_credentials, password, authorization_code, refresh_token)
7. WHEN token response includes refresh token, THE Auth_Manager SHALL store refresh token for future use

### Requirement 3: Automatic Token Refresh

**User Story:** As a system, I want to automatically refresh tokens before they expire, so that 24/7 simulations never fail due to expired tokens.

#### Acceptance Criteria

1. THE Token_Refresher SHALL run as background worker checking token expiry every 60 seconds
2. WHEN current time is within refresh window (N seconds before expiry), THE Token_Refresher SHALL initiate token refresh
3. THE Token_Refresher SHALL use refresh token if available, otherwise re-authenticate with client credentials
4. WHEN token refresh succeeds, THE Token_Refresher SHALL update current token and expiry timestamp
5. WHEN token refresh succeeds, THE Token_Refresher SHALL log success with old and new expiry times
6. IF token refresh fails, THEN THE Token_Refresher SHALL log error message and retry after 60 seconds
7. IF token refresh fails 3 consecutive times, THEN THE Token_Refresher SHALL set auth configuration as inactive and stop simulation
8. WHERE refresh is enabled, THE Token_Refresher SHALL respect refreshBeforeExpiry configuration (default 300 seconds)

### Requirement 4: Token Injection into Simulation Requests

**User Story:** As a simulation, I want to automatically include valid authentication tokens in my requests, so that I can access secure endpoints without manual intervention.

#### Acceptance Criteria

1. WHEN simulation sends request, THE Token_Injector SHALL check if project has active auth configuration
2. WHERE auth configuration exists and is active, THE Token_Injector SHALL retrieve current valid token
3. THE Token_Injector SHALL inject token into request headers as Bearer token (Authorization: Bearer {token})
4. THE Token_Injector SHALL support custom header injection (X-API-Key, Custom-Auth-Header)
5. THE Token_Injector SHALL support token injection into request body (for APIs requiring token in payload)
6. THE Token_Injector SHALL support token injection into query parameters (for APIs requiring token in URL)
7. IF token is expired or missing, THEN THE Token_Injector SHALL trigger immediate token refresh before sending request
8. WHEN token injection fails, THE Simulation_Engine SHALL log error and mark request as failed

### Requirement 5: Refresh Logging and Monitoring

**User Story:** As a user, I want to see the history of token refresh operations, so that I can monitor authentication health and troubleshoot issues.

#### Acceptance Criteria

1. WHEN token refresh is attempted, THE Auth_Manager SHALL create Refresh_Log entry with timestamp
2. THE Refresh_Log SHALL record success status (true/false) for each refresh attempt
3. WHEN refresh fails, THE Refresh_Log SHALL store error message with full details
4. THE Refresh_Log SHALL record old token expiry and new token expiry for successful refreshes
5. THE Auth_Manager SHALL provide API endpoint to retrieve refresh logs for a project
6. THE Auth_Manager SHALL sort refresh logs by creation timestamp in descending order
7. THE Auth_Manager SHALL limit refresh log retrieval to last 100 entries per project

### Requirement 6: Database Schema Synchronization

**User Story:** As a developer, I want database schemas synchronized between Node.js and Golang backends, so that both backends can access auth configuration data consistently.

#### Acceptance Criteria

1. THE Auth_Manager SHALL use Prisma schema as source of truth for database structure
2. WHEN Prisma migration is applied, THE Auth_Manager SHALL generate SQL migration files
3. THE Golang backend SHALL apply same SQL migrations to maintain schema parity
4. THE Auth_Config table SHALL include all fields (id, projectId, provider, tokenEndpoint, clientId, clientSecret, scope, grantType, currentToken, tokenExpiry, refreshEnabled, refreshBeforeExpiry, customHeaders, customBody, active, createdAt, updatedAt)
5. THE Refresh_Log table SHALL include all fields (id, authConfigId, success, errorMessage, oldTokenExpiry, newTokenExpiry, createdAt)
6. THE Auth_Config table SHALL have unique constraint on projectId (one auth config per project)
7. THE Auth_Config table SHALL have foreign key to Project with cascade delete

### Requirement 7: API Endpoints for Auth Configuration

**User Story:** As a frontend developer, I want REST API endpoints to manage auth configurations, so that users can configure authentication through the UI.

#### Acceptance Criteria

1. THE Auth_Manager SHALL provide POST /api/auth-config endpoint to create auth configuration
2. THE Auth_Manager SHALL provide GET /api/auth-config/:projectId endpoint to retrieve auth configuration
3. THE Auth_Manager SHALL provide PUT /api/auth-config/:projectId endpoint to update auth configuration
4. THE Auth_Manager SHALL provide DELETE /api/auth-config/:projectId endpoint to delete auth configuration
5. THE Auth_Manager SHALL provide GET /api/auth-config/:projectId/refresh-logs endpoint to retrieve refresh logs
6. THE Auth_Manager SHALL provide POST /api/auth-config/:projectId/refresh endpoint to manually trigger token refresh
7. THE Auth_Manager SHALL require JWT authentication for all auth-config endpoints
8. WHEN API request is unauthorized, THE Auth_Manager SHALL return 401 status code with error message

### Requirement 8: Security and Encryption

**User Story:** As a security-conscious user, I want sensitive authentication data encrypted at rest, so that my credentials are protected from unauthorized access.

#### Acceptance Criteria

1. THE Auth_Manager SHALL encrypt client secret before storing in database using AES-256-GCM
2. THE Auth_Manager SHALL encrypt current access token before storing in database using AES-256-GCM
3. THE Auth_Manager SHALL use environment variable ENCRYPTION_KEY as encryption key
4. THE Auth_Manager SHALL decrypt client secret when making token requests
5. THE Auth_Manager SHALL decrypt access token when injecting into simulation requests
6. IF ENCRYPTION_KEY is not configured, THEN THE Auth_Manager SHALL throw error on startup
7. THE Auth_Manager SHALL never log or expose decrypted secrets in API responses

### Requirement 9: Error Handling and Resilience

**User Story:** As a system administrator, I want robust error handling for authentication failures, so that simulations can recover gracefully from temporary issues.

#### Acceptance Criteria

1. WHEN token endpoint is unreachable, THE Auth_Manager SHALL log network error and retry after 60 seconds
2. WHEN token endpoint returns 4xx error, THE Auth_Manager SHALL log authentication error and set config as inactive
3. WHEN token endpoint returns 5xx error, THE Auth_Manager SHALL log server error and retry after 60 seconds
4. THE Token_Refresher SHALL implement exponential backoff for consecutive failures (60s, 120s, 240s)
5. WHEN auth configuration is set to inactive, THE Simulation_Engine SHALL pause simulation and notify user
6. THE Auth_Manager SHALL provide health check endpoint showing status of all auth configurations
7. WHEN token refresh succeeds after failures, THE Auth_Manager SHALL automatically reactivate auth configuration and resume simulation

### Requirement 10: Golang Backend Implementation

**User Story:** As a developer, I want auth configuration features implemented in Golang backend, so that both backends provide consistent functionality.

#### Acceptance Criteria

1. THE Golang Auth_Manager SHALL implement same API endpoints as Node.js backend
2. THE Golang Auth_Manager SHALL use same database schema (AuthConfig, RefreshLog tables)
3. THE Golang Token_Refresher SHALL run as goroutine checking token expiry every 60 seconds
4. THE Golang Auth_Manager SHALL use same encryption algorithm (AES-256-GCM) with same key
5. THE Golang Token_Injector SHALL inject tokens into Fiber HTTP client requests
6. THE Golang Auth_Manager SHALL handle errors consistently with Node.js implementation
7. WHEN Golang backend starts, THE Auth_Manager SHALL verify database schema matches expected structure
