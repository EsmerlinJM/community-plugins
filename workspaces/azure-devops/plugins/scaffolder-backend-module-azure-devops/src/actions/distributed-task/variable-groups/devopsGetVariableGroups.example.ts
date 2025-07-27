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

import { TemplateExample } from '@backstage/plugin-scaffolder-node';
import yaml from 'yaml';

export const examples: TemplateExample[] = [
  {
    description: 'Get all Variable Groups from a project',
    example: yaml.stringify({
      steps: [
        {
          id: 'getVariableGroups',
          action: 'azure:distributed-task:variable-groups:get',
          name: 'Get All Variable Groups',
          input: {
            organization: 'organization',
            project: 'project',
          },
        },
      ],
    }),
  },
  {
    description: 'Get specific Variable Groups by IDs',
    example: yaml.stringify({
      steps: [
        {
          id: 'getVariableGroups',
          action: 'azure:distributed-task:variable-groups:get',
          name: 'Get Variable Groups by IDs',
          input: {
            organization: 'organization',
            project: 'project',
            groupsId: [123, 456, 789],
          },
        },
      ],
    }),
  },
  {
    description: 'Get Variable Groups filtered by name',
    example: yaml.stringify({
      steps: [
        {
          id: 'getVariableGroups',
          action: 'azure:distributed-task:variable-groups:get',
          name: 'Get Variable Groups by Name',
          input: {
            organization: 'organization',
            project: 'project',
            groupName: 'Production-Variables',
          },
        },
      ],
    }),
  },
  {
    description: 'Get Variable Groups from alternative host to dev.azure.com',
    example: yaml.stringify({
      steps: [
        {
          id: 'getVariableGroups',
          action: 'azure:distributed-task:variable-groups:get',
          name: 'Get Variable Groups from Custom Host',
          input: {
            host: 'my-azure-devops.company.com',
            organization: 'organization',
            project: 'project',
          },
        },
      ],
    }),
  },
  {
    description: 'Get Variable Groups with custom token',
    example: yaml.stringify({
      steps: [
        {
          id: 'getVariableGroups',
          action: 'azure:distributed-task:variable-groups:get',
          name: 'Get Variable Groups (custom token)',
          input: {
            organization: 'organization',
            project: 'project',
            token: '${{ secrets.MY_CUSTOM_AZURE_TOKEN }}',
          },
        },
      ],
    }),
  },
  {
    description: 'Get specific Variable Groups with all options',
    example: yaml.stringify({
      steps: [
        {
          id: 'getVariableGroups',
          action: 'azure:distributed-task:variable-groups:get',
          name: 'Get Variable Groups with All Options',
          input: {
            host: 'my-azure-devops.company.com',
            organization: 'organization',
            project: 'project',
            groupsId: ['100', '200'],
            token: '${{ secrets.MY_CUSTOM_AZURE_TOKEN }}',
          },
        },
      ],
    }),
  },
  {
    description: 'Get Variable Groups and use the output in subsequent steps',
    example: yaml.stringify({
      steps: [
        {
          id: 'getVariableGroups',
          action: 'azure:distributed-task:variable-groups:get',
          name: 'Get Variable Groups',
          input: {
            organization: 'organization',
            project: 'project',
            groupName: 'API-Config',
          },
        },
        {
          id: 'processVariableGroups',
          action: 'debug:log',
          name: 'Process Variable Groups',
          input: {
            message:
              'Found ${{ steps.getVariableGroups.output.totalCount }} variable groups',
            extra: {
              variableGroups:
                '${{ steps.getVariableGroups.output.variableGroups }}',
            },
          },
        },
      ],
    }),
  },
  {
    description: 'Get Variable Groups for multiple environments',
    example: yaml.stringify({
      steps: [
        {
          id: 'getDevVariableGroups',
          action: 'azure:distributed-task:variable-groups:get',
          name: 'Get Development Variable Groups',
          input: {
            organization: 'organization',
            project: 'project',
            groupName: 'Development-Variables',
          },
        },
        {
          id: 'getProdVariableGroups',
          action: 'azure:distributed-task:variable-groups:get',
          name: 'Get Production Variable Groups',
          input: {
            organization: 'organization',
            project: 'project',
            groupName: 'Production-Variables',
          },
        },
      ],
    }),
  },
];
