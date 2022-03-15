import fs from 'fs';
import path from 'path';

import axios, { AxiosResponse } from 'axios';
import dotenv from 'dotenv';

import { objectToKey } from './utils/stringUtils';
import {
  AlertOpMode,
  AlertPolicyNerdGraph,
  Environment,
} from './model/nr-alerts';
import { config } from './config';

async function syncPolicies(env: Environment) {
  dotenv.config();
  const apiKey = process.env.NR_API_KEY!;
  const policyFolderPath =
    env == Environment.ALPHA
      ? config.ALPHA_POLICY_FILEPATH
      : config.PROD_POLICY_FILEPATH;

  // Fetch all existing policies from remote (NerdGraph API)
  const remotePolicies = (
    await axios.post('https://api.eu.newrelic.com/graphql', {
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
      query: `query policies($accountId: Int!){
                actor {
                  account(id: $accountId) {
                    alerts {
                      policiesSearch {
                        policies {
                          id
                          name
                          incidentPreference
                          accountId
                        }
                      }
                    }
                  }
                }
            }`,
      variables: {
        accountId: config.NR_ACCOUNT_ID,
      },
    })
  ).data['data']['actor']['account']['alerts']['policiesSearch'][
    'policies'
  ] as AlertPolicyNerdGraph[];

  // Step through each local policy:
  // - determine create/update
  // - execute it with the API
  // - update local with auto-updated remote fields
  const policyJsonsInLocal = fs
    .readdirSync(policyFolderPath)
    .filter((file) => path.extname(file) === '.json');

  policyJsonsInLocal.forEach((policyJsonFilename) => {
    const fileData = fs.readFileSync(
      path.join(policyFolderPath, policyJsonFilename)
    );
    const localPolicy = JSON.parse(fileData.toString()) as AlertPolicyNerdGraph;

    // Find corresponding remote policy, if any
    const correspondingRemotePolicy = remotePolicies.find((remotePolicy) => {
      if (localPolicy.id) {
        return localPolicy.id == remotePolicy.id!; // Remote policy ID always exists
      } else {
        return localPolicy.name == remotePolicy.name; // Remote policy name always exists
      }
    });

    if (correspondingRemotePolicy) {
      // Update case
      if (
        localPolicy.id &&
        objectToKey({ localPolicy }) !==
          objectToKey({ correspondingRemotePolicy })
      ) {
        syncPolicy(
          env,
          localPolicy,
          policyJsonFilename,
          apiKey,
          AlertOpMode.UPDATE
        );
      }
    } else {
      // Creation case
      syncPolicy(
        env,
        localPolicy,
        policyJsonFilename,
        apiKey,
        AlertOpMode.CREATE
      );
    }
  });
}

async function syncPolicy(
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let nrResponse: Promise<AxiosResponse<any>>;

  if (mode == AlertOpMode.UPDATE) {
    nrResponse = axios.post('https://api.eu.newrelic.com/graphql', {
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
      query: `mutation {
        alertsPolicyUpdate($accountId: Int!, $id: String!, $policy: {$incidentPreference: String, $name: String}!) {
          accountId
          id
          incidentPreference
          name
        }
      }`,
      variables: {
        accountId: config.NR_ACCOUNT_ID,
        id: localPolicy.id,
        policy: {
          incidentPreference: localPolicy.incident_preference,
          name: localPolicy.name,
        },
      },
    });
  } else if (mode == AlertOpMode.CREATE) {
    nrResponse = axios.post('https://api.eu.newrelic.com/graphql', {
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
      query: `mutation {
        alertsPolicyCreate($accountId: Int!, $policy: {$incidentPreference: String!, $name: String!}!) {
          accountId
          id
          incidentPreference
          name
        }
      }`,
      variables: {
        accountId: config.NR_ACCOUNT_ID,
        policy: {
          incidentPreference: localPolicy.incident_preference,
          name: localPolicy.name,
        },
      },
    });
  } else {
    throw Error('AlertSync: Invalid sync mode specified');
  }

  // Do this for create and update cases
  // For deletion (conditions, not policies), this will require a small modification
  nrResponse
    .then((resp) => {
      const remotePolicy = JSON.stringify(
        resp.data.policy as AlertPolicyNerdGraph
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
      console.log(`[POLICY UPDATE]: ${policyJsonFilename} processed`);
    })
    .catch((resp) => {
      console.log('Error occurred during alert policy update:');
      console.log(resp.data.error);
    });
}

void syncPolicies(Environment.ALPHA);
