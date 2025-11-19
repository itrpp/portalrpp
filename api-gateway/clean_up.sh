#!/bin/bash

# Check if .env file exists
if [ -f .env ]; then
  # Read all variables from the .env file
  while IFS= read -r line; do
    # Skip comments and empty lines
    if [[ "$line" =~ ^[a-zA-Z_][a-zA-Z0-9_]*= ]]; then
      var=$(echo "$line" | cut -d= -f1) # Extract variable name
      unset "$var"                      # Unset the variable
      echo "Unset $var"
    fi
  done < .env
else
  echo ".env file not found. Nothing to unset."
fi