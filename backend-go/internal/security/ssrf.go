package security

import (
	"errors"
	"fmt"
	"net"
	"net/url"
	"os"
	"strconv"
	"strings"
)

var (
	ErrDisallowedHost   = errors.New("connection to loopback, private, link-local, or cloud metadata network is blocked for security")
	ErrInvalidHost      = errors.New("invalid or empty target host")
	ErrDisallowedScheme = errors.New("unsupported or disallowed protocol scheme")
	ErrCannotResolve    = errors.New("unable to resolve target hostname")
)

// ValidateTargetHost checks if the specified host (IP or domain name) resolves to a safe, public address.
// Blocks loopback (127.0.0.0/8, ::1), private RFC1918/RFC4193, link-local (169.254/16, fe80::/10),
// cloud metadata (169.254.169.254), and carrier-grade NAT.
func ValidateTargetHost(rawHost string) error {
	trimmed := strings.TrimSpace(rawHost)
	if trimmed == "" {
		return ErrInvalidHost
	}

	// In test or air-gapped dev environments, allow internal networks if explicitly set
	if strings.ToLower(os.Getenv("ALLOW_INTERNAL_NETWORKS")) == "true" {
		return nil
	}

	// Extract host portion if port is present
	host := trimmed
	if h, _, err := net.SplitHostPort(trimmed); err == nil {
		host = h
	}

	// Strip IPv6 brackets if present
	host = strings.TrimPrefix(host, "[")
	host = strings.TrimSuffix(host, "]")
	lowerHost := strings.ToLower(host)

	// Block standard loopback and metadata hostnames immediately
	disallowedNames := []string{
		"localhost",
		"localhost.localdomain",
		"ip6-localhost",
		"ip6-loopback",
		"metadata",
		"metadata.google.internal",
		"instance-data",
	}
	for _, name := range disallowedNames {
		if lowerHost == name || strings.HasSuffix(lowerHost, "."+name) {
			return fmt.Errorf("%w: '%s'", ErrDisallowedHost, host)
		}
	}

	// If host is directly an IP literal
	if ip := net.ParseIP(host); ip != nil {
		if isDisallowedIP(ip) {
			return fmt.Errorf("%w: '%s'", ErrDisallowedHost, host)
		}
		return nil
	}

	// Resolve hostname via DNS and check every resolved IP
	ips, err := net.LookupIP(host)
	if err != nil || len(ips) == 0 {
		return fmt.Errorf("%w: '%s'", ErrCannotResolve, host)
	}

	for _, ip := range ips {
		if isDisallowedIP(ip) {
			return fmt.Errorf("%w: '%s' resolves to restricted IP %s", ErrDisallowedHost, host, ip.String())
		}
	}

	return nil
}

// ValidateBrokerURL validates full broker URLs (e.g. for MQTT inspector connections)
func ValidateBrokerURL(rawURL string) error {
	trimmed := strings.TrimSpace(rawURL)
	if trimmed == "" {
		return ErrInvalidHost
	}

	// If scheme is missing, url.Parse behaves unexpectedly; prepend tcp:// for validation
	parseTarget := trimmed
	if !strings.Contains(parseTarget, "://") {
		parseTarget = "tcp://" + parseTarget
	}

	u, err := url.Parse(parseTarget)
	if err != nil {
		return fmt.Errorf("invalid URL format: %w", err)
	}

	scheme := strings.ToLower(u.Scheme)
	allowedSchemes := map[string]bool{
		"tcp":   true,
		"ssl":   true,
		"tls":   true,
		"mqtt":  true,
		"mqtts": true,
		"ws":    true,
		"wss":   true,
	}
	if !allowedSchemes[scheme] {
		return fmt.Errorf("%w: '%s'", ErrDisallowedScheme, scheme)
	}

	hostname := u.Hostname()
	if hostname == "" {
		return ErrInvalidHost
	}

	// Validate port if specified
	if portStr := u.Port(); portStr != "" {
		port, err := strconv.Atoi(portStr)
		if err != nil || port < 1 || port > 65535 {
			return fmt.Errorf("invalid port number: '%s'", portStr)
		}
	}

	return ValidateTargetHost(hostname)
}

func isDisallowedIP(ip net.IP) bool {
	if ip == nil {
		return true
	}

	// Check if loopback (127.0.0.0/8, ::1)
	if ip.IsLoopback() {
		return true
	}

	// Check if unspecified (0.0.0.0, ::)
	if ip.IsUnspecified() {
		return true
	}

	// Check if private (RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16; RFC 4193: fc00::/7)
	if ip.IsPrivate() {
		return true
	}

	// Check link-local (169.254.0.0/16, fe80::/10)
	if ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsInterfaceLocalMulticast() {
		return true
	}

	// Normalize IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
	if ip4 := ip.To4(); ip4 != nil {
		// Cloud metadata IP: 169.254.169.254
		if ip4[0] == 169 && ip4[1] == 254 {
			return true
		}
		// 0.0.0.0/8
		if ip4[0] == 0 {
			return true
		}
		// Carrier-grade NAT (RFC 6598: 100.64.0.0/10: 100.64.0.0 - 100.127.255.255)
		if ip4[0] == 100 && (ip4[1] >= 64 && ip4[1] <= 127) {
			return true
		}
		// Broadcast
		if ip4[0] == 255 && ip4[1] == 255 && ip4[2] == 255 && ip4[3] == 255 {
			return true
		}
	}

	return false
}
