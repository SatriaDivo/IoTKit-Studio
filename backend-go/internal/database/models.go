package database

import (
	"time"
)

// Models map exactly to the existing Prisma schema tables

type User struct {
	ID        string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Email     string         `gorm:"uniqueIndex;not null" json:"email"`
	Password  string         `gorm:"not null" json:"-"`
	Name      *string        `json:"name"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	Projects  []Project      `gorm:"foreignKey:UserID" json:"projects,omitempty"`
}

func (User) TableName() string { return "User" }

type Project struct {
	ID             string      `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name           string      `gorm:"not null" json:"name"`
	Description    *string     `json:"description"`
	Protocol       string      `gorm:"not null" json:"protocol"`
	Host           string      `gorm:"not null" json:"host"`
	Port           *int        `json:"port"`
	Endpoint       *string     `json:"endpoint"`
	Topic          *string     `json:"topic"`
	AuthToken      *string     `json:"authToken"`
	Headers        *string     `json:"headers"`
	Username       *string     `json:"username"`
	Password       *string     `json:"password"`
	SSLEnabled     bool        `gorm:"default:false" json:"sslEnabled"`
	AutoReconnect  bool        `gorm:"default:true" json:"autoReconnect"`
	WebhookToken   *string     `gorm:"uniqueIndex" json:"webhookToken"`
	WebhookEnabled bool        `gorm:"default:false" json:"webhookEnabled"`
	Status         string      `gorm:"default:inactive" json:"status"`
	LastActivity   *time.Time  `json:"lastActivity"`
	CreatedAt      time.Time   `json:"createdAt"`
	UpdatedAt      time.Time   `json:"updatedAt"`
	UserID         string      `gorm:"not null" json:"userId"`
	User           User        `gorm:"foreignKey:UserID" json:"-"`
	Payloads       []Payload   `gorm:"foreignKey:ProjectID" json:"payloads,omitempty"`
	Logs           []Log       `gorm:"foreignKey:ProjectID" json:"logs,omitempty"`
	Simulations    []Simulation `gorm:"foreignKey:ProjectID" json:"simulations,omitempty"`
}

func (Project) TableName() string { return "Project" }

type Payload struct {
	ID        string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	Structure string    `gorm:"not null" json:"structure"`
	Template  bool      `gorm:"default:false" json:"template"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	ProjectID string    `gorm:"not null" json:"projectId"`
	Project   Project   `gorm:"foreignKey:ProjectID" json:"-"`
}

func (Payload) TableName() string { return "Payload" }

type Simulation struct {
	ID             string     `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
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

type Log struct {
	ID         string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
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

type Dataset struct {
	ID               string     `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
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

type ChatSession struct {
	ID        string        `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	UserID    string        `gorm:"not null" json:"userId"`
	User      User          `gorm:"foreignKey:UserID" json:"-"`
	Title     string        `gorm:"default:New Conversation" json:"title"`
	CreatedAt time.Time     `json:"createdAt"`
	UpdatedAt time.Time     `json:"updatedAt"`
	Messages  []ChatMessage `gorm:"foreignKey:SessionID" json:"messages,omitempty"`
}

func (ChatSession) TableName() string { return "chat_sessions" }

type ChatMessage struct {
	ID        string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	SessionID string    `gorm:"not null" json:"sessionId"`
	Session   ChatSession `gorm:"foreignKey:SessionID" json:"-"`
	Role      string    `gorm:"not null" json:"role"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	Metadata  *string   `gorm:"type:jsonb" json:"metadata"`
	CreatedAt time.Time `json:"createdAt"`
}

func (ChatMessage) TableName() string { return "chat_messages" }


