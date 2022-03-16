import { syncConditions } from './alertConditions';
import { syncPolicies } from './alertPolicies';
import { Environment } from './model/nr-alerts';

console.log('Beginning alert definitions syncing for User Service');

// TODO: take environment value as input from shell script

// First sync policies (create; update)
void syncPolicies(Environment.ALPHA);

// Then sync each policy's conditions (create; update; delete)
void syncConditions(Environment.ALPHA);
