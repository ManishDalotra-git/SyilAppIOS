#!/bin/sh

set -e

echo "========================================"
echo "XCODE CLOUD POST CLONE STARTED"
echo "========================================"

cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "Repository path:"
pwd

echo "Node version:"
node --version

echo "NPM version:"
npm --version

echo "Installing JavaScript dependencies..."
npm ci

echo "Checking WebView source files..."

test -f node_modules/react-native-webview/apple/RNCWebViewImpl.h || {
  echo "ERROR: RNCWebViewImpl.h not found"
  find node_modules/react-native-webview -maxdepth 3 -type f | head -100
  exit 1
}

echo "RNCWebViewImpl.h found successfully"

echo "Installing CocoaPods..."

cd "$CI_PRIMARY_REPOSITORY_PATH/ios"

pod install --repo-update

echo "Checking installed WebView pod..."

test -d Pods/Headers || {
  echo "ERROR: Pods headers were not created"
  exit 1
}

echo "========================================"
echo "XCODE CLOUD POST CLONE COMPLETED"
echo "========================================"