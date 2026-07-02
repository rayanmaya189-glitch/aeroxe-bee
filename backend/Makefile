.PHONY: build run run-build

BINARY_NAME=server
MAIN_PKG=./cmd/server

build:
	go build -o $(BINARY_NAME) $(MAIN_PKG)

run:
	./$(BINARY_NAME)

run-build: build run
