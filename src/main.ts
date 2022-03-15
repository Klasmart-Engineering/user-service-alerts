import { syncPolicies } from './alertPolicies';
import { Environment } from './model/nr-alerts';

console.log('Beginning alert definitions syncing for User Service');

// TODO: take environment value as input from shell script

// First sync policies
void syncPolicies(Environment.ALPHA);
