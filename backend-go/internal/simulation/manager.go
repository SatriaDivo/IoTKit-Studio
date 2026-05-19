package simulation

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"math/rand"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"iotkit-studio-go/internal/database"
	"iotkit-studio-go/internal/protocols"
	"iotkit-studio-go/internal/rules"
	ws "iotkit-studio-go/internal/websocket"
)

// Types matching the Node.js backend

type PayloadField struct {
	Name     string      `json:"name"`
	Type     string      `json:"type"`
	Mode     string      `json:"mode"`
	Value    interface{} `json:"value"`
	Min      *float64    `json:"min"`
	Max      *float64    `json:"max"`
	Children []PayloadField `json:"children,omitempty"`
}

type LoadTestStage struct {
	Duration int `json:"duration"`
	Target   int `json:"target"`
}

type SimulationConfig struct {
	ProjectID        string         `json:"projectId"`
	Interval         int            `json:"interval"`
	BatchSize        int            `json:"batchSize"`
	PayloadStructure []PayloadField `json:"payloadStructure"`
	SwarmMode        bool           `json:"swarmMode"`
	SwarmCount       int            `json:"swarmCount"`
	Stages           []LoadTestStage `json:"stages"`
	ChaosMode        bool           `json:"chaosMode"`
	ChaosProbability float64        `json:"chaosProbability"`
	ChaosFields      []string       `json:"chaosFields"`
}

type SimulationStats struct {
	TotalSent    int64   `json:"totalSent"`
	SuccessCount int64   `json:"successCount"`
	ErrorCount   int64   `json:"errorCount"`
	StartTime    int64   `json:"startTime"`
	VUs          int     `json:"vus"`
	Iterations   int64   `json:"iterations"`
	RPS          int64   `json:"rps"`
	HTTPReqDuration struct {
		Avg float64 `json:"avg"`
		Min float64 `json:"min"`
		Med float64 `json:"med"`
		Max float64 `json:"max"`
		P90 float64 `json:"p90"`
		P95 float64 `json:"p95"`
	} `json:"http_req_duration"`
	HTTPReqs int64 `json:"http_reqs"`
}

type datasetState struct {
	rows         []map[string]string
	currentIndex int
	mu           sync.Mutex
}

type simulationJob struct {
	config      SimulationConfig
	project     *database.Project
	stats       *SimulationStats
	latencies   []float64
	latencyMu   sync.Mutex
	dataset     *datasetState
	cancelCh    chan struct{}
	rpsCounter  int64
	rpsMu       sync.Mutex
	vuWg        sync.WaitGroup
	activeVUs   int
	mqttClient  *protocols.MQTTClient
	wsClient    *protocols.WSClient
}

// SimulationManager manages all running simulations using goroutines
type SimulationManager struct {
	jobs map[string]*simulationJob
	mu   sync.RWMutex
}

// Manager is the global singleton
var Manager = &SimulationManager{
	jobs: make(map[string]*simulationJob),
}

