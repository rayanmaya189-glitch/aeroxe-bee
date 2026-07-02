package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/textbee/backend/internal/models"
)

// UserService handles staff/admin user operations
type UserService struct {
	db DatabaseQuerier
}

func NewUserService(db DatabaseQuerier) *UserService {
	return &UserService{db: db}
}

// UserFilterOptions for server-side filtering and pagination
type UserFilterOptions struct {
	Search    string
	Role      string
	Status    string
	SortBy    string
	SortOrder string
	Page      int
	PageSize  int
}

// ListUsers returns paginated, filtered users
func (s *UserService) ListUsers(ctx context.Context, opts UserFilterOptions) (*models.PaginatedResponse[models.User], error) {
	if opts.Page < 1 {
		opts.Page = 1
	}
	if opts.PageSize < 1 || opts.PageSize > 100 {
		opts.PageSize = 20
	}
	offset := (opts.Page - 1) * opts.PageSize

	// Build WHERE clause
	var conditions []string
	var args []interface{}
	argIdx := 1

	if opts.Search != "" {
		conditions = append(conditions, fmt.Sprintf("(LOWER(name) LIKE $%d OR LOWER(email) LIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+strings.ToLower(opts.Search)+"%")
		argIdx++
	}
	if opts.Role != "" {
		conditions = append(conditions, fmt.Sprintf("role = $%d", argIdx))
		args = append(args, opts.Role)
		argIdx++
	}
	if opts.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, opts.Status)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM users %s", whereClause)
	var total int64
	if err := s.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count users: %w", err)
	}

	// Sort
	sortBy := "created_at"
	if opts.SortBy != "" {
		allowed := map[string]bool{"name": true, "email": true, "role": true, "status": true, "created_at": true, "last_login": true}
		if allowed[opts.SortBy] {
			sortBy = opts.SortBy
		}
	}
	sortOrder := "DESC"
	if opts.SortOrder == "asc" {
		sortOrder = "ASC"
	}

	// Query
	query := fmt.Sprintf(
		`SELECT id, name, email, password_hash, role, status, avatar, last_login, created_at, updated_at
		 FROM users %s ORDER BY %s %s LIMIT $%d OFFSET $%d`,
		whereClause, sortBy, sortOrder, argIdx, argIdx+1,
	)
	args = append(args, opts.PageSize, offset)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query users: %w", err)
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.Status,
			&u.Avatar, &u.LastLogin, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, u)
	}

	totalPages := int(total) / opts.PageSize
	if int(total)%opts.PageSize > 0 {
		totalPages++
	}

	return &models.PaginatedResponse[models.User]{
		Data:       users,
		Total:      total,
		Page:       opts.Page,
		PageSize:   opts.PageSize,
		TotalPages: totalPages,
	}, nil
}

// GetByID returns a user by ID
func (s *UserService) GetByID(ctx context.Context, id string) (*models.User, error) {
	u := &models.User{}
	err := s.db.QueryRow(ctx,
		`SELECT id, name, email, password_hash, role, status, avatar, last_login, created_at, updated_at
		 FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.Status,
		&u.Avatar, &u.LastLogin, &u.CreatedAt, &u.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	return u, nil
}

// GetByEmail returns a user by email
func (s *UserService) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	u := &models.User{}
	err := s.db.QueryRow(ctx,
		`SELECT id, name, email, password_hash, role, status, avatar, last_login, created_at, updated_at
		 FROM users WHERE email = $1`, email,
	).Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.Status,
		&u.Avatar, &u.LastLogin, &u.CreatedAt, &u.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, fmt.Errorf("get user by email: %w", err)
	}
	return u, nil
}

// Create creates a new staff user
func (s *UserService) Create(ctx context.Context, user *models.User) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO users (name, email, password_hash, role, status, avatar)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		user.Name, user.Email, user.PasswordHash, user.Role, user.Status, user.Avatar)
	return err
}

// Update updates a user
func (s *UserService) Update(ctx context.Context, user *models.User) error {
	_, err := s.db.Exec(ctx,
		`UPDATE users SET name=$1, role=$2, status=$3, avatar=$4, updated_at=NOW()
		 WHERE id=$5`,
		user.Name, user.Role, user.Status, user.Avatar, user.ID)
	return err
}

// UpdateLastLogin updates the last login timestamp
func (s *UserService) UpdateLastLogin(ctx context.Context, id string) error {
	_, err := s.db.Exec(ctx, `UPDATE users SET last_login=$1, updated_at=NOW() WHERE id=$2`, time.Now(), id)
	return err
}

// Delete deletes a user
func (s *UserService) Delete(ctx context.Context, id string) error {
	_, err := s.db.Exec(ctx, `DELETE FROM users WHERE id=$1`, id)
	return err
}

// BulkDelete deletes multiple users
func (s *UserService) BulkDelete(ctx context.Context, ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	// Build placeholders
	placeholders := make([]string, len(ids))
	args := make([]interface{}, len(ids))
	for i, id := range ids {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}
	query := fmt.Sprintf("DELETE FROM users WHERE id IN (%s)", strings.Join(placeholders, ","))
	_, err := s.db.Exec(ctx, query, args...)
	return err
}

// BulkUpdate updates multiple users
func (s *UserService) BulkUpdate(ctx context.Context, ids []string, updates map[string]interface{}) error {
	if len(ids) == 0 {
		return nil
	}

	setClauses := []string{}
	args := []interface{}{}
	argIdx := 1

	for field, value := range updates {
		allowed := map[string]bool{"role": true, "status": true}
		if allowed[field] {
			setClauses = append(setClauses, fmt.Sprintf("%s = $%d", field, argIdx))
			args = append(args, value)
			argIdx++
		}
	}

	if len(setClauses) == 0 {
		return nil
	}

	placeholders := make([]string, len(ids))
	for i, id := range ids {
		placeholders[i] = fmt.Sprintf("$%d", argIdx)
		args = append(args, id)
		argIdx++
	}

	query := fmt.Sprintf("UPDATE users SET %s, updated_at = NOW() WHERE id IN (%s)",
		strings.Join(setClauses, ", "), strings.Join(placeholders, ","))
	_, err := s.db.Exec(ctx, query, args...)
	return err
}

// LogActivity writes an entry to the activity_log table
func (s *UserService) LogActivity(ctx context.Context, userID, action, resourceType, resourceID, description string) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO activity_log (user_id, action, resource_type, resource_id, description)
		 VALUES ($1, $2, $3, $4, $5)`,
		userID, action, resourceType, resourceID, description)
	return err
}

// ListActivityLog returns paginated activity log entries
func (s *UserService) ListActivityLog(ctx context.Context, offset, limit int) ([]models.ActivityLog, int, error) {
	var total int64
	err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM activity_log`).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count activity_log: %w", err)
	}

	rows, err := s.db.Query(ctx,
		`SELECT id, user_id, action, resource_type, resource_id, description, created_at
		 FROM activity_log ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
		limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("query activity_log: %w", err)
	}
	defer rows.Close()

	var entries []models.ActivityLog
	for rows.Next() {
		var entry models.ActivityLog
		if err := rows.Scan(&entry.ID, &entry.UserID, &entry.Action, &entry.Resource,
			&entry.ResourceID, &entry.Details, &entry.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan activity_log: %w", err)
		}
		entries = append(entries, entry)
	}

	return entries, int(total), nil
}
