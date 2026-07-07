package mqtt

import (
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
)

const mosquittoUID = 1883

// PasswordFile manages the Mosquitto password file for dynamic device user creation.
// It writes entries to the password file and signals Mosquitto to reload via SIGHUP.
type PasswordFile struct {
	path           string
	mosquittoPIDPath string
	logger         *slog.Logger
	mu             sync.Mutex
}

// NewPasswordFile creates a new PasswordFile manager.
// passwordPath: path to the Mosquitto password file (e.g., /mosquitto/auth/passwords)
// pidPath: path to the Mosquitto PID file for sending SIGHUP (e.g., /mosquitto/mosquitto.pid)
func NewPasswordFile(passwordPath, pidPath string, logger *slog.Logger) *PasswordFile {
	return &PasswordFile{
		path:           passwordPath,
		mosquittoPIDPath: pidPath,
		logger:         logger,
	}
}

// AddDeviceUser adds or updates a device user in the password file.
// It uses mosquitto_passwd to hash the password securely.
func (pf *PasswordFile) AddDeviceUser(username, password string) error {
	pf.mu.Lock()
	defer pf.mu.Unlock()

	// Ensure the directory exists
	dir := filepath.Dir(pf.path)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("create password dir: %w", err)
	}

	// Use mosquitto_passwd -b (batch mode) to add/update the user
	// -b suppresses prompts, works even if file doesn't exist yet
	args := []string{"-b", pf.path, username, password}

	cmd := exec.Command("mosquitto_passwd", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("mosquitto_passwd failed: %w (output: %s)", err, string(output))
	}

	pf.logger.Info("added MQTT user", "username", username)

	// Fix file permissions for Mosquitto (UID 1883) to read
	if err := pf.fixPermissions(); err != nil {
		return fmt.Errorf("fix permissions: %w", err)
	}

	// Signal Mosquitto to reload the password file (best-effort; in Docker,
	// an inotify watcher inside the mosquitto container handles reloading)
	if err := pf.signalReload(); err != nil {
		pf.logger.Warn("failed to signal Mosquitto reload (may need manual restart)", "error", err)
	}

	return nil
}

// RemoveDeviceUser removes a device user from the password file.
func (pf *PasswordFile) RemoveDeviceUser(username string) error {
	pf.mu.Lock()
	defer pf.mu.Unlock()

	data, err := os.ReadFile(pf.path)
	if err != nil {
		return fmt.Errorf("read password file: %w", err)
	}

	lines := strings.Split(string(data), "\n")
	var filtered []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			filtered = append(filtered, line)
			continue
		}
		parts := strings.SplitN(trimmed, ":", 2)
		if len(parts) == 2 && parts[0] != username {
			filtered = append(filtered, line)
		}
	}

	if err := os.WriteFile(pf.path, []byte(strings.Join(filtered, "\n")), 0600); err != nil {
		return fmt.Errorf("write password file: %w", err)
	}

	pf.logger.Info("removed MQTT user", "username", username)

	// Fix file permissions for Mosquitto (UID 1883) to read
	if err := pf.fixPermissions(); err != nil {
		return fmt.Errorf("fix permissions: %w", err)
	}

	if err := pf.signalReload(); err != nil {
		pf.logger.Warn("failed to signal Mosquitto reload", "error", err)
	}

	return nil
}

// signalReload sends SIGHUP to Mosquitto to reload the password/ACL files.
func (pf *PasswordFile) signalReload() error {
	if pf.mosquittoPIDPath == "" {
		return fmt.Errorf("no PID file path configured")
	}

	data, err := os.ReadFile(pf.mosquittoPIDPath)
	if err != nil {
		return fmt.Errorf("read PID file: %w", err)
	}

	pidStr := strings.TrimSpace(string(data))
	pidRe := regexp.MustCompile(`^\d+$`)
	if !pidRe.MatchString(pidStr) {
		return fmt.Errorf("invalid PID: %s", pidStr)
	}

	cmd := exec.Command("kill", "-HUP", pidStr)
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("send SIGHUP to PID %s: %w (output: %s)", pidStr, err, string(output))
	}

	pf.logger.Info("sent SIGHUP to Mosquitto", "pid", pidStr)
	return nil
}

// fixPermissions ensures the password file is readable by the mosquitto process
// (UID 1883) after the backend modifies it. mosquitto_passwd rewrites the file,
// which can reset permissions and ownership.
func (pf *PasswordFile) fixPermissions() error {
	if err := os.Chmod(pf.path, 0644); err != nil {
		return fmt.Errorf("chmod password file: %w", err)
	}
	if err := os.Chown(pf.path, mosquittoUID, mosquittoUID); err != nil {
		pf.logger.Warn("failed to chown password file to mosquitto UID (may be expected in some environments)", "error", err)
	}
	return nil
}