func (m *SimulationManager) Start(cfg SimulationConfig, project *database.Project) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.jobs[cfg.ProjectID]; exists {
		return fmt.Errorf("simulation already running for this project")
	}

	// Connect protocol clients
	var mqttCl *protocols.MQTTClient
	var wsCl *protocols.WSClient
	proto := strings.ToUpper(project.Protocol)

	if proto == "MQTT" || proto == "MQTTS" {
		mqttCl = protocols.NewMQTTClient(project)
		if err := mqttCl.Connect(); err != nil {
			return fmt.Errorf("MQTT connect failed: %v", err)
		}
	} else if proto == "WS" || proto == "WSS" {
		wsCl = protocols.NewWSClient(project)
		if err := wsCl.Connect(); err != nil {
			return fmt.Errorf("WebSocket connect failed: %v", err)
		}
	}

	// Load dataset if needed
	var ds *datasetState
	for _, f := range cfg.PayloadStructure {
		if f.Name == "__dataset_mode__" {
			datasetID, _ := f.Value.(string)
			var dataset database.Dataset
			if err := database.DB.First(&dataset, "id = ?", datasetID).Error; err != nil {
				return fmt.Errorf("dataset not found")
			}
			rows, err := loadCSV(dataset.FilePath)
			if err != nil {
				return fmt.Errorf("failed to load dataset: %v", err)
			}

			// Filter by device_id if set as static
			for _, pf := range cfg.PayloadStructure {
				if (pf.Name == "device_id" || pf.Name == "deviceId") && pf.Mode == "static" {
					deviceID, _ := pf.Value.(string)
					if deviceID != "" {
						filtered := make([]map[string]string, 0)
						for _, r := range rows {
							if r["device_id"] == deviceID || r["deviceId"] == deviceID {
								filtered = append(filtered, r)
							}
						}
						if len(filtered) > 0 {
							rows = filtered
						}
					}
				}
			}

			ds = &datasetState{rows: rows, currentIndex: 0}
			break
		}
	}

	job := &simulationJob{
		config:     cfg,
		project:    project,
		dataset:    ds,
		cancelCh:   make(chan struct{}),
		mqttClient: mqttCl,
		wsClient:   wsCl,
		stats: &SimulationStats{
			StartTime: time.Now().UnixMilli(),
		},
	}

	m.jobs[cfg.ProjectID] = job

	// Start RPS counter goroutine
	go func() {
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-job.cancelCh:
				return
			case <-ticker.C:
				job.rpsMu.Lock()
				job.stats.RPS = job.rpsCounter
				job.rpsCounter = 0
				job.rpsMu.Unlock()
			}
		}
	}()

	// Start VUs
	if !cfg.SwarmMode {
		go m.runVU(cfg.ProjectID, 1)
		job.activeVUs = 1
		job.stats.VUs = 1
	} else {
		stages := cfg.Stages
		if len(stages) == 0 {
			count := cfg.SwarmCount
			if count == 0 {
				count = 1
			}
			stages = []LoadTestStage{{Duration: 0, Target: count}}
		}
		go m.runStages(cfg.ProjectID, stages)
	}

	log.Printf("[SIM] Simulation started for project %s", cfg.ProjectID)
	return nil
}

func (m *SimulationManager) runStages(projectID string, stages []LoadTestStage) {
	m.mu.RLock()
	job, exists := m.jobs[projectID]
	m.mu.RUnlock()
	if !exists {
		return
	}

	stageStart := time.Now()
	for i, stage := range stages {
		select {
		case <-job.cancelCh:
			return
		default:
		}

		if stage.Duration == 0 {
			m.scaleVUs(projectID, stage.Target)
			if i+1 < len(stages) {
				stageStart = time.Now()
			}
			continue
		}

		prevTarget := 0
		if i > 0 {
			prevTarget = stages[i-1].Target
		}

		ticker := time.NewTicker(500 * time.Millisecond)
		for {
			select {
			case <-job.cancelCh:
				ticker.Stop()
				return
			case <-ticker.C:
				elapsed := time.Since(stageStart).Seconds()
				progress := math.Min(elapsed/float64(stage.Duration), 1.0)
				current := int(math.Round(float64(prevTarget) + float64(stage.Target-prevTarget)*progress))
				m.scaleVUs(projectID, current)

				if progress >= 1.0 {
					ticker.Stop()
					stageStart = time.Now()
					goto nextStage
				}
			}
		}
	nextStage:
	}
}

func (m *SimulationManager) scaleVUs(projectID string, target int) {
	m.mu.RLock()
	job, exists := m.jobs[projectID]
	m.mu.RUnlock()
	if !exists {
		return
	}

	current := job.activeVUs
	if current < target {
		for i := current + 1; i <= target; i++ {
			go m.runVU(projectID, i)
		}
	}
	// For scaling down, VUs check cancelCh or activeVUs count
	job.activeVUs = target
	job.stats.VUs = target
}

