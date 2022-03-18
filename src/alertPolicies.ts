import fs from 'fs';
import path from 'path';

import axios from 'axios';
import dotenv from 'dotenv';
import { print } from 'graphql';

import { objectToKey } from './utils/stringUtils';
import {
  AlertOpMode,
  AlertPolicyNerdGraph,
  Environment,
} from './model/nr-alerts';
import { config } from './config';
import { QUERY_POLICIES } from './queries';
import { syncPolicy } from './utils/alertPoliciesUtils';

export async function syncPolicies(env: Environment) {
  dotenv.config();
  const apiKey = process.env.NR_API_KEY!;
  const policyFolderPath =
    env == Environment.ALPHA
      ? config.ALPHA_POLICY_FILEPATH
      : config.PROD_POLICY_FILEPATH;
  let remotePolicies: AlertPolicyNerdGraph[];

  // Fetch all existing policies from remote (NerdGraph API)
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

  // Step through each local policy:
  // - determine create/update
  // - execute it with the API
  // - update local with auto-updated remote fields (e.g. ID)
  const policyJsonsInLocal = fs
    .readdirSync(policyFolderPath)
    .filter((file) => path.extname(file) === '.json');

  if (policyJsonsInLocal.length) {
    policyJsonsInLocal.forEach(async (policyJsonFilename) => {
      const fileData = fs.readFileSync(
        path.join(policyFolderPath, policyJsonFilename)
      );
      const localPolicy = JSON.parse(
        fileData.toString()
      ) as AlertPolicyNerdGraph;

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
          await syncPolicy(
            env,
            localPolicy,
            policyJsonFilename,
            apiKey,
            AlertOpMode.UPDATE
          );
        }
      } else {
        // Creation case
        await syncPolicy(
          env,
          localPolicy,
          policyJsonFilename,
          apiKey,
          AlertOpMode.CREATE
        );
      }
    });
  }

  console.log('Alert Policy sync procedure complete (with or without actions)');
}
