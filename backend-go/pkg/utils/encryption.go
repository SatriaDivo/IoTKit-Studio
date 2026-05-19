package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"io"
	"os"
	"strings"
)

var encryptionKey []byte

// InitEncryption initializes the encryption key from environment variable
func InitEncryption() error {
	keyHex := os.Getenv("ENCRYPTION_KEY")
	if keyHex == "" {
		return errors.New("ENCRYPTION_KEY environment variable not set")
	}

	key, err := hex.DecodeString(keyHex)
	if err != nil {
		return errors.New("invalid ENCRYPTION_KEY format (must be hex)")
	}

	if len(key) != 32 {
		return errors.New("ENCRYPTION_KEY must be 32 bytes (64 hex characters)")
	}

	encryptionKey = key
	return nil
}

// Encrypt encrypts plaintext using AES-256-GCM
// Returns: "iv:encrypted:authTag" (all hex-encoded)
func Encrypt(plaintext string) (string, error) {
	if encryptionKey == nil {
		return "", errors.New("encryption not initialized")
	}

	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// Generate random IV
	iv := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return "", err
	}

	// Encrypt and get ciphertext with auth tag
	ciphertext := gcm.Seal(nil, iv, []byte(plaintext), nil)

	// Format: iv:ciphertext (ciphertext includes auth tag)
	return hex.EncodeToString(iv) + ":" + hex.EncodeToString(ciphertext), nil
}

// Decrypt decrypts ciphertext using AES-256-GCM
// Expects format: "iv:encrypted:authTag" or "iv:encryptedWithTag"
func Decrypt(encrypted string) (string, error) {
	if encryptionKey == nil {
		return "", errors.New("encryption not initialized")
	}

	parts := strings.Split(encrypted, ":")
	if len(parts) < 2 {
		return "", errors.New("invalid encrypted format")
	}

	// Decode IV
	iv, err := hex.DecodeString(parts[0])
	if err != nil {
		return "", errors.New("invalid IV format")
	}

	// Decode ciphertext (includes auth tag)
	var ciphertext []byte
	if len(parts) == 2 {
		// Format: iv:ciphertextWithTag
		ciphertext, err = hex.DecodeString(parts[1])
	} else {
		// Format: iv:ciphertext:authTag (legacy, combine them)
		ciphertextPart, err1 := hex.DecodeString(parts[1])
		authTag, err2 := hex.DecodeString(parts[2])
		if err1 != nil || err2 != nil {
			return "", errors.New("invalid ciphertext format")
		}
		ciphertext = append(ciphertextPart, authTag...)
	}

	if err != nil {
		return "", errors.New("invalid ciphertext format")
	}

	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// Decrypt
	plaintext, err := gcm.Open(nil, iv, ciphertext, nil)
	if err != nil {
		return "", errors.New("decryption failed: " + err.Error())
	}

	return string(plaintext), nil
}
