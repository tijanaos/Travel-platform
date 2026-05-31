package grpcservice

import (
	"encoding/binary"
	"fmt"

	"google.golang.org/grpc/encoding"
)

func init() {
	encoding.RegisterCodec(ProtoCodec{})
}

// ProtoCodec manually encodes/decodes protobuf wire format without generated code.
type ProtoCodec struct{}

func (ProtoCodec) Name() string { return "proto" }

func (ProtoCodec) Marshal(v interface{}) ([]byte, error) {
	switch msg := v.(type) {
	case *GetUsernameResponse:
		return marshalGetUsernameResponse(msg)
	case *ValidateTokenResponse:
		return marshalValidateTokenResponse(msg)
	default:
		return nil, fmt.Errorf("codec: unsupported type %T", v)
	}
}

func (ProtoCodec) Unmarshal(data []byte, v interface{}) error {
	switch msg := v.(type) {
	case *GetUsernameRequest:
		return unmarshalGetUsernameRequest(data, msg)
	case *ValidateTokenRequest:
		return unmarshalValidateTokenRequest(data, msg)
	default:
		return fmt.Errorf("codec: unsupported type %T", v)
	}
}

// marshalGetUsernameResponse encodes field 1 (string username) in protobuf wire format.
func marshalGetUsernameResponse(msg *GetUsernameResponse) ([]byte, error) {
	if msg.Username == "" {
		return []byte{}, nil
	}
	usernameBytes := []byte(msg.Username)
	// field 1, wire type 2 (length-delimited)
	tag := byte((1 << 3) | 2)
	length := len(usernameBytes)
	buf := make([]byte, 0, 1+binary.MaxVarintLen64+length)
	buf = append(buf, tag)
	buf = appendVarint(buf, uint64(length))
	buf = append(buf, usernameBytes...)
	return buf, nil
}

// unmarshalGetUsernameRequest decodes field 1 (int64 user_id) from protobuf wire format.
func unmarshalGetUsernameRequest(data []byte, msg *GetUsernameRequest) error {
	i := 0
	for i < len(data) {
		tagByte, n := decodeVarint(data[i:])
		if n == 0 {
			return fmt.Errorf("codec: failed to decode tag")
		}
		i += n
		fieldNum := tagByte >> 3
		wireType := tagByte & 0x7

		switch fieldNum {
		case 1: // user_id, varint
			if wireType != 0 {
				return fmt.Errorf("codec: wrong wire type for user_id")
			}
			val, n2 := decodeVarint(data[i:])
			if n2 == 0 {
				return fmt.Errorf("codec: failed to decode user_id")
			}
			i += n2
			msg.UserId = int64(val)
		default:
			// skip unknown fields
			n2, err := skipField(data[i:], wireType)
			if err != nil {
				return err
			}
			i += n2
		}
	}
	return nil
}

func appendVarint(buf []byte, v uint64) []byte {
	tmp := make([]byte, binary.MaxVarintLen64)
	n := binary.PutUvarint(tmp, v)
	return append(buf, tmp[:n]...)
}

func decodeVarint(data []byte) (uint64, int) {
	v, n := binary.Uvarint(data)
	return v, n
}

func skipField(data []byte, wireType uint64) (int, error) {
	switch wireType {
	case 0: // varint
		_, n := decodeVarint(data)
		if n == 0 {
			return 0, fmt.Errorf("codec: failed to skip varint")
		}
		return n, nil
	case 1: // 64-bit
		return 8, nil
	case 2: // length-delimited
		length, n := decodeVarint(data)
		if n == 0 {
			return 0, fmt.Errorf("codec: failed to skip length-delimited")
		}
		return n + int(length), nil
	case 5: // 32-bit
		return 4, nil
	default:
		return 0, fmt.Errorf("codec: unsupported wire type %d", wireType)
	}
}

// marshalValidateTokenResponse encodes field 1 (int64 user_id) and field 2 (string username).
func marshalValidateTokenResponse(msg *ValidateTokenResponse) ([]byte, error) {
	var buf []byte
	if msg.UserId != 0 {
		// field 1, wire type 0 (varint)
		buf = append(buf, byte((1<<3)|0))
		buf = appendVarint(buf, uint64(msg.UserId))
	}
	if msg.Username != "" {
		usernameBytes := []byte(msg.Username)
		// field 2, wire type 2 (length-delimited)
		buf = append(buf, byte((2<<3)|2))
		buf = appendVarint(buf, uint64(len(usernameBytes)))
		buf = append(buf, usernameBytes...)
	}
	return buf, nil
}

// unmarshalValidateTokenRequest decodes field 1 (string token) from protobuf wire format.
func unmarshalValidateTokenRequest(data []byte, msg *ValidateTokenRequest) error {
	i := 0
	for i < len(data) {
		tagByte, n := decodeVarint(data[i:])
		if n == 0 {
			return fmt.Errorf("codec: failed to decode tag")
		}
		i += n
		fieldNum := tagByte >> 3
		wireType := tagByte & 0x7

		switch fieldNum {
		case 1: // token, length-delimited string
			if wireType != 2 {
				return fmt.Errorf("codec: wrong wire type for token")
			}
			length, n2 := decodeVarint(data[i:])
			if n2 == 0 {
				return fmt.Errorf("codec: failed to decode token length")
			}
			i += n2
			msg.Token = string(data[i : i+int(length)])
			i += int(length)
		default:
			n2, err := skipField(data[i:], wireType)
			if err != nil {
				return err
			}
			i += n2
		}
	}
	return nil
}
