# Proto Files Usage

This library exports proto files and utilities to help you work with gRPC services.

## Available Proto Files

- `auth.proto` - Authentication service definitions
- `user.proto` - User service definitions

## Usage in Your Project

### 1. Import proto utilities

```typescript
import { 
  getProtoFiles, 
  getProtoPath, 
  PROTO_DIR, 
  AUTH_PROTO, 
  USER_PROTO 
} from '@ecom-co/grpc';

// Get path to auth.proto
const authProtoPath = getProtoPath('auth');
// or use direct constant
const authProtoPath2 = AUTH_PROTO;

// Get all proto files
const allProtoFiles = getProtoFiles();

// Get proto directory
const protoDir = PROTO_DIR;
```

### 2. Generate TypeScript definitions

```bash
# Install required dependencies
npm install --save-dev ts-proto

# Generate TypeScript from proto files
npx ts-proto \
  --path=node_modules/@ecom-co/grpc/proto \
  --outputPath=./src/generated \
  --nestJs \
  --outputServices=grpc-js \
  "node_modules/@ecom-co/grpc/proto/services/*.proto"
```

### 3. Use with @nestjs/microservices

```typescript
import { ClientOptions, Transport } from '@nestjs/microservices';
import { AUTH_PROTO } from '@ecom-co/grpc';

const authClientOptions: ClientOptions = {
  transport: Transport.GRPC,
  options: {
    package: 'auth',
    protoPath: AUTH_PROTO,
    url: 'localhost:5000',
  },
};
```

## Proto Service Definitions

### AuthService (`auth.proto`)
- `Login(LoginRequest) → AuthResponse`
- `Register(RegisterRequest) → AuthResponse`
- `RefreshToken() → AuthResponse`
- `GetProfile() → GetProfileResponse`
- `CheckAccess(CheckAccessRequest) → CheckAccessResponse`

### UserService (`user.proto`)
- `CreateUser(CreateUserRequest) → ApiResponseData`
- `GetUser(GetUserRequest) → ApiResponseData`
- `UpdateUser(UpdateUserRequest) → ApiResponseData`
- `DeleteUser(DeleteUserRequest) → ApiResponseData`
- `ListUsers(ListUsersRequest) → ApiPaginatedResponseData`
