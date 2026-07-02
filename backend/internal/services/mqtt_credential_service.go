package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/textbee/backend/internal/models"
)

type MQTTCredentialService struct {
	db DatabaseQuerier
}

func NewMQTTCredentialService(db DatabaseQuerier) *MQTTCredentialService {
	return &MQTTCredentialService{db: db}
}

func (s *MQTTCredentialService) Create(ctx context.Context, deviceID string) (*models.MQTTCredential, string, error) {
	id := uuidV4()
	username := fmt.Sprintf("device-%s", deviceID)
	password := generatePassword()

	hash := sha256.Sum256([]byte(password))
	hashHex := hex.EncodeToString(hash[:])

	cred := &models.MQTTCredential{
		ID:             id,
		DeviceID:       deviceID,
		Username:       username,
		CredentialHash: hashHex,
		IssuedAt:       time.Now(),
	}

	_, err := s.db.Exec(ctx,
		`INSERT INTO mqtt_credentials (id, device_id, username, credential_hash_or_cert_ref, issued_at)
		 VALUES ($1, $2, $3, $4, $5)`,
		cred.ID, cred.DeviceID, cred.Username, cred.CredentialHash, cred.IssuedAt)
	if err != nil {
		return nil, "", fmt.Errorf("create mqtt credential: %w", err)
	}

	return cred, password, nil
}

// CreateWithEncryptedPassword creates MQTT credentials with the deviceID as the MQTT username
// and stores an AES-256 encrypted version of the password for later decryption.
// This is used by the device login flow where the Android device authenticates directly.
func (s *MQTTCredentialService) CreateWithEncryptedPassword(ctx context.Context, deviceID string, encryptFn func([]byte) (string, error)) (*models.MQTTCredential, string, error) {
	id := uuidV4()
	username := deviceID // MQTT username = Android device ID
	password := generatePassword()

	hash := sha256.Sum256([]byte(password))
	hashHex := hex.EncodeToString(hash[:])

	// Encrypt the password with AES-256 for reversible storage
	encryptedPass, err := encryptFn([]byte(password))
	if err != nil {
		return nil, "", fmt.Errorf("encrypt mqtt password: %w", err)
	}

	cred := &models.MQTTCredential{
		ID:                id,
		DeviceID:          deviceID,
		Username:          username,
		CredentialHash:    hashHex,
		IssuedAt:          time.Now(),
		EncryptedPassword: encryptedPass,
	}

	_, err = s.db.Exec(ctx,
		`INSERT INTO mqtt_credentials (id, device_id, username, credential_hash_or_cert_ref, encrypted_password, issued_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		cred.ID, cred.DeviceID, cred.Username, cred.CredentialHash, cred.EncryptedPassword, cred.IssuedAt)
	if err != nil {
		return nil, "", fmt.Errorf("create mqtt credential: %w", err)
	}

	return cred, password, nil
}

func (s *MQTTCredentialService) RevokeByDeviceID(ctx context.Context, deviceID string) error {
	now := time.Now()
	_, err := s.db.Exec(ctx,
		`UPDATE mqtt_credentials SET revoked_at=$1 WHERE device_id=$2 AND revoked_at IS NULL`,
		now, deviceID)
	return err
}

func (s *MQTTCredentialService) GetByDeviceID(ctx context.Context, deviceID string) (*models.MQTTCredential, error) {
	cred := &models.MQTTCredential{}
	err := s.db.QueryRow(ctx,
		`SELECT id, device_id, username, credential_hash_or_cert_ref, encrypted_password, issued_at, revoked_at
		 FROM mqtt_credentials WHERE device_id=$1 AND revoked_at IS NULL
		 ORDER BY issued_at DESC LIMIT 1`, deviceID,
	).Scan(&cred.ID, &cred.DeviceID, &cred.Username, &cred.CredentialHash, &cred.EncryptedPassword, &cred.IssuedAt, &cred.RevokedAt)
	if err != nil {
		return nil, nil
	}
	return cred, nil
}

func uuidV4() string {
	b := make([]byte, 16)
	rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

func generatePassword() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}
