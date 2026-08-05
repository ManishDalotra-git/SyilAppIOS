#!/bin/sh

set -e

echo "========== XCODE CLOUD POST CLONE =========="

cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "Node version:"
node --version

echo "NPM version:"
npm --version

echo "Installing JavaScript dependencies..."
npm ci

echo "Installing CocoaPods dependencies..."
cd ios

rm -rf Pods

pod install --repo-update

echo "========== DEPENDENCIES INSTALLED =========="