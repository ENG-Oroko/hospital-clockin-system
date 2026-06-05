

echo "Testing Notification System..."
echo "=============================="

BASE_URL="http://localhost:3000"

# Test send SMS
echo -e "\n1. Sending SMS notification:"
curl -s -X POST $BASE_URL/notifications/send/sms \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-001",
    "phoneNumber": "+1234567890",
    "message": "Test SMS from hospital system"
  }' | jq '.'

# Test send Email
echo -e "\n2. Sending Email notification:"
curl -s -X POST $BASE_URL/notifications/send/email \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-001",
    "email": "user@hospital.com",
    "subject": "Test Email",
    "body": "This is a test email from the hospital system"
  }' | jq '.'

# Test get all notifications
echo -e "\n3. Getting all notifications:"
curl -s "$BASE_URL/notifications?page=1&limit=10" | jq '.'

# Test get stats
echo -e "\n4. Getting notification stats:"
curl -s "$BASE_URL/notifications/stats" | jq '.'

# Test attendance alert
echo -e "\n5. Sending attendance alert:"
curl -s -X POST $BASE_URL/notifications/attendance-alert \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-001",
    "direction": "IN",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "id": "attendance-001"
  }' | jq '.'

echo -e "\nDone!"
