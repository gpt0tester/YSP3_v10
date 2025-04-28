#!/bin/bash  

# Variables  
PRIMARY_CONTAINER="mongodb-primary"  
SECONDARY1_CONTAINER="mongodb-secondary1"  
SECONDARY2_CONTAINER="mongodb-secondary2"  
USERNAME="admin"  
PASSWORD="123456789"  
DATABASE="mydatabase"  
COLLECTION="test"  

# Function to execute MongoDB command  
execute_mongo_command() {  
    local container="$1"  
    local command="$2"  
    docker exec -i "$container" sh -c "mongosh -u $USERNAME -p $PASSWORD --authenticationDatabase admin --quiet <<EOF  
$command  
EOF"  
}  

# Comprehensive Replication Diagnostic Script  
diagnose_replication() {  
    echo "=== REPLICATION DIAGNOSTIC REPORT ==="  
    echo "Date: $(date)"  
    echo ""  

    # 1. Check Replica Set Configuration  
    echo "1. REPLICA SET CONFIGURATION:"  
    for container in "$PRIMARY_CONTAINER" "$SECONDARY1_CONTAINER" "$SECONDARY2_CONTAINER"; do  
        echo "--- $container Configuration ---"  
        execute_mongo_command "$container" "  
rs.conf()  
"  
        echo ""  
    done  

    # 2. Replica Set Status  
    echo "2. REPLICA SET STATUS:"  
    for container in "$PRIMARY_CONTAINER" "$SECONDARY1_CONTAINER" "$SECONDARY2_CONTAINER"; do  
        echo "--- $container Status ---"  
        execute_mongo_command "$container" "  
rs.status()  
"  
        echo ""  
    done  

    # 3. Insert Test Data  
    echo "3. INSERTING TEST DATA:"  
    execute_mongo_command "$PRIMARY_CONTAINER" "  
use $DATABASE  
db.$COLLECTION.insert({ name: 'Replication Check', timestamp: new Date(), diagnosticId: '$(date +%s)' })  
"  

    # 4. Wait for potential replication  
    sleep 10  

    # 5. Check Data on Secondaries  
    echo "4. DATA VERIFICATION ON SECONDARIES:"  
    for container in "$SECONDARY1_CONTAINER" "$SECONDARY2_CONTAINER"; do  
        echo "--- Checking $container ---"  
        echo "Database List:"  
        execute_mongo_command "$container" "  
show dbs  
"  
        echo ""  
        echo "Collection Contents:"  
        execute_mongo_command "$container" "  
use $DATABASE  
db.$COLLECTION.find({ name: 'Replication Check' })  
"  
        echo ""  
    done  

    # 6. Replication Lag Check  
    echo "5. REPLICATION LAG:"  
    execute_mongo_command "$PRIMARY_CONTAINER" "  
rs.printSlaveReplicationInfo()  
"  
}  

# Run Diagnostic  
diagnose_replication > replication_diagnostic_$(date +%Y%m%d_%H%M%S).log  

# Function to check data on a secondary  
check_secondary() {  
    local SECONDARY_CONTAINER="$1"  
    
    echo "Checking data on $SECONDARY_CONTAINER..."  
    
    # Retrieve and count documents  
    local DATA_PRESENT  
    DATA_PRESENT=$(execute_mongo_command "$SECONDARY_CONTAINER" "  
use $DATABASE  
db.$COLLECTION.find({ name: 'Replication Check' }).count()  
" | tr -d '\n' | tr -d ' ')  

    # Print the actual documents found  
    echo "Documents found in $SECONDARY_CONTAINER:"  
    execute_mongo_command "$SECONDARY_CONTAINER" "  
use $DATABASE  
db.$COLLECTION.find({ name: 'Replication Check' }).pretty()  
"  

    # Validate and check replication  
    if [[ "$DATA_PRESENT" =~ ^[0-9]+$ ]] && [ "$DATA_PRESENT" -ge 1 ]; then  
        echo "Data replicated to $SECONDARY_CONTAINER successfully."  
        return 0  
    else  
        echo "Data NOT replicated to $SECONDARY_CONTAINER. Count: $DATA_PRESENT"  
        return 1  
    fi  
}
# Check on secondaries  
check_secondary "mongodb-secondary1"  
check_secondary "mongodb-secondary2"