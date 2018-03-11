#!/usr/bin/env bash
export FJS_DECISION_WORKERS=1 
export DISPATCH_JOB=true 
export RANDOM_SEED=as1234 
export FJS_ACTIVITY_WORKERS=8 
export ENABLE_SCHEDULER=true 
export ENABLE_JOBQUEUE=true 
export ENABLE_JOURNAL=true 
export ENABLE_LOGGER=true 
export ENABLE_CACHE=true 
export ENABLE_BLOB=true 
export JOURNAL_DB_PLUGIN=memory 
npm run test2