func (m *SimulationManager) runVU(projectID string, vuID int) {
	m.mu.RLock()
	job, exists := m.jobs[projectID]
	m.mu.RUnlock()
	if !exists {
		return
	}

	job.vuWg.Add(1)
	defer job.vuWg.Done()

	for {
		select {
		case <-job.cancelCh:
			return
		default:
			if vuID > job.activeVUs {
				return
			}
		}

		start := time.Now()
		m.executeIteration(projectID, vuID)
		elapsed := time.Since(start).Milliseconds()

		sleepMs := int64(job.config.Interval) - elapsed
		if sleepMs < 0 {
			sleepMs = 0
		}

		select {
		case <-job.cancelCh:
			return
		case <-time.After(time.Duration(sleepMs) * time.Millisecond):
		}
	}
}

func (m *SimulationManager) executeIteration(projectID string, vuID int) {
	m.mu.RLock()
	job, exists := m.jobs[projectID]
	m.mu.RUnlock()
	if !exists {
		return
	}

	for i := 0; i < job.config.BatchSize; i++ {
		// Build payload
		actualFields := make([]PayloadField, 0)
		for _, f := range job.config.PayloadStructure {
			if f.Name != "__dataset_mode__" {
				actualFields = append(actualFields, f)
			}
		}

		payload := generatePayload(actualFields, job.config.ChaosMode, job.config.ChaosProbability, job.config.ChaosFields)

		// Merge dataset row if available
		if job.dataset != nil && len(job.dataset.rows) > 0 {
			job.dataset.mu.Lock()
			if job.dataset.currentIndex >= len(job.dataset.rows) {
				job.dataset.currentIndex = 0
			}
			row := job.dataset.rows[job.dataset.currentIndex]
			job.dataset.currentIndex++
			job.dataset.mu.Unlock()

			unflattened := unflattenRow(row)
			payload = mergeDeep(payload, unflattened)
		}

		// Inject VU ID for swarm
		if job.config.SwarmMode {
			injectSwarmID(payload, vuID)
		}

		// Send via protocol
		reqStart := time.Now()
		var statusCode int
		var success bool
		var err error

		proto := strings.ToUpper(job.project.Protocol)
		switch {
		case proto == "MQTT" || proto == "MQTTS":
			if job.mqttClient != nil {
				success, err = job.mqttClient.Publish(payload)
				if success {
					statusCode = 200
				}
			}
		case proto == "WS" || proto == "WSS":
			if job.wsClient != nil {
				success, err = job.wsClient.Send(payload)
				if success {
					statusCode = 200
				}
			}
		default:
			statusCode, success, err = sendHTTP(job.project, payload)
		}
		latency := float64(time.Since(reqStart).Milliseconds())

		// Update stats atomically
		job.stats.TotalSent++
		job.stats.HTTPReqs++
		job.stats.Iterations++
		job.rpsMu.Lock()
		job.rpsCounter++
		job.rpsMu.Unlock()

		if success {
			job.stats.SuccessCount++
		} else {
			job.stats.ErrorCount++
		}

		m.updateLatency(projectID, latency)

		// Run rule evaluation on every simulated payload
		payloadJSON, _ := json.Marshal(payload)
		payloadStr := string(payloadJSON)
		rules.EvaluatePayloadRules(projectID, payloadStr)

		// Log to DB (sample for heavy load)
		shouldLog := !job.config.SwarmMode || job.activeVUs <= 5 || (!success && rand.Float64() < 0.1)
		if shouldLog {
			msg := fmt.Sprintf("→ [VU-%d] POST %s | %dms | %d", vuID, ptrStr(job.project.Endpoint, "/"), int(latency), statusCode)
			if err != nil {
				msg = err.Error()
			}
			logType := "request"
			if err != nil {
				logType = "error"
			}
			logEntry := database.Log{
				Type:       logType,
				Protocol:   job.project.Protocol,
				Message:    msg,
				Payload:    &payloadStr,
				StatusCode: &statusCode,
				Latency:    intPtr(int(latency)),
				ProjectID:  projectID,
			}
			database.DB.Create(&logEntry)
		}

		// Broadcast real-time stats via WebSocket
		ws.HubInstance.BroadcastToProject(projectID, "payloadSent", map[string]interface{}{
			"projectId": projectID,
			"payload":   payload,
			"stats":     job.stats,
		})

		if shouldLog {
			log.Printf("[SIM] [VU-%d] %s | %dms | %d", vuID, job.project.Protocol, int(latency), statusCode)
		}
	}
}

