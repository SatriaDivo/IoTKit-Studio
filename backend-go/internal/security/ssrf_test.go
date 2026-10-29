package security

import (
	"testing"
)

func TestValidateTargetHost(t *testing.T) {
	tests := []struct {
		host    string
		wantErr bool
	}{
		{"127.0.0.1", true},
		{"127.0.0.1:1883", true},
		{"localhost", true},
		{"localhost:8080", true},
		{"10.0.0.5", true},
		{"192.168.1.1", true},
		{"172.16.0.1", true},
		{"169.254.169.254", true},
		{"0.0.0.0", true},
		{"::1", true},
		{"[::1]:1883", true},
		{"metadata.google.internal", true},
		{"", true},
	}

	for _, tt := range tests {
		err := ValidateTargetHost(tt.host)
		if (err != nil) != tt.wantErr {
			t.Errorf("ValidateTargetHost(%q) error = %v, wantErr %v", tt.host, err, tt.wantErr)
		}
	}
}

func TestValidateBrokerURL(t *testing.T) {
	tests := []struct {
		url     string
		wantErr bool
	}{
		{"tcp://127.0.0.1:18830", true},
		{"ws://169.254.169.254/ws", true},
		{"http://127.0.0.1", true}, // http is disallowed scheme for broker
		{"file:///etc/passwd", true},
		{"tcp://localhost:1883", true},
	}

	for _, tt := range tests {
		err := ValidateBrokerURL(tt.url)
		if (err != nil) != tt.wantErr {
			t.Errorf("ValidateBrokerURL(%q) error = %v, wantErr %v", tt.url, err, tt.wantErr)
		}
	}
}
