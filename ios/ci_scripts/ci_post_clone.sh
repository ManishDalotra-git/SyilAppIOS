#!/bin/sh

set -e
set -x

echo "========================================"
echo "XCODE CLOUD POST CLONE STARTED"
echo "========================================"

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export HOMEBREW_NO_AUTO_UPDATE=1

cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "Repository path:"
pwd

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Installing Node..."

  if command -v brew >/dev/null 2>&1; then
    brew install node
  elif [ -x "/opt/homebrew/bin/brew" ]; then
    /opt/homebrew/bin/brew install node
  elif [ -x "/usr/local/bin/brew" ]; then
    /usr/local/bin/brew install node
  else
    echo "ERROR: Homebrew not found"
    exit 1
  fi
fi

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

echo "Node version:"
node --version

echo "NPM version:"
npm --version

echo "Installing JavaScript dependencies..."
npm ci

echo "Configuring Node path for Xcode build..."

NODE_BINARY_PATH="$(command -v node)"

if [ -z "$NODE_BINARY_PATH" ]; then
  echo "ERROR: Node executable not found"
  exit 1
fi

echo "Cloud Node path: $NODE_BINARY_PATH"

cat > "$CI_PRIMARY_REPOSITORY_PATH/ios/.xcode.env.local" <<EOF
export NODE_BINARY=$NODE_BINARY_PATH
unset HERMES_CLI_PATH
EOF

echo "Checking WebView source files..."
 
if [ ! -f "node_modules/react-native-webview/apple/RNCWebViewImpl.h" ]; then
  echo "ERROR: RNCWebViewImpl.h not found"
  exit 1
fi

echo "RNCWebViewImpl.h found successfully"

cd "$CI_PRIMARY_REPOSITORY_PATH/ios"

if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods not found. Installing CocoaPods..."

  if command -v brew >/dev/null 2>&1; then
    brew install cocoapods
  elif [ -x "/opt/homebrew/bin/brew" ]; then
    /opt/homebrew/bin/brew install cocoapods
  elif [ -x "/usr/local/bin/brew" ]; then
    /usr/local/bin/brew install cocoapods
  else
    echo "ERROR: Homebrew not found"
    exit 1
  fi
fi

echo "CocoaPods version:"
pod --version

echo "Installing Pods..."
pod install --repo-update

echo "========================================"
echo "XCODE CLOUD POST CLONE COMPLETED"
echo "========================================"