func (m *SimulationManager) updateLatency(projectID string, latency float64) {
	m.mu.RLock()
	job, exists := m.jobs[projectID]
	m.mu.RUnlock()
	if !exists {
		return
	}

	job.latencyMu.Lock()
	defer job.latencyMu.Unlock()

	job.latencies = append(job.latencies, latency)
	if len(job.latencies) > 5000 {
		// Remove random element to downsample
		idx := rand.Intn(len(job.latencies))
		job.latencies = append(job.latencies[:idx], job.latencies[idx+1:]...)
	}

	sorted := make([]float64, len(job.latencies))
	copy(sorted, job.latencies)
	sort.Float64s(sorted)

	n := len(sorted)
	job.stats.HTTPReqDuration.Min = sorted[0]
	job.stats.HTTPReqDuration.Max = sorted[n-1]
	job.stats.HTTPReqDuration.Med = sorted[n/2]
	job.stats.HTTPReqDuration.P90 = sorted[int(float64(n)*0.9)]
	job.stats.HTTPReqDuration.P95 = sorted[int(float64(n)*0.95)]

	sum := 0.0
	for _, v := range sorted {
		sum += v
	}
	job.stats.HTTPReqDuration.Avg = sum / float64(n)
}

func (m *SimulationManager) Stop(projectID string) {
	m.mu.Lock()
	job, exists := m.jobs[projectID]
	if exists {
		close(job.cancelCh)
		delete(m.jobs, projectID)
	}
	m.mu.Unlock()

	if exists {
		job.vuWg.Wait()
		// Disconnect protocol clients
		if job.mqttClient != nil {
			job.mqttClient.Disconnect()
		}
		if job.wsClient != nil {
			job.wsClient.Disconnect()
		}
		log.Printf("[SIM] Simulation stopped for project %s", projectID)
	}
}

func (m *SimulationManager) IsRunning(projectID string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	_, exists := m.jobs[projectID]
	return exists
}

func (m *SimulationManager) GetStats(projectID string) *SimulationStats {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if job, exists := m.jobs[projectID]; exists {
		// Return a copy
		s := *job.stats
		return &s
	}
	return nil
}

// --- Helper functions ---

func loadCSV(filePath string) ([]map[string]string, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	reader := csv.NewReader(f)
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true

	headers, err := reader.Read()
	if err != nil {
		return nil, err
	}
	for i, h := range headers {
		headers[i] = strings.TrimSpace(h)
	}

	var rows []map[string]string
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}
		row := make(map[string]string)
		for i, val := range record {
			if i < len(headers) {
				row[headers[i]] = strings.TrimSpace(val)
			}
		}
		rows = append(rows, row)
	}
	return rows, nil
}

func unflattenRow(row map[string]string) map[string]interface{} {
	result := make(map[string]interface{})
	for key, val := range row {
		parsed := parseValue(val)
		parts := strings.Split(key, ".")
		current := result
		for i, part := range parts {
			if i == len(parts)-1 {
				current[part] = parsed
			} else {
				if _, ok := current[part]; !ok {
					current[part] = make(map[string]interface{})
				}
				if m, ok := current[part].(map[string]interface{}); ok {
					current = m
				}
			}
		}
	}
	return result
}

func parseValue(val string) interface{} {
	if f, err := strconv.ParseFloat(val, 64); err == nil {
		return f
	}
	if val == "true" {
		return true
	}
	if val == "false" {
		return false
	}
	return val
}

