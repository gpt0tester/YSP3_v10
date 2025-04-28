#!/bin/bash
set -e

# 1) Wait for the containers to be fully up (simple sleep or a more robust check)
sleep 5

# 2) Initialize the replica set via mongo1
docker exec mongo1 mongosh --eval "
    rs.initiate({
      _id: 'rs0',
      members: [
        { _id: 0, host: 'mongo1:27017' },
        { _id: 1, host: 'mongo2:27017' },
        { _id: 2, host: 'mongo3:27017' }
      ]
    });
"