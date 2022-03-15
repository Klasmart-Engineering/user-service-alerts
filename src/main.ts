import { syncPolicies } from './alertPolicies';
import { Environment } from './model/nr-alerts';

console.log('Beginning alert definitions syncing for User Service');

// First sync policies
void syncPolicies(Environment.ALPHA);