func mergeDeep(base, overlay map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{})
	for k, v := range base {
		result[k] = v
	}
	for k, v := range overlay {
		if vm, ok := v.(map[string]interface{}); ok {
			if bm, ok := result[k].(map[string]interface{}); ok {
				result[k] = mergeDeep(bm, vm)
				continue
			}
		}
		result[k] = v
	}
	return result
}

func generatePayload(fields []PayloadField, chaosMode bool, chaosProbability float64, chaosFields []string) map[string]interface{} {
	result := make(map[string]interface{})
	for _, f := range fields {
		if f.Type == "object" && len(f.Children) > 0 {
			result[f.Name] = generatePayload(f.Children, chaosMode, chaosProbability, chaosFields)
			continue
		}

		var val interface{}
		switch f.Mode {
		case "static":
			val = f.Value
		case "random":
			minV := 0.0
			maxV := 100.0
			if f.Min != nil {
				minV = *f.Min
			}
			if f.Max != nil {
				maxV = *f.Max
			}
			switch f.Type {
			case "Number":
				val = math.Round((minV+rand.Float64()*(maxV-minV))*100) / 100
			case "Boolean":
				val = rand.Float64() > 0.5
			default:
				val = fmt.Sprintf("random_%d", rand.Intn(10000))
			}
		case "timestamp":
			val = time.Now().Format(time.RFC3339)
		case "incremental":
			val = time.Now().UnixMilli()
		default:
			val = f.Value
		}

		// Apply chaos
		if chaosMode && rand.Float64() < chaosProbability {
			isChaosField := len(chaosFields) == 0
			for _, cf := range chaosFields {
				if cf == f.Name {
					isChaosField = true
					break
				}
			}
			if isChaosField {
				switch v := val.(type) {
				case float64:
					val = v * (5 + rand.Float64()*10) // spike
				case bool:
					val = !v // invert
				}
			}
		}

		result[f.Name] = val
	}
	return result
}

func injectSwarmID(payload map[string]interface{}, vuID int) {
	for key, val := range payload {
		lk := strings.ToLower(key)
		if lk == "device_id" || lk == "deviceid" || lk == "id" {
			if s, ok := val.(string); ok {
				payload[key] = fmt.Sprintf("%s-VU-%d", s, vuID)
			}
		} else if m, ok := val.(map[string]interface{}); ok {
			injectSwarmID(m, vuID)
		}
	}
}

func sendHTTP(project *database.Project, payload map[string]interface{}) (int, bool, error) {
	body, _ := json.Marshal(payload)

	scheme := "http"
	if strings.ToUpper(project.Protocol) == "HTTPS" {
		scheme = "https"
	}

	port := 80
	if project.Port != nil {
		port = *project.Port
	}
	endpoint := "/"
	if project.Endpoint != nil {
		endpoint = *project.Endpoint
	}

	url := fmt.Sprintf("%s://%s:%d%s", scheme, project.Host, port, endpoint)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return 0, false, err
	}
	req.Header.Set("Content-Type", "application/json")

	if project.AuthToken != nil && *project.AuthToken != "" {
		req.Header.Set("Authorization", "Bearer "+*project.AuthToken)
	}

	// Parse custom headers
	if project.Headers != nil && *project.Headers != "" {
		var headers []struct {
			Key   string `json:"key"`
			Value string `json:"value"`
		}
		json.Unmarshal([]byte(*project.Headers), &headers)
		for _, h := range headers {
			req.Header.Set(h.Key, h.Value)
		}
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return 0, false, err
	}
	defer resp.Body.Close()

	success := resp.StatusCode >= 200 && resp.StatusCode < 400
	return resp.StatusCode, success, nil
}

func ptrStr(s *string, fallback string) string {
	if s != nil {
		return *s
	}
	return fallback
}

func intPtr(i int) *int {
	return &i
}
