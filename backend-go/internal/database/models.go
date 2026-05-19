package database

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Models map exactly to the existing Prisma schema tables
// Prisma generates UUIDs at the application level, NOT as database DEFAULT.
// Therefore we must generate UUIDs via BeforeCreate hooks in GORM.

type User struct {
	ID        string    `gorm:"primaryKey;type:uuid" json:"id"`
	Email     string    `gorm:"uniqueIndex;not null" json:"email"`
	Password  string    `gorm:"not null" json:"-"`
	Name      *string   `json:"name"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	Projects  []Project `gorm:"foreignKey:UserID" json:"projects,omitempty"`
}

func (User) TableName() string { return "User" }
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return nil
}

type Project struct {
	ID             string       `gorm:"primaryKey;type:uuid" json:"id"`
	Name           string       `gorm:"not null" json:"name"`
	Description    *string      `json:"description"`
	Protocol       string       `gorm:"not null" json:"protocol"`
	Host           string       `gorm:"not null" json:"host"`
	Port           *int         `json:"port"`
	Endpoint       *string      `json:"endpoint"`
	Topic          *string      `json:"topic"`
	AuthToken      *string      `json:"authToken"`
	Headers        *string      `json:"headers"`
	Username       *string      `json:"username"`
	Password       *string      `json:"password"`
	SSLEnabled     bool         `gorm:"default:false" json:"sslEnabled"`
	AutoReconnect  bool         `gorm:"default:true" json:"autoReconnect"`
	WebhookToken   *string      `gorm:"uniqueIndex" json:"webhookToken"`
	WebhookEnabled bool         `gorm:"default:false" json:"webhookEnabled"`
	Status         string       `gorm:"default:inactive" json:"status"`
	LastActivity   *time.Time   `json:"lastActivity"`
	CreatedAt      time.Time    `json:"createdAt"`
	UpdatedAt      time.Time    `json:"updatedAt"`
	UserID         string       `gorm:"not null" json:"userId"`
	User           User         `gorm:"foreignKey:UserID" json:"-"`
	Payloads       []Payload    `gorm:"foreignKey:ProjectID" json:"payloads,omitempty"`
	Logs           []Log        `gorm:"foreignKey:ProjectID" json:"logs,omitempty"`
	Simulations    []Simulation `gorm:"foreignKey:ProjectID" json:"simulations,omitempty"`
	WebhookMap     *WebhookMap  `gorm:"foreignKey:ProjectID" json:"webhookMap,omitempty"`
}

func (Project) TableName() string { return "Project" }
func (p *Project) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	return nil
}

type Payload struct {
	ID        string    `gorm:"primaryKey;type:uuid" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	Structure string    `gorm:"not null" json:"structure"`
	Template  bool      `gorm:"default:false" json:"template"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	ProjectID string    `gorm:"not null" json:"projectId"`
	Project   Project   `gorm:"foreignKey:ProjectID" json:"-"`
}

func (Payload) TableName() string { return "Payload" }
func (p *Payload) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	return nil
}

type Simulation struct {
	ID             string     `gorm:"primaryKey;type:uuid" json:"id"`
	JobID          *string    `gorm:"uniqueIndex" json:"jobId"`
	ModuleName     string     `gorm:"default:custom" json:"moduleName"`
	Mode           string     `gorm:"default:interval" json:"mode"`
	Status         string     `gorm:"default:idle" json:"status"`
	Interval       int        `gorm:"default:5000" json:"interval"`
	BatchSize      int        `gorm:"default:1" json:"batchSize"`
	SwarmMode      bool       `gorm:"default:false" json:"swarmMode"`
	SwarmCount     int        `gorm:"default:1" json:"swarmCount"`
	Stages         *string    `json:"stages"`
	TargetCount    *int       `json:"targetCount"`
	PayloadKind    *string    `json:"payloadKind"`
	PayloadOptions *string    `json:"payloadOptions"`
	TotalSent      int        `gorm:"default:0" json:"totalSent"`
	SuccessCount   int        `gorm:"default:0" json:"successCount"`
	ErrorCount     int        `gorm:"default:0" json:"errorCount"`
	LastRunAt      *time.Time `json:"lastRunAt"`
	LastPayload    *string    `json:"lastPayload"`
	LastResponse   *string    `json:"lastResponse"`
	LastError      *string    `json:"lastError"`
	StartedAt      *time.Time `json:"startedAt"`
	StoppedAt      *time.Time `json:"stoppedAt"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
	ProjectID      string     `gorm:"not null" json:"projectId"`
	Project        Project    `gorm:"foreignKey:ProjectID" json:"-"`
}

func (Simulation) TableName() string { return "Simulation" }
func (s *Simulation) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}

