#!/bin/bash
set -e

# 1) Wait for the containers to be fully up (simple sleep or a more robust check)
sleep 5

# 2) Initialize the replica set via mongo1
docker exec mongo1 mongosh -u admin -p 123456789 --eval "
    rs.reconfig({
      _id: 'rs0',
      members: [
        { _id: 0, host: '192.168.160.128:27017' },
        { _id: 1, host: '192.168.160.128:27018' },
        { _id: 2, host: '192.168.160.128:27019' }
      ]
    });
"