import fs from 'fs';
import path from 'path';
import axios, { AxiosResponse } from 'axios';
import { print } from 'graphql';
import { config } from '../config';
import {
  AlertOpMode,
  AlertPolicyNerdGraph,
  Environment,
} from '../model/nr-alerts';
import { CREATE_POLICY, QUERY_POLICIES, UPDATE_POLICY } from '../queries';

export async function fetchRemotePolicies(
  remotePolicies: AlertPolicyNerdGraph[],
  apiKey: string
) {
  await axios
    .post(
      'https://api.eu.newrelic.com/graphql',
      {
        query: print(QUERY_POLICIES),
        variables: {
          accountId: config.NR_ACCOUNT_ID,
        },
      },
      {
        headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
      }
    )
    .then((resp) => {
      remotePolicies = resp.data.data.actor.account.alerts.policiesSearch
        .policies as AlertPolicyNerdGraph[];
    })
    .catch((resp) => {
      console.log('Error occurred when fetching alert policies:');
      console.log(resp.data.errors);
      throw Error('AlertSync: Error occurred when fetching alert policies');
    });

  return remotePolicies;
}

export async function syncPolicy(
  env: Environment,
  localPolicy: AlertPolicyNerdGraph,
  policyJsonFilename: string,
  apiKey: string,
  mode: AlertOpMode
) {
  const policyFolderPath =
    env == Environment.ALPHA
      ? config.ALPHA_POLICY_FILEPATH
      : config.PROD_POLICY_FILEPATH;
  const mutationName =
    mode == AlertOpMode.UPDATE ? 'alertsPolicyUpdate' : 'alertsPolicyCreate';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let nrResponse: Promise<AxiosResponse<any>>;

  if (mode == AlertOpMode.UPDATE) {
    nrResponse = axios.post(
      'https://api.eu.newrelic.com/graphql',
      {
        query: print(UPDATE_POLICY),
        variables: {
          accountId: config.NR_ACCOUNT_ID,
          id: localPolicy.id,
          policy: {
            incidentPreference: localPolicy.incidentPreference,
            name: localPolicy.name,
          },
        },
      },
      {
        headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
      }
    );
  } else if (mode == AlertOpMode.CREATE) {
    nrResponse = axios.post(
      'https://api.eu.newrelic.com/graphql',
      {
        query: print(CREATE_POLICY),
        variables: {
          accountId: config.NR_ACCOUNT_ID,
          policy: {
            incidentPreference: localPolicy.incidentPreference,
            name: localPolicy.name,
          },
        },
      },
      {
        headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
      }
    );
  } else {
    throw Error('AlertSync: Invalid sync mode specified');
  }

  // Write response back to local data (e.g. add ID if policy created)
  await nrResponse
    .then((resp) => {
      const remotePolicy = JSON.stringify(
        resp.data.data[`${mutationName}`] as AlertPolicyNerdGraph
      );
      fs.writeFile(
        path.join(policyFolderPath, policyJsonFilename),
        remotePolicy,
        (error) => {
          if (error) {
            throw error;
          }
        }
      );
      console.log(`[${mutationName}]: ${policyJsonFilename} processed`);
    })
    .catch((resp) => {
      console.log(`Error occurred during ${mutationName} operation:`);
      console.log(resp.data.errors);
      throw Error('AlertSync: Error occurred when syncing alert policies');
    });
}
