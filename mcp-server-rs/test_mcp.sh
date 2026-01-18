#!/bin/bash
# MCP E2E Test Script

BROWSEHAND="./target/release/browsehand"
TIMEOUT=5

run_mcp_test() {
    local test_name="$1"
    local request="$2"
    local expected="$3"
    
    echo "Testing: $test_name"
    
    result=$(printf '%s\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n%s\n' \
        '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' \
        "$request" | timeout $TIMEOUT $BROWSEHAND 2>/dev/null | tail -1)
    
    if echo "$result" | grep -q "$expected"; then
        echo "  ✅ PASS"
        return 0
    else
        echo "  ❌ FAIL"
        echo "  Expected: $expected"
        echo "  Got: $result"
        return 1
    fi
}

echo "=== BrowseHand MCP E2E Tests ==="
echo ""

# Test 1: tools/list
run_mcp_test "tools/list returns tools" \
    '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
    '"tools":\['

# Test 2: ping_extension (without extension - should fail gracefully)
run_mcp_test "ping_extension without extension" \
    '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"ping_extension","arguments":{}}}' \
    "not connected"

# Test 3: save_to_csv (local operation - should work)
run_mcp_test "save_to_csv creates file" \
    '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"save_to_csv","arguments":{"filename":"test_output.csv","data":[{"name":"test","value":123}]}}}' \
    "Successfully saved"

# Test 4: save_to_json (local operation - should work)
run_mcp_test "save_to_json creates file" \
    '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"save_to_json","arguments":{"filename":"test_output.json","data":{"test":true}}}}' \
    "Successfully saved"

echo ""
echo "=== Tests Complete ==="
