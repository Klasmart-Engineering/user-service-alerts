import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';

import { objectToKey } from './utils/stringUtils';
import {
  AlertConditionNerdGraph,
  AlertOpMode,
  AlertPolicyNerdGraph,
  Environment,
} from './model/nr-alerts';
import { config } from './config';
import {
  fetchRemotePolicyConditions,
  syncCondition,
} from './utils/alertConditionsUtils';

export async function syncConditions(env: Environment) {
  dotenv.config();
  const apiKey = process.env.NR_API_KEY!;
  const policyFolderPath =
    env == Environment.ALPHA
      ? config.ALPHA_POLICY_FILEPATH
      : config.PROD_POLICY_FILEPATH;
  const conditionsFolderPath =
    env == Environment.ALPHA
      ? config.ALPHA_CONDITIONS_FILEPATH
      : config.PROD_CONDITIONS_FILEPATH;
  const conditionFilenameMap = new Map<string, AlertConditionNerdGraph>();
  let localPolicyConditions: Map<string, AlertConditionNerdGraph>;
  let remotePolicyConditions: AlertConditionNerdGraph[] = [];

  // Parse local conditions list, populate map: filename -> condition
  const conditionJsonsInLocal = fs
    .readdirSync(conditionsFolderPath)
    .filter((file) => path.extname(file) === '.json');

  conditionJsonsInLocal.forEach((conditionJsonFilename) => {
    const fileData = fs.readFileSync(
      path.join(conditionsFolderPath, conditionJsonFilename)
    );
    const localCondition = JSON.parse(
      fileData.toString()
    ) as AlertConditionNerdGraph;
    conditionFilenameMap.set(conditionJsonFilename, localCondition);
  });

  // Update conditions by policy
  const policyJsonsInLocal = fs
    .readdirSync(policyFolderPath)
    .filter((file) => path.extname(file) === '.json');

  policyJsonsInLocal.forEach(async (policyJsonFilename) => {
    const fileData = fs.readFileSync(
      path.join(policyFolderPath, policyJsonFilename)
    );
    const localPolicy = JSON.parse(fileData.toString()) as AlertPolicyNerdGraph;

    // Gather local conditions for the policy
    localPolicyConditions = new Map(
      [...conditionFilenameMap].filter(
        (condMap) => condMap[1].policyId == localPolicy.id
      )
    );

    // Gather remote conditions for the policy
    remotePolicyConditions = await fetchRemotePolicyConditions(
      remotePolicyConditions,
      localPolicy.id!,
      apiKey
    );

    // Step through each local condition:
    // - determine create/update
    // - execute it with the API
    // - update local with auto-updated remote fields (e.g. ID)
    localPolicyConditions.forEach(
      async (localCondition, localConditionFilename) => {
        const correspondingRemoteCondition = remotePolicyConditions.find(
          (remoteCondition) => {
            if (localCondition.id) {
              return localCondition.id == remoteCondition.id!; // Remote condition ID always exists
            } else {
              return localCondition.name == remoteCondition.name; // Remote condition name always exists
            }
          }
        );

        if (correspondingRemoteCondition) {
          // Update case
          if (
            localCondition.id &&
            objectToKey({ localCondition }) !==
              objectToKey({ correspondingRemoteCondition })
          ) {
            await syncCondition(
              env,
              localCondition,
              localConditionFilename,
              apiKey,
              AlertOpMode.UPDATE
            );
          }
        } else {
          // Creation case
          await syncCondition(
            env,
            localCondition,
            localConditionFilename,
            apiKey,
            AlertOpMode.CREATE
          );
        }
      }
    );
  });

  console.log(
    'Alert Condition sync procedure complete (with or without actions)'
  );
}
