package handlers

import (
	"net/http"
	"time"
)

// PaginationParams holds parsed pagination query parameters.
type PaginationParams struct {
	Page     int
	PageSize int
	Offset   int
}

// DateRangeFilter holds parsed date range query parameters for created_at filtering.
type DateRangeFilter struct {
	DateFrom *time.Time // inclusive
	DateTo   *time.Time // inclusive (end of day)
}

// PaginationResponse is the standard envelope for paginated list responses.
type PaginationResponse struct {
	Data       interface{} `json:"data"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
	TotalPages int         `json:"total_pages"`
}

// ParsePagination extracts page and pageSize from query params with sane defaults.
// Max pageSize is capped at the given max (use 0 to default to 100).
func ParsePagination(r *http.Request, defaultPageSize, maxPageSize int) PaginationParams {
	if maxPageSize <= 0 {
		maxPageSize = 100
	}
	page := parseIntOrDefault(r.URL.Query().Get("page"), 1)
	pageSize := parseIntOrDefault(r.URL.Query().Get("pageSize"), defaultPageSize)
	if pageSize > maxPageSize {
		pageSize = maxPageSize
	}
	offset := (page - 1) * pageSize
	return PaginationParams{Page: page, PageSize: pageSize, Offset: offset}
}

// ParseDateRange extracts date_from and date_to from query params.
// Accepted formats: "2006-01-02" or "2006-01-02T15:04:05Z".
// date_from is inclusive; date_to is extended to end-of-day (23:59:59).
func ParseDateRange(r *http.Request) DateRangeFilter {
	var f DateRangeFilter
_LAYOUT := "2006-01-02"
_LAYOUT_FULL := "2006-01-02T15:04:05"

	if v := r.URL.Query().Get("date_from"); v != "" {
		if t, err := time.Parse(_LAYOUT_FULL, v); err == nil {
			f.DateFrom = &t
		} else if t, err := time.Parse(_LAYOUT, v); err == nil {
			f.DateFrom = &t
		}
	}
	if v := r.URL.Query().Get("date_to"); v != "" {
		if t, err := time.Parse(_LAYOUT_FULL, v); err == nil {
			f.DateTo = &t
		} else if t, err := time.Parse(_LAYOUT, v); err == nil {
			// Extend to end of day
			endOfDay := t.Add(24*time.Hour - time.Nanosecond)
			f.DateTo = &endOfDay
		}
	}
	return f
}

// ToResponse wraps data into the standard paginated response envelope.
func (p PaginationParams) ToResponse(data interface{}, total int64) PaginationResponse {
	totalPages := int(total) / p.PageSize
	if int(total)%p.PageSize > 0 {
		totalPages++
	}
	return PaginationResponse{
		Data:       data,
		Total:      total,
		Page:       p.Page,
		PageSize:   p.PageSize,
		TotalPages: totalPages,
	}
}

// itoa converts an int to string for SQL parameter building (e.g. $1, $2, $3).
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	// max 4 digits is enough for parameter indices
	var buf [4]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[i:])
}

// parseIntOrDefault parses a string to int, returning defaultVal on failure or empty string.
func parseIntOrDefault(s string, defaultVal int) int {
	if s == "" {
		return defaultVal
	}
	val := 0
	for _, c := range s {
		if c >= '0' && c <= '9' {
			val = val*10 + int(c-'0')
		} else {
			return defaultVal
		}
	}
	if val == 0 {
		return defaultVal
	}
	return val
}
