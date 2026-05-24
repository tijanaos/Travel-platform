package grpcservice

import (
	"context"
	"fmt"
	"log"
	"net"

	"github.com/tijanaos/Stakeholders/internal/repository"
	"google.golang.org/grpc"
)

// Message types matching user.proto definitions.
type GetUsernameRequest struct {
	UserId int64
}

type GetUsernameResponse struct {
	Username string
}

type UserGrpcServer struct {
	userRepo *repository.UserRepository
}

type UserServiceServer interface {
	getUsernameById(context.Context, *GetUsernameRequest) (*GetUsernameResponse, error)
}

func NewUserGrpcServer(userRepo *repository.UserRepository) *UserGrpcServer {
	return &UserGrpcServer{userRepo: userRepo}
}

func (s *UserGrpcServer) getUsernameById(ctx context.Context, req *GetUsernameRequest) (*GetUsernameResponse, error) {
	user, err := s.userRepo.FindByID(uint(req.UserId))
	if err != nil {
		return &GetUsernameResponse{Username: fmt.Sprintf("user-%d", req.UserId)}, nil
	}
	return &GetUsernameResponse{Username: user.Username}, nil
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
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/user.UserService/GetUsernameById",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(UserServiceServer).getUsernameById(ctx, req.(*GetUsernameRequest))
	}
	return interceptor(ctx, req, info, handler)
}

func StartGrpcServer(userRepo *repository.UserRepository, port string) {
	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("grpc: failed to listen on port %s: %v", port, err)
	}

	srv := grpc.NewServer()
	userServer := NewUserGrpcServer(userRepo)
	srv.RegisterService(&userServiceDesc, userServer)

	log.Printf("gRPC server listening on port %s", port)
	if err := srv.Serve(lis); err != nil {
		log.Fatalf("grpc: failed to serve: %v", err)
	}
}
