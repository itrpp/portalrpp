#!/bin/bash

# RPP Portal Development Script
echo "🚀 Starting RPP Portal Development Environment"
echo "=============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Function to install dependencies
install_deps() {
    echo "📦 Installing dependencies..."
    npm run install:all
    echo "✅ Dependencies installed successfully!"
}

# Function to start development servers
start_dev() {
    echo "🔧 Starting development servers..."
    npm run dev
}

# Function to build all services
build_all() {
    echo "🏗️  Building all services..."
    npm run build
    echo "✅ Build completed successfully!"
}

# Function to start with Docker
start_docker() {
    echo "🐳 Starting with Docker Compose..."
    docker-compose up --build
}

# Function to stop Docker
stop_docker() {
    echo "🛑 Stopping Docker containers..."
    docker-compose down
}

# Function to clean up
cleanup() {
    echo "🧹 Cleaning up..."
    npm run clean
    echo "✅ Cleanup completed!"
}

# Main menu
case "$1" in
    "install")
        install_deps
        ;;
    "dev")
        start_dev
        ;;
    "build")
        build_all
        ;;
    "docker")
        start_docker
        ;;
    "stop")
        stop_docker
        ;;
    "clean")
        cleanup
        ;;
    *)
        echo "Usage: $0 {install|dev|build|docker|stop|clean}"
        echo ""
        echo "Commands:"
        echo "  install  - Install all dependencies"
        echo "  dev      - Start development servers"
        echo "  build    - Build all services"
        echo "  docker   - Start with Docker Compose"
        echo "  stop     - Stop Docker containers"
        echo "  clean    - Clean up Docker containers and images"
        echo ""
        echo "Example: ./dev.sh install && ./dev.sh dev"
        exit 1
        ;;
esac 