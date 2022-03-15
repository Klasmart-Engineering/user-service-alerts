# User Service Alert Definitions

## Purpose

This repository provides a way to document `user-service`'s policy and condition definitions, as well as automatically synchronise the corresponding ones in our New Relic account with them.

### Policies

Sync operations available: create; update. Delete is not available for automatic syncing due to the complex logic involved in implementation, and the fact that the policy definition space in New Relic is shared by other teams. Therefore, it is safest to manually delete policies in the New Relic UI.

### Conditions

Sync operations available: create; update; delete.

## Syncing Procedure

1. Raise a PR with the changes to the definitions you want to make
2. Get the PR approved and merge in the changes
3. If you don't already have the New Relic User Service key, retrieve it and set it in a local .env file
4. Run `npm run alert-sync` in the terminal

Alert policies and conditions should now be synced in New Relic. 
You may find that JSONs written back to local are on a single line, in which case just save them and the Prettier JSON formatter should put them back to normal/unchanged.
