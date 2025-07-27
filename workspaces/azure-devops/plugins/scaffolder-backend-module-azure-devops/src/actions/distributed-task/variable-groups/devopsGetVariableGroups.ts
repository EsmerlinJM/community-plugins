/*
 * Copyright 2024 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  DefaultAzureDevOpsCredentialsProvider,
  ScmIntegrationRegistry,
} from '@backstage/integration';
import { examples } from './devopsGetVariableGroups.example';

import { InputError } from '@backstage/errors';
import {
  getBearerHandler,
  getPersonalAccessTokenHandler,
  WebApi,
} from 'azure-devops-node-api';
import { VariableGroup } from 'azure-devops-node-api/interfaces/TaskAgentInterfaces';

/**
 * Creates an Azure DevOps Variable Groups getter Scaffolder action.
 *
 * @remarks
 *
 * Retrieves variable groups from Azure DevOps Distributed Task Library.
 *
 * @public
 */
export function createAzureDevopsGetVariableGroupsAction(options: {
  integrations: ScmIntegrationRegistry;
}) {
  const { integrations } = options;

  return createTemplateAction({
    id: 'azure:distributed-task:variable-groups:get',
    description:
      'Retrieves variable groups from Azure DevOps Distributed Task Library.',
    examples,
    schema: {
      input: {
        host: d =>
          d
            .string()
            .describe('The host of Azure DevOps. Defaults to dev.azure.com')
            .optional(),
        organization: d =>
          d.string().describe('The name of the Azure DevOps organization.'),
        project: d => d.string().describe('The name of the Azure project.'),
        groupsId: d =>
          d
            .array(d.number())
            .describe('The variable group IDs to retrieve.')
            .optional(),
        groupName: d =>
          d
            .string()
            .describe('The variable group name to filter by.')
            .optional(),
        token: d =>
          d
            .string()
            .describe('Token to use for Azure DevOps REST API.')
            .optional(),
      },
      output: {
        variableGroups: d =>
          d
            .array(
              d.object({
                id: d.number(),
                name: d.string(),
                description: d.string().optional(),
                variables: d
                  .record(
                    d.string(),
                    d.object({
                      value: d.string().optional(),
                      isSecret: d.boolean().optional(),
                    }),
                  )
                  .optional(),
                type: d.string().optional(),
                createdBy: d
                  .object({
                    displayName: d.string().optional(),
                    id: d.string().optional(),
                  })
                  .optional(),
                createdOn: d.string().optional(),
                modifiedBy: d
                  .object({
                    displayName: d.string().optional(),
                    id: d.string().optional(),
                  })
                  .optional(),
                modifiedOn: d.string().optional(),
              }),
            )
            .describe('Array of retrieved variable groups'),
        totalCount: d =>
          d.number().describe('Total number of variable groups retrieved'),
      },
    },
    async handler(ctx) {
      const {
        host = 'dev.azure.com',
        organization,
        project,
        groupsId,
        groupName,
      } = ctx.input;

      const url = `https://${host}/${organization}`;
      const credentialProvider =
        DefaultAzureDevOpsCredentialsProvider.fromIntegrations(integrations);
      const credentials = await credentialProvider.getCredentials({ url: url });

      if (credentials === undefined && ctx.input.token === undefined) {
        throw new InputError(
          `No credentials provided for ${url}, please check your integrations config`,
        );
      }

      const authHandler =
        ctx.input.token || credentials?.type === 'pat'
          ? getPersonalAccessTokenHandler(ctx.input.token ?? credentials!.token)
          : getBearerHandler(credentials!.token);

      const webApi = new WebApi(url, authHandler);
      const client = await webApi.getTaskAgentApi();

      try {
        let variableGroupsRaw: VariableGroup[] = [];

        if (groupsId && groupsId.length > 0) {
          // Retrieve specific variable groups by IDs
          ctx.logger.info(
            `Retrieving variable groups with IDs: ${groupsId.join(', ')}`,
          );

          // Use getVariableGroupsById if available, otherwise get individually
          if (client.getVariableGroupsById) {
            variableGroupsRaw =
              (await client.getVariableGroupsById(project, groupsId)) || [];
          }
        } else {
          // Retrieve all variable groups (optionally filtered by name)
          ctx.logger.info(
            `Retrieving variable groups${
              groupName ? ` with name: ${groupName}` : ' (all)'
            }`,
          );

          variableGroupsRaw =
            (await client.getVariableGroups(project, groupName)) || [];
        }

        // Map and filter variable groups to match the output schema
        const variableGroupsResult = variableGroupsRaw
          .filter(vg => vg.id !== undefined && vg.name !== undefined)
          .map(vg => ({
            id: vg.id!,
            name: vg.name!,
            description: vg.description || undefined,
            variables: vg.variables || undefined,
            type: vg.type || undefined,
            createdBy: vg.createdBy
              ? {
                  displayName: vg.createdBy.displayName || undefined,
                  id: vg.createdBy.id || undefined,
                }
              : undefined,
            createdOn: vg.createdOn?.toISOString() || undefined,
            modifiedBy: vg.modifiedBy
              ? {
                  displayName: vg.modifiedBy.displayName || undefined,
                  id: vg.modifiedBy.id || undefined,
                }
              : undefined,
            modifiedOn: vg.modifiedOn?.toISOString() || undefined,
          }));

        // Log results
        if (variableGroupsResult.length === 0) {
          ctx.logger.warn(
            `No variable groups found${
              groupName ? ` with name: ${groupName}` : ''
            }`,
          );
        } else {
          ctx.logger.info(
            `Successfully retrieved ${variableGroupsResult.length} variable group(s)`,
          );

          // Log variable groups information
          variableGroupsResult.forEach(vg => {
            ctx.logger.info(`Variable Group: ${vg.name} (ID: ${vg.id})`);
            if (vg.variables) {
              const variableNames = Object.keys(vg.variables);
              ctx.logger.info(`Variables count: ${variableNames.length}`);
            }
          });

          // Log the variable groups object in a readable format for debugging
          ctx.logger.debug('Variable groups retrieved:', {
            variableGroups: JSON.stringify(variableGroupsResult, null, 2),
          });
        }

        ctx.output('variableGroups', variableGroupsResult);
        ctx.output('totalCount', variableGroupsResult.length);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        ctx.logger.error(`Failed to retrieve variable groups: ${errorMessage}`);
        throw new InputError(
          `Failed to retrieve variable groups: ${errorMessage}`,
        );
      }
    },
  });
}
