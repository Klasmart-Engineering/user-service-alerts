import { syncConditions } from './alertConditions';
import { syncPolicies } from './alertPolicies';
import { Environment } from './model/nr-alerts';

console.log('Beginning alert definitions syncing for User Service');

// TODO: take environment value as input from shell script

async function main() {
  let env: Environment;
  const envInput = process.argv[process.argv.length - 1];
  if (envInput == 'Alpha') {
    env = Environment.ALPHA;
  } else if (envInput == 'Prod') {
    env = Environment.PROD;
  } else {
    throw Error('Invalid environment specified');
  }

  // First sync policies (create; update)
  await syncPolicies(env);

  // Then sync each policy's conditions (create; update; delete)
  await syncConditions(env);
}

main();
