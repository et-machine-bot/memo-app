package handler

import "errors"

var (
	errContentRequired = errors.New("content is required")
	errContentTooLong  = errors.New("content must be at most 10000 characters")
)
