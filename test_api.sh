#!/bin/bash

# Network Monitor API Test Script
echo "=== Network Monitor API Test Suite ==="
echo "Testing all API endpoints..."
echo ""

# Base URL
BASE_URL="http://localhost:3001/api"

# Test result tracking
PASSED=0
FAILED=0

# Function to test an endpoint
function test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local test_name=$5
    
    echo "Testing $test_name..."
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "%{http_code}" -o /tmp/response.json "$BASE_URL$endpoint")
    elif [ "$method" == "POST" ]; then
        response=$(curl -s -w "%{http_code}" -o /tmp/response.json -X POST -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
    elif [ "$method" == "DELETE" ]; then
        response=$(curl -s -w "%{http_code}" -o /tmp/response.json -X DELETE "$BASE_URL$endpoint")
    fi
    
    if [ "$response" == "$expected_status" ]; then
        echo "✓ $test_name: PASSED (Status: $response)"
        ((PASSED++))
    else
        echo "✗ $test_name: FAILED (Expected: $expected_status, Got: $response)"
        echo "Response Body:"
        cat /tmp/response.json
        echo ""
        ((FAILED++))
    fi
    echo ""
}

# Test Health Check
test_endpoint "GET" "/health" "" "200" "Health Check"

# Test Device Management
test_endpoint "GET" "/devices" "" "200" "Get All Devices"

# Create a test device
test_device='{"id":"test-device","type":"router","label":"Test Router","x":100,"y":200,"ports":[{"id":"test-port","name":"Port 1","type":"optical","rate":1000,"mac":"00:00:00:00:00:00","status":"up","trafficIn":0,"trafficOut":0}],"status":"up","ip":"192.168.1.100","mac":"00:11:22:33:44:55"}'
test_endpoint "POST" "/devices" "$test_device" "200" "Create Test Device"

# Note: GET /api/devices/:id is not implemented in the API
# test_endpoint "GET" "/devices/test-device" "" "200" "Get Specific Device"

# Test Connection Management
test_endpoint "GET" "/connections" "" "200" "Get All Connections"

# Create two test devices for connection testing
test_device2='{"id":"test-device2","type":"switch","label":"Test Switch","x":200,"y":300,"ports":[{"id":"test-port2","name":"Port 1","type":"electrical","rate":1000,"mac":"00:00:00:00:00:01","status":"up","trafficIn":0,"trafficOut":0}],"status":"up","ip":"192.168.1.101","mac":"00:11:22:33:44:56"}'
test_endpoint "POST" "/devices" "$test_device2" "200" "Create Test Device 2"

# Create a test connection between the two test devices
test_connection='{"id":"test-connection","source":"test-device","target":"test-device2","sourcePort":"test-port","targetPort":"test-port2","status":"up","traffic":100}'
test_endpoint "POST" "/connections" "$test_connection" "200" "Create Test Connection"

# Test Configuration Management
test_endpoint "GET" "/config" "" "200" "Get All Configurations"

test_config='{"testKey":"testValue"}'
test_endpoint "POST" "/config" "$test_config" "200" "Update Configuration"

test_endpoint "GET" "/config/testKey" "" "200" "Get Specific Configuration"

# Test Alert Management
test_endpoint "GET" "/alerts" "" "200" "Get All Alerts"

# Create a test alert
test_alert='{"deviceId":"test-device","deviceLabel":"Test Router","type":"status","message":"Test Alert","status":"up","level":"warning"}'
test_endpoint "POST" "/alerts" "$test_alert" "200" "Create Test Alert"

# Test Alert Settings
test_endpoint "GET" "/alerts/settings" "" "200" "Get All Alert Settings"

test_alert_setting='{"enabled":true}'
test_endpoint "POST" "/alerts/settings/test-device" "$test_alert_setting" "200" "Update Alert Settings"

test_endpoint "GET" "/alerts/settings/test-device" "" "200" "Get Specific Alert Settings"

# Test Delete Operations
test_endpoint "DELETE" "/connections/test-connection" "" "200" "Delete Test Connection"
test_endpoint "DELETE" "/devices/test-device" "" "200" "Delete Test Device"
test_endpoint "DELETE" "/devices/test-device2" "" "200" "Delete Test Device 2"

# Summary
echo "=== Test Summary ==="
echo "Total Tests: $((PASSED + FAILED))"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 All tests passed! API is working correctly."
    exit 0
else
    echo "❌ Some tests failed. Please check the API."
    exit 1
fi