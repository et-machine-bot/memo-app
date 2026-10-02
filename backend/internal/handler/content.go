package handler

import (
	"strings"
	"unicode/utf8"
)

const maxContentLength = 10000

// normalizeContent trims content and enforces the API rules.
// The database only rejects blank text; length is checked here.
func normalizeContent(raw string) (string, error) {
	content := strings.TrimSpace(raw)
	if content == "" {
		return "", errContentRequired
	}
	if utf8.RuneCountInString(content) > maxContentLength {
		return "", errContentTooLong
	}
	return content, nil
}
