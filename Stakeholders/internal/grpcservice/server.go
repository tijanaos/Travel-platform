package grpcservice

import (
	"context"
	"fmt"
	"log"
	"net"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/tijanaos/Stakeholders/internal/repository"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Message types matching user.proto definitions.
type GetUsernameRequest struct {
	UserId int64
}

type GetUsernameResponse struct {
	Username string
}

type ValidateTokenRequest struct {
	Token string
}

type ValidateTokenResponse struct {
	UserId   int64
	Username string
}

type UserGrpcServer struct {
	userRepo  *repository.UserRepository
	jwtSecret string
}

type UserServiceServer interface {
	getUsernameById(context.Context, *GetUsernameRequest) (*GetUsernameResponse, error)
	validateToken(context.Context, *ValidateTokenRequest) (*ValidateTokenResponse, error)
}

func NewUserGrpcServer(userRepo *repository.UserRepository, jwtSecret string) *UserGrpcServer {
	return &UserGrpcServer{userRepo: userRepo, jwtSecret: jwtSecret}
}

func (s *UserGrpcServer) getUsernameById(ctx context.Context, req *GetUsernameRequest) (*GetUsernameResponse, error) {
	user, err := s.userRepo.FindByID(uint(req.UserId))
	if err != nil {
		return &GetUsernameResponse{Username: fmt.Sprintf("user-%d", req.UserId)}, nil
	}
	return &GetUsernameResponse{Username: user.Username}, nil
}

func (s *UserGrpcServer) validateToken(ctx context.Context, req *ValidateTokenRequest) (*ValidateTokenResponse, error) {
	tokenStr := strings.TrimPrefix(req.Token, "Bearer ")

	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(s.jwtSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, status.Error(codes.Unauthenticated, "invalid or expired token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, "invalid token claims")
	}

	userIDFloat, ok := claims["user_id"].(float64)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, "invalid user_id in token")
	}

	username, _ := claims["username"].(string)
	return &ValidateTokenResponse{
		UserId:   int64(userIDFloat),
		Username: username,
	}, nil
}

// userServiceDesc matches the service descriptor defined in user.proto.
var userServiceDesc = grpc.ServiceDesc{
	ServiceName: "user.UserService",
	HandlerType: (*UserServiceServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "GetUsernameById",
			Handler:    getUsernameByIdHandler,
		},
		{
			MethodName: "ValidateToken",
			Handler:    validateTokenHandler,
		},
	},
	Streams: []grpc.StreamDesc{},
}

func getUsernameByIdHandler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	req := &GetUsernameRequest{}
	if err := dec(req); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(UserServiceServer).getUsernameById(ctx, req)
	}
	info := &grpc.UnaryServerInfo{Server: srv, FullMethod: "/user.UserService/GetUsernameById"}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(UserServiceServer).getUsernameById(ctx, req.(*GetUsernameRequest))
	}
	return interceptor(ctx, req, info, handler)
}

func validateTokenHandler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	req := &ValidateTokenRequest{}
	if err := dec(req); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(UserServiceServer).validateToken(ctx, req)
	}
	info := &grpc.UnaryServerInfo{Server: srv, FullMethod: "/user.UserService/ValidateToken"}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(UserServiceServer).validateToken(ctx, req.(*ValidateTokenRequest))
	}
	return interceptor(ctx, req, info, handler)
}

func StartGrpcServer(userRepo *repository.UserRepository, jwtSecret string, port string) {
	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("grpc: failed to listen on port %s: %v", port, err)
	}

	srv := grpc.NewServer()
	userServer := NewUserGrpcServer(userRepo, jwtSecret)
	srv.RegisterService(&userServiceDesc, userServer)

	log.Printf("gRPC server listening on port %s", port)
	if err := srv.Serve(lis); err != nil {
		log.Fatalf("grpc: failed to serve: %v", err)
	}
}
