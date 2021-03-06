#!/usr/bin/env bash
export FJS_DECISION_WORKERS=4 
export DISPATCH_JOB=true 
export RANDOM_SEED=as1234
export FJS_ACTIVITY_WORKERS=4
export ENABLE_SCHEDULER=true 
export ENABLE_JOBQUEUE=true 
export ENABLE_JOURNAL=true 
export ENABLE_LOGGER=true 
# export LOGGER_PLUGIN=console
export ENABLE_CACHE=true
export JOURNAL_DB_PLUGIN=sequelize
export CACHE_PLUGIN=sequelize
export BLOB_PLUGIN=sequelize
export ENABLE_BLOB=true
export BLOB_MIN_SIZE=16000
# export JOURNAL_DB_PLUGIN=memory
export QUEUE_TYPE=lifo
export ITERATIONS=7
export SEQUELIZE_CONNECTION_STRING=postgresql://postgres:postgres@localhost/postgres
npm run test2