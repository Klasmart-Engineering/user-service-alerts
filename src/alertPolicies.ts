import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';

import { objectToKey } from './utils/stringUtils';
import {
  AlertOpMode,
  AlertPolicyNerdGraph,
  Environment,
} from './model/nr-alerts';
import { config } from './config';
import { fetchRemotePolicies, syncPolicy } from './utils/alertPoliciesUtils';

export async function syncPolicies(env: Environment) {
  dotenv.config();
  const apiKey = process.env.NR_API_KEY!;
  const policyFolderPath =
    env == Environment.ALPHA
      ? config.ALPHA_POLICY_FILEPATH
      : config.PROD_POLICY_FILEPATH;
  let remotePolicies: AlertPolicyNerdGraph[] = [];

  // Fetch all existing policies from remote (NerdGraph API)
  remotePolicies = await fetchRemotePolicies(remotePolicies, apiKey);

  // Step through each local policy:
  // - determine create/update
  // - execute it with the API
  // - update local with auto-updated remote fields (e.g. ID)
  const policyJsonsInLocal = fs
    .readdirSync(policyFolderPath)
    .filter((file) => path.extname(file) === '.json');

  if (policyJsonsInLocal.length) {
    for await (const policyJsonFilename of policyJsonsInLocal) {
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
    }
  }

  console.log('Alert Policy sync procedure complete (with or without actions)');
}
