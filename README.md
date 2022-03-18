# User Service Alert Definitions

## Purpose

This repository provides a way to document `user-service`'s policy and condition definitions, as well as automatically synchronise the corresponding ones in our New Relic account with them.

## Sync Operations Available

Create and update for policies and conditions are the only operations available, where local data is the "source of truth" and takes precedence over remote data (and so the "write" direction goes from local to remote). Deletion is not available for safety reasons (it is very easy to accidentally select all remote conditions) and is to be done manually in the UI for a policy or condition you desire to delete.

## General Syncing Procedure

Before proceeding with the below, make sure you know how to define what you want to create or update beforehand by reading the sections after this one.

1. Raise a PR with the changes to the definitions you want to make
2. Get the PR approved and merge in the changes
3. If you don't already have the New Relic User Service key, retrieve it and set it in a local .env file
4. Run `bash src/alert_sync.sh` in the terminal and follow the instructions

Alert policies and conditions should now be synced in New Relic. 
You may find that JSONs written back to local are on a single line, in which case just save them and the Prettier JSON formatter should put them back to normal/unchanged.

## How to Create a Policy

1. Create a JSON object with the fields `accountId`, `name`, and `incidentPreference` specified. The `id` field will be filled in by New Relic.
2. Perform the syncing procedure.
3. Save the written-back policy file (it now has `id`). The save action will auto-format the object.

## How to Create a Condition

1. If a condition is being created for a new policy that hasn't been synced, first create and sync the policy, then you will have the `policyId`.
2. Create a JSON object with the fields `enabled`, `name`, `nrql` object with `query` field, `policyId`, `runbookUrl`, `signal` object with `aggregationDelay`, `aggregationMethod`, and `aggregationWindow` fields, `terms` list object with inner object with `operator`, `priority`, `threshold`, `thresholdDuration`, and `thresholdOccurrences` fields. Do not include `id` or `type`.
3. Perform the syncing procedure.
4. Save the written-back condition file (it now has `id` and `type`). The save action will auto-format the object.