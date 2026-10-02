package handler

import (
	"errors"
	"strings"
	"testing"
)

func TestNormalizeContent(t *testing.T) {
	long := strings.Repeat("あ", maxContentLength)

	tests := []struct {
		name    string
		in      string
		want    string
		wantErr error
	}{
		{name: "trims ends", in: "  hello \n", want: "hello"},
		{name: "keeps internal space", in: "a  b", want: "a  b"},
		{name: "empty", in: "", wantErr: errContentRequired},
		{name: "whitespace", in: " \t\n", wantErr: errContentRequired},
		{name: "max length", in: long, want: long},
		{name: "too long", in: long + "x", wantErr: errContentTooLong},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := normalizeContent(tt.in)
			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("err %v, want %v", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if got != tt.want {
				t.Fatalf("got %q, want %q", got, tt.want)
			}
		})
	}
}