type Log struct {
	ID         string    `gorm:"primaryKey;type:uuid" json:"id"`
	Type       string    `gorm:"not null" json:"type"`
	Protocol   string    `gorm:"not null" json:"protocol"`
	Message    string    `gorm:"not null" json:"message"`
	Payload    *string   `json:"payload"`
	StatusCode *int      `json:"statusCode"`
	Latency    *int      `json:"latency"`
	Timestamp  time.Time `gorm:"default:now()" json:"timestamp"`
	ProjectID  string    `gorm:"not null" json:"projectId"`
	Project    Project   `gorm:"foreignKey:ProjectID" json:"-"`
}

func (Log) TableName() string { return "Log" }
func (l *Log) BeforeCreate(tx *gorm.DB) error {
	if l.ID == "" {
		l.ID = uuid.New().String()
	}
	if l.Timestamp.IsZero() {
		l.Timestamp = time.Now()
	}
	return nil
}

type Dataset struct {
	ID               string     `gorm:"primaryKey;type:uuid" json:"id"`
	Name             string     `gorm:"not null" json:"name"`
	ModuleName       string     `gorm:"not null" json:"moduleName"`
	FileName         string     `gorm:"not null" json:"fileName"`
	FilePath         string     `gorm:"not null" json:"filePath"`
	FilePathRelative *string    `json:"filePathRelative"`
	FileSizeBytes    int64      `gorm:"not null" json:"fileSizeBytes"`
	ChecksumSha256   string     `gorm:"not null" json:"checksumSha256"`
	Delimiter        string     `gorm:"default:," json:"delimiter"`
	LoadedRows       int        `gorm:"default:0" json:"loadedRows"`
	SkippedRows      int        `gorm:"default:0" json:"skippedRows"`
	IsActive         bool       `gorm:"default:false" json:"isActive"`
	LastLoadedAt     *time.Time `json:"lastLoadedAt"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`
}

func (Dataset) TableName() string { return "Dataset" }
func (d *Dataset) BeforeCreate(tx *gorm.DB) error {
	if d.ID == "" {
		d.ID = uuid.New().String()
	}
	return nil
}

type ChatSession struct {
	ID        string        `gorm:"primaryKey;type:uuid" json:"id"`
	UserID    string        `gorm:"not null" json:"userId"`
	User      User          `gorm:"foreignKey:UserID" json:"-"`
	Title     string        `gorm:"default:New Conversation" json:"title"`
	CreatedAt time.Time     `json:"createdAt"`
	UpdatedAt time.Time     `json:"updatedAt"`
	Messages  []ChatMessage `gorm:"foreignKey:SessionID" json:"messages,omitempty"`
}

func (ChatSession) TableName() string { return "chat_sessions" }
func (cs *ChatSession) BeforeCreate(tx *gorm.DB) error {
	if cs.ID == "" {
		cs.ID = uuid.New().String()
	}
	return nil
}

type ChatMessage struct {
	ID        string      `gorm:"primaryKey;type:uuid" json:"id"`
	SessionID string      `gorm:"not null" json:"sessionId"`
	Session   ChatSession `gorm:"foreignKey:SessionID" json:"-"`
	Role      string      `gorm:"not null" json:"role"`
	Content   string      `gorm:"type:text;not null" json:"content"`
	Metadata  *string     `gorm:"type:jsonb" json:"metadata"`
	CreatedAt time.Time   `json:"createdAt"`
}

func (ChatMessage) TableName() string { return "chat_messages" }
func (cm *ChatMessage) BeforeCreate(tx *gorm.DB) error {
	if cm.ID == "" {
		cm.ID = uuid.New().String()
	}
	return nil
}

