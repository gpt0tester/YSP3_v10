#!/bin/bash

# Variables
PRIMARY_CONTAINER="mongodb-primary"
USERNAME="admin"
PASSWORD="123456789"
DATABASE="mydatabase"
COLLECTION="test"

# Insert Data into Primary
docker exec -i $PRIMARY_CONTAINER mongosh -u $USERNAME -p $PASSWORD --authenticationDatabase admin <<EOF
use $DATABASE
db.$COLLECTION.insertOne({ name: "Replication Check", timestamp: new Date() })
EOF

# Wait for replication
sleep 5

# Function to check data on a secondary
check_secondary() {
  local SECONDARY_CONTAINER=$1
  DATA_PRESENT=$(docker exec -i $SECONDARY_CONTAINER mongosh -u $USERNAME -p $PASSWORD --authenticationDatabase admin <<EOF
use $DATABASE
db.$COLLECTION.find({ name: "Replication Check" }).count()
EOF
)

  # Trim whitespace  
  DATA_PRESENT=$(echo "$DATA_PRESENT" | tr -d '[:space:]')  

  if [[ "$DATA_PRESENT" =~ ^[0-9]+$ ]] && [ "$DATA_PRESENT" -ge 1 ]; then  
    echo "Data replicated to $SECONDARY_CONTAINER successfully."  
  else  
    echo "Data NOT replicated to $SECONDARY_CONTAINER."  
  fi  
}  

#   if [ "$DATA_PRESENT" -ge 1 ]; then
#     echo "Data replicated to $SECONDARY_CONTAINER successfully."
#   else
#     echo "Data NOT replicated to $SECONDARY_CONTAINER."
#   fi
# }

# Check on secondaries
check_secondary "mongodb-secondary1"
check_secondary "mongodb-secondary2"
