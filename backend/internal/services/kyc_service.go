package services

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/aeroxe-bee/backend/internal/models"
)

type KycService struct {
	db DatabaseQuerier
}

func NewKycService(db DatabaseQuerier) *KycService {
	return &KycService{db: db}
}

func (s *KycService) GetByAccountID(ctx context.Context, accountID string) (*models.KycRecord, error) {
	k := &models.KycRecord{}
	err := s.db.QueryRow(ctx,
		`SELECT id, account_id, full_name, document_type, document_number, document_url,
		        status, reviewed_by, reviewed_at, review_notes, created_at, updated_at
		 FROM kyc_records WHERE account_id = $1 ORDER BY created_at DESC LIMIT 1`, accountID,
	).Scan(&k.ID, &k.AccountID, &k.FullName, &k.DocumentType, &k.DocumentNumber,
		&k.DocumentURL, &k.Status, &k.ReviewedBy, &k.ReviewedAt, &k.ReviewNotes,
		&k.CreatedAt, &k.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return k, err
}

func (s *KycService) Create(ctx context.Context, k *models.KycRecord) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO kyc_records (account_id, full_name, document_type, document_number, document_url, status)
		 VALUES ($1, $2, $3, $4, $5, 'pending')`,
		k.AccountID, k.FullName, k.DocumentType, k.DocumentNumber, k.DocumentURL)
	return err
}

func (s *KycService) Update(ctx context.Context, k *models.KycRecord) error {
	_, err := s.db.Exec(ctx,
		`UPDATE kyc_records SET full_name=$2, document_type=$3, document_number=$4, document_url=$5, updated_at=NOW()
		 WHERE id=$1`, k.ID, k.FullName, k.DocumentType, k.DocumentNumber, k.DocumentURL)
	return err
}

func (s *KycService) Approve(ctx context.Context, id, reviewedBy, notes string) error {
	_, err := s.db.Exec(ctx,
		`UPDATE kyc_records SET status='approved', reviewed_by=$2, reviewed_at=NOW(), review_notes=$3, updated_at=NOW()
		 WHERE id=$1`, id, reviewedBy, notes)
	return err
}

func (s *KycService) Reject(ctx context.Context, id, reviewedBy, notes string) error {
	_, err := s.db.Exec(ctx,
		`UPDATE kyc_records SET status='rejected', reviewed_by=$2, reviewed_at=NOW(), review_notes=$3, updated_at=NOW()
		 WHERE id=$1`, id, reviewedBy, notes)
	return err
}

func (s *KycService) ListPending(ctx context.Context, offset, limit int) ([]models.KycRecord, int64, error) {
	var total int64
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM kyc_records WHERE status = 'pending'`).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := s.db.Query(ctx,
		`SELECT k.id, k.account_id, COALESCE(a.name, '') as account_name, k.full_name, k.document_type,
		        k.document_number, k.document_url, k.status, k.reviewed_by, k.reviewed_at,
		        k.review_notes, k.created_at, k.updated_at
		 FROM kyc_records k
		 LEFT JOIN accounts a ON k.account_id = a.id
		 WHERE k.status = 'pending'
		 ORDER BY k.created_at DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var records []models.KycRecord
	for rows.Next() {
		var k models.KycRecord
		if err := rows.Scan(&k.ID, &k.AccountID, &k.FullName, &k.DocumentType,
			&k.DocumentNumber, &k.DocumentURL, &k.Status, &k.ReviewedBy, &k.ReviewedAt,
			&k.ReviewNotes, &k.CreatedAt, &k.UpdatedAt); err != nil {
			continue
		}
		records = append(records, k)
	}
	return records, total, nil
}
