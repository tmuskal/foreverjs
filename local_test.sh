#!/usr/bin/env bash
export FJS_DECISION_WORKERS=1 
export DISPATCH_JOB=true 
export RANDOM_SEED=as1234 
export FJS_ACTIVITY_WORKERS=8
export ENABLE_SCHEDULER=true 
export ENABLE_JOBQUEUE=true 
export ENABLE_JOURNAL=true 
export ENABLE_LOGGER=true 
# export LOGGER_PLUGIN=console
export ENABLE_CACHE=true
export ENABLE_BLOB=true
export BLOB_MIN_SIZE=10000000
export JOURNAL_DB_PLUGIN=memory 
export QUEUE_TYPE=fifo
npm run test2