#!/bin/sh

set -e
set -x

echo "========================================"
echo "XCODE CLOUD POST CLONE STARTED"
echo "========================================"

# Homebrew paths available on Apple Silicon and Intel Macs
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export HOMEBREW_NO_AUTO_UPDATE=1

cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "Repository path:"
pwd

echo "Current PATH:"
echo "$PATH"

# -----------------------------------------
# Install Node.js when unavailable
# -----------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Installing with Homebrew..."

  if command -v brew >/dev/null 2>&1; then
    brew install node
  elif [ -x "/opt/homebrew/bin/brew" ]; then
    /opt/homebrew/bin/brew install node
  elif [ -x "/usr/local/bin/brew" ]; then
    /usr/local/bin/brew install node
  else
    echo "ERROR: Homebrew was not found"
    exit 1
  fi
fi

# Refresh PATH after Node installation
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

echo "Node version:"
node --version

echo "NPM version:"
npm --version

# -----------------------------------------
# Install JavaScript packages
# -----------------------------------------
echo "Installing JavaScript dependencies..."
npm ci

# -----------------------------------------
# Verify react-native-webview files
# -----------------------------------------
echo "Checking WebView source files..."

if [ ! -f "node_modules/react-native-webview/apple/RNCWebViewImpl.h" ]; then
  echo "ERROR: RNCWebViewImpl.h not found"

  find node_modules/react-native-webview \
    -maxdepth 3 \
    -type f | head -100

  exit 1
fi

echo "RNCWebViewImpl.h found successfully"

# -----------------------------------------
# Install CocoaPods when unavailable
# -----------------------------------------
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"

if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods not found. Installing with Homebrew..."

  if command -v brew >/dev/null 2>&1; then
    brew install cocoapods
  elif [ -x "/opt/homebrew/bin/brew" ]; then
    /opt/homebrew/bin/brew install cocoapods
  elif [ -x "/usr/local/bin/brew" ]; then
    /usr/local/bin/brew install cocoapods
  else
    echo "ERROR: Homebrew was not found"
    exit 1
  fi
fi

echo "CocoaPods version:"
pod --version

echo "Installing CocoaPods dependencies..."
pod install --repo-update

echo "Checking installed Pods..."

if [ ! -d "Pods" ]; then
  echo "ERROR: Pods directory was not created"
  exit 1
fi

echo "========================================"
echo "XCODE CLOUD POST CLONE COMPLETED"
echo "========================================"