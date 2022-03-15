# User Service Alert Definitions

## Purpose

This repository provides a way to document `user-service`'s policy and condition definitions, as well as automatically synchronise the corresponding ones in our New Relic account with them.

### Policies

Sync operations available: create; update. Delete is not available for automatic syncing due to the complex logic involved in implementation, and the fact that the policy definition space in New Relic is shared by other teams. Therefore, it is safest to manually delete policies in the New Relic UI.

### Conditions

Sync operations available: create; update; delete.

## How to Use

Run `npm run alert-sync` in the terminal.