type AlertRule struct {
	ID        string    `gorm:"primaryKey;type:uuid" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	ProjectID string    `gorm:"column:projectId;not null" json:"projectId"`
	Project   Project   `gorm:"foreignKey:ProjectID" json:"-"`
	Field     string    `gorm:"not null" json:"field"`
	Operator  string    `gorm:"not null" json:"operator"`
	Value     string    `gorm:"not null" json:"value"`
	Severity  string    `gorm:"default:warning" json:"severity"`
	IsActive  bool      `gorm:"column:isActive;default:true" json:"isActive"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (AlertRule) TableName() string { return "AlertRule" }
func (ar *AlertRule) BeforeCreate(tx *gorm.DB) error {
	if ar.ID == "" {
		ar.ID = uuid.New().String()
	}
	ar.CreatedAt = time.Now()
	ar.UpdatedAt = time.Now()
	return nil
}
func (ar *AlertRule) BeforeUpdate(tx *gorm.DB) error {
	ar.UpdatedAt = time.Now()
	return nil
}

type AlertLog struct {
	ID        string    `gorm:"primaryKey;type:uuid" json:"id"`
	RuleID    *string   `gorm:"column:ruleId" json:"ruleId"`
	ProjectID string    `gorm:"column:projectId;not null" json:"projectId"`
	Project   Project   `gorm:"foreignKey:ProjectID" json:"-"`
	Message   string    `gorm:"not null" json:"message"`
	Value     string    `gorm:"not null" json:"value"`
	Severity  string    `gorm:"not null" json:"severity"`
	Timestamp time.Time `gorm:"column:timestamp;default:now()" json:"timestamp"`
	Read      bool      `gorm:"default:false" json:"read"`
}

func (AlertLog) TableName() string { return "AlertLog" }
func (al *AlertLog) BeforeCreate(tx *gorm.DB) error {
	if al.ID == "" {
		al.ID = uuid.New().String()
	}
	if al.Timestamp.IsZero() {
		al.Timestamp = time.Now()
	}
	return nil
}

// AuthConfig - OAuth 2.0 authentication configuration
type AuthConfig struct {
	ID                  string     `gorm:"primaryKey;type:uuid" json:"id"`
	ProjectID           string     `gorm:"column:projectId;uniqueIndex;not null" json:"projectId"`
	Project             Project    `gorm:"foreignKey:ProjectID" json:"-"`
	Provider            string     `gorm:"not null" json:"provider"`
	TokenEndpoint       string     `gorm:"column:tokenEndpoint;not null" json:"tokenEndpoint"`
	ClientID            string     `gorm:"column:clientId;not null" json:"clientId"`
	ClientSecret        string     `gorm:"column:clientSecret;type:text;not null" json:"-"` // Encrypted
	Scope               *string    `json:"scope"`
	GrantType           string     `gorm:"column:grantType;default:client_credentials" json:"grantType"`
	CurrentToken        *string    `gorm:"column:currentToken;type:text" json:"-"` // Encrypted
	TokenExpiry         *time.Time `gorm:"column:tokenExpiry" json:"tokenExpiry"`
	RefreshEnabled      bool       `gorm:"column:refreshEnabled;default:true" json:"refreshEnabled"`
	RefreshBeforeExpiry int        `gorm:"column:refreshBeforeExpiry;default:300" json:"refreshBeforeExpiry"`
	CustomHeaders       *string    `gorm:"column:customHeaders;type:jsonb" json:"customHeaders"`
	CustomBody          *string    `gorm:"column:customBody;type:jsonb" json:"customBody"`
	Active              bool       `gorm:"default:true" json:"active"`
	CreatedAt           time.Time  `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt           time.Time  `gorm:"column:updatedAt" json:"updatedAt"`
	RefreshLogs         []RefreshLog `gorm:"foreignKey:AuthConfigID" json:"refreshLogs,omitempty"`
}

func (AuthConfig) TableName() string { return "AuthConfig" }
func (ac *AuthConfig) BeforeCreate(tx *gorm.DB) error {
	if ac.ID == "" {
		ac.ID = uuid.New().String()
	}
	ac.CreatedAt = time.Now()
	ac.UpdatedAt = time.Now()
	return nil
}
func (ac *AuthConfig) BeforeUpdate(tx *gorm.DB) error {
	ac.UpdatedAt = time.Now()
	return nil
}

// RefreshLog - Token refresh attempt log
type RefreshLog struct {
	ID             string     `gorm:"primaryKey;type:uuid" json:"id"`
	AuthConfigID   string     `gorm:"column:authConfigId;not null" json:"authConfigId"`
	AuthConfig     AuthConfig `gorm:"foreignKey:AuthConfigID" json:"-"`
	Success        bool       `gorm:"not null" json:"success"`
	ErrorMessage   *string    `gorm:"column:errorMessage;type:text" json:"errorMessage"`
	OldTokenExpiry *time.Time `gorm:"column:oldTokenExpiry" json:"oldTokenExpiry"`
	NewTokenExpiry *time.Time `gorm:"column:newTokenExpiry" json:"newTokenExpiry"`
	CreatedAt      time.Time  `gorm:"column:createdAt" json:"createdAt"`
}

func (RefreshLog) TableName() string { return "RefreshLog" }
func (rl *RefreshLog) BeforeCreate(tx *gorm.DB) error {
	if rl.ID == "" {
		rl.ID = uuid.New().String()
	}
	if rl.CreatedAt.IsZero() {
		rl.CreatedAt = time.Now()
	}
	return nil
}

type WebhookMap struct {
	ID        string    `gorm:"primaryKey;type:uuid" json:"id"`
	ProjectID string    `gorm:"column:projectId;uniqueIndex;not null" json:"projectId"`
	Project   Project   `gorm:"foreignKey:ProjectID" json:"-"`
	Mappings  string    `gorm:"not null" json:"mappings"` // JSON string
	Active    bool      `gorm:"default:true" json:"active"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (WebhookMap) TableName() string { return "WebhookMap" }
func (wm *WebhookMap) BeforeCreate(tx *gorm.DB) error {
	if wm.ID == "" {
		wm.ID = uuid.New().String()
	}
	wm.CreatedAt = time.Now()
	wm.UpdatedAt = time.Now()
	return nil
}
func (wm *WebhookMap) BeforeUpdate(tx *gorm.DB) error {
	wm.UpdatedAt = time.Now()
	return nil
}
