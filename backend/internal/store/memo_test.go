package store

import "testing"

func TestIsUUID(t *testing.T) {
	tests := []struct {
		id   string
		want bool
	}{
		{id: "11111111-1111-1111-1111-111111111111", want: true},
		{id: "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE", want: true},
		{id: "not-a-uuid", want: false},
		{id: "", want: false},
		{id: "11111111111111111111111111111111", want: false},
	}
	for _, tt := range tests {
		if got := isUUID(tt.id); got != tt.want {
			t.Errorf("isUUID(%q) = %v, want %v", tt.id, got, tt.want)
		}
	}
}
