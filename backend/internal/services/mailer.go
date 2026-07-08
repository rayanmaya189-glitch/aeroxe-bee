package services

import (
	"fmt"
	"net/smtp"

	"github.com/aeroxe-bee/backend/internal/config"
)

type Mailer struct {
	cfg config.SMTPConfig
}

func NewMailer(cfg config.SMTPConfig) *Mailer {
	return &Mailer{cfg: cfg}
}

func (m *Mailer) Send(to, subject, body string) error {
	auth := smtp.PlainAuth("", m.cfg.Username, m.cfg.Password, m.cfg.Host)

	msg := fmt.Sprintf("From: %s <%s>\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s",
		m.cfg.FromName, m.cfg.FromAddr, to, subject, body)

	addr := fmt.Sprintf("%s:%d", m.cfg.Host, m.cfg.Port)
	return smtp.SendMail(addr, auth, m.cfg.FromAddr, []string{to}, []byte(msg))
}

func (m *Mailer) SendPasswordReset(to, resetLink string) error {
	subject := "Reset your password"
	body := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
	<h2>Password Reset Request</h2>
	<p>You have requested to reset your password. Click the button below to proceed:</p>
	<p style="text-align: center; margin: 30px 0;">
		<a href="%s" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
	</p>
	<p>This link will expire in 1 hour.</p>
	<p>If you did not request a password reset, please ignore this email.</p>
	<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
	<p style="color: #6b7280; font-size: 12px;">This is an automated message. Please do not reply.</p>
</body>
</html>`, resetLink)

	return m.Send(to, subject, body)
}

func (m *Mailer) SendPasswordResetSuccess(to string) error {
	subject := "Your password has been reset"
	body := `<p>Your password has been successfully reset.</p><p>If you did not make this change, please contact support immediately.</p>`
	return m.Send(to, subject, body)
}
