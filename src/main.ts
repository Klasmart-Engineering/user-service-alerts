import { syncConditions } from './alertConditions';
import { syncPolicies } from './alertPolicies';
import { Environment } from './model/nr-alerts';

console.log('Beginning alert definitions syncing for User Service');

// TODO: take environment value as input from shell script

async function main() {
  // First sync policies (create; update)
  await syncPolicies(Environment.ALPHA);

  // Then sync each policy's conditions (create; update; delete)
  await syncConditions(Environment.ALPHA);
}

main();
