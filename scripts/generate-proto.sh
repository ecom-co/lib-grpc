#!/bin/bash

# Script to generate TypeScript definitions from proto files
# This script can be used by consuming projects to generate their own proto definitions

set -e

PROTO_DIR="${1:-./proto}"
OUTPUT_DIR="${2:-./src/generated}"
GRPC_TOOLS_NODE_PROTOC_PLUGIN="$(npm root)/.bin/grpc_tools_node_protoc_plugin"
GRPC_TOOLS_NODE_PROTOC="$(npm root)/.bin/grpc_tools_node_protoc"

# Check if proto directory exists
if [ ! -d "$PROTO_DIR" ]; then
    echo "Proto directory $PROTO_DIR does not exist"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo "Generating TypeScript definitions from proto files..."
echo "Proto directory: $PROTO_DIR"
echo "Output directory: $OUTPUT_DIR"

# Generate TypeScript definitions using ts-proto
npx ts-proto \
    --path="$PROTO_DIR" \
    --outputPath="$OUTPUT_DIR" \
    --addGrpcMetadata \
    --addNestjsRestParameter \
    --nestJs \
    --outputServices=grpc-js \
    --outputClientImpl=grpc-web \
    --lowerCaseServiceMethods \
    --outputJsonMethods \
    --outputPartialMethods \
    --outputTypeRegistry \
    --useExactTypes=false \
    --stringEnums \
    "$PROTO_DIR/services/*.proto"

echo "Proto generation completed successfully!"
