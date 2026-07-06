package services

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/aeroxe-bee/backend/internal/models"
)

type TemplateService struct {
	db DatabaseQuerier
}

func NewTemplateService(db DatabaseQuerier) *TemplateService {
	return &TemplateService{db: db}
}

func (s *TemplateService) Create(ctx context.Context, tpl *models.Template) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO templates (account_id, name, body, variables, approval_status, created_at)
		 VALUES ($1, $2, $3, $4, $5, NOW())`,
		tpl.AccountID, tpl.Name, tpl.Body, tpl.Variables, tpl.ApprovalStatus)
	return err
}

func (s *TemplateService) GetByID(ctx context.Context, id string) (*models.Template, error) {
	tpl := &models.Template{}
	err := s.db.QueryRow(ctx,
		`SELECT id, account_id, name, body, variables, approval_status, approved_at, created_at
		 FROM templates WHERE id = $1`, id,
	).Scan(&tpl.ID, &tpl.AccountID, &tpl.Name, &tpl.Body, &tpl.Variables,
		&tpl.ApprovalStatus, &tpl.ApprovedAt, &tpl.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, err
	}
	return tpl, nil
}

func (s *TemplateService) CountByAccount(ctx context.Context, accountID string) (int, error) {
	var count int
	err := s.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM templates WHERE account_id = $1`, accountID).Scan(&count)
	return count, err
}

func (s *TemplateService) ListByAccount(ctx context.Context, accountID string) ([]models.Template, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, account_id, name, body, variables, approval_status, approved_at, created_at
		 FROM templates WHERE account_id = $1 ORDER BY created_at DESC`, accountID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var templates []models.Template
	for rows.Next() {
		var t models.Template
		if err := rows.Scan(&t.ID, &t.AccountID, &t.Name, &t.Body, &t.Variables,
			&t.ApprovalStatus, &t.ApprovedAt, &t.CreatedAt); err != nil {
			return nil, err
		}
		templates = append(templates, t)
	}
	return templates, nil
}

func (s *TemplateService) Approve(ctx context.Context, id string) error {
	now := time.Now()
	_, err := s.db.Exec(ctx,
		`UPDATE templates SET approval_status='approved', approved_at=$1 WHERE id=$2`, now, id)
	return err
}

func (s *TemplateService) Reject(ctx context.Context, id string) error {
	_, err := s.db.Exec(ctx,
		`UPDATE templates SET approval_status='rejected' WHERE id=$1`, id)
	return err
}

func (s *TemplateService) Update(ctx context.Context, tpl *models.Template) error {
	_, err := s.db.Exec(ctx,
		`UPDATE templates SET name=$1, body=$2, variables=$3 WHERE id=$4 AND account_id=$5`,
		tpl.Name, tpl.Body, tpl.Variables, tpl.ID, tpl.AccountID)
	return err
}

func (s *TemplateService) Delete(ctx context.Context, id string) error {
	_, err := s.db.Exec(ctx, `DELETE FROM templates WHERE id=$1`, id)
	return err
}

func (s *TemplateService) RenderTemplate(body string, variables map[string]string) string {
	result := body
	for key, val := range variables {
		placeholder := fmt.Sprintf("{{%s}}", key)
		result = replaceAll(result, placeholder, val)
	}
	return result
}

func replaceAll(s, old, new string) string {
	result := make([]byte, 0, len(s))
	i := 0
	for j := 0; j <= len(s)-len(old); {
		if s[j:j+len(old)] == old {
			result = append(result, []byte(new)...)
			j += len(old)
			i = j
		} else {
			result = append(result, s[j])
			j++
			i = j
		}
	}
	result = append(result, s[i:]...)
	return string(result)
}
