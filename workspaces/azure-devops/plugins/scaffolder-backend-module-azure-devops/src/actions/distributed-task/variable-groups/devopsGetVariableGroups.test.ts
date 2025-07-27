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

jest.mock('azure-devops-node-api', () => ({
  WebApi: jest.fn(),
  getPersonalAccessTokenHandler: jest.fn().mockReturnValue(() => {}),
  getBearerHandler: jest.fn().mockReturnValue(() => {}),
}));

jest.mock('@backstage/plugin-scaffolder-node', () => {
  return {
    ...jest.requireActual('@backstage/plugin-scaffolder-node'),
  };
});

import { createAzureDevopsGetVariableGroupsAction } from './devopsGetVariableGroups';
import { ScmIntegrations } from '@backstage/integration';
import { ConfigReader } from '@backstage/config';
import { WebApi } from 'azure-devops-node-api';
import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils';

describe('azure:distributed-task:variable-groups:get', () => {
  const config = new ConfigReader({
    integrations: {
      azure: [
        {
          host: 'dev.azure.com',
          credentials: [{ personalAccessToken: 'tokenlols' }],
        },
        { host: 'myazurehostnotoken.com' },
      ],
    },
  });

  const integrations = ScmIntegrations.fromConfig(config);
  const action = createAzureDevopsGetVariableGroupsAction({ integrations });

  const mockContext = createMockActionContext({
    input: {
      organization: 'org',
      project: 'project',
    },
  });

  let mockTaskAgentClient: any;
  let mockWebApi: any;

  const mockVariableGroup1 = {
    id: 123,
    name: 'Test-Variable-Group-1',
    description: 'Test description 1',
    variables: {
      VAR1: { value: 'value1', isSecret: false },
      VAR2: { value: 'value2', isSecret: true },
    },
    type: 'Vsts',
    createdBy: {
      displayName: 'Test User',
      id: 'user123',
    },
    createdOn: new Date('2024-01-01T10:00:00Z'),
    modifiedBy: {
      displayName: 'Test User',
      id: 'user123',
    },
    modifiedOn: new Date('2024-01-02T10:00:00Z'),
  };

  const mockVariableGroup2 = {
    id: 456,
    name: 'Test-Variable-Group-2',
    description: 'Test description 2',
    variables: {
      VAR3: { value: 'value3', isSecret: false },
    },
    type: 'Vsts',
    createdBy: {
      displayName: 'Another User',
      id: 'user456',
    },
    createdOn: new Date('2024-01-03T10:00:00Z'),
    modifiedBy: {
      displayName: 'Another User',
      id: 'user456',
    },
    modifiedOn: new Date('2024-01-04T10:00:00Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh mocks for each test
    mockTaskAgentClient = {
      getVariableGroups: jest.fn(),
      getVariableGroupsById: jest.fn(),
    };

    mockWebApi = {
      getTaskAgentApi: jest.fn().mockReturnValue(mockTaskAgentClient),
    };

    (WebApi as unknown as jest.Mock).mockImplementation(() => mockWebApi);
  });

  it('should throw if there is no token or credentials provided', async () => {
    await expect(
      action.handler({
        ...mockContext,
        input: {
          host: 'azure.com',
          organization: 'org',
          project: 'project',
        },
      }),
    ).rejects.toThrow(/No credentials provided/);
  });

  it('should use token from input if provided', async () => {
    mockTaskAgentClient.getVariableGroups.mockResolvedValue([
      mockVariableGroup1,
      mockVariableGroup2,
    ]);

    await action.handler({
      ...mockContext,
      input: {
        host: 'dev.azure.com',
        organization: 'org',
        project: 'project',
        token: 'input-token',
      },
    });

    expect(WebApi).toHaveBeenCalledWith(
      'https://dev.azure.com/org',
      expect.any(Function),
    );

    expect(mockTaskAgentClient.getVariableGroups).toHaveBeenCalledWith(
      'project',
      undefined,
    );

    expect(mockContext.output).toHaveBeenCalledWith('variableGroups', [
      expect.objectContaining({
        id: 123,
        name: 'Test-Variable-Group-1',
        description: 'Test description 1',
      }),
      expect.objectContaining({
        id: 456,
        name: 'Test-Variable-Group-2',
        description: 'Test description 2',
      }),
    ]);

    expect(mockContext.output).toHaveBeenCalledWith('totalCount', 2);
  });

  it('should get variable groups by specific IDs', async () => {
    mockTaskAgentClient.getVariableGroupsById.mockResolvedValue([
      mockVariableGroup1,
    ]);

    await action.handler({
      ...mockContext,
      input: {
        host: 'dev.azure.com',
        organization: 'org',
        project: 'project',
        token: 'input-token',
        groupsId: [123],
      },
    });

    expect(mockTaskAgentClient.getVariableGroupsById).toHaveBeenCalledWith(
      'project',
      [123],
    );

    expect(mockContext.output).toHaveBeenCalledWith('variableGroups', [
      expect.objectContaining({
        id: 123,
        name: 'Test-Variable-Group-1',
      }),
    ]);

    expect(mockContext.output).toHaveBeenCalledWith('totalCount', 1);
  });

  it('should get multiple variable groups by IDs', async () => {
    mockTaskAgentClient.getVariableGroupsById.mockResolvedValue([
      mockVariableGroup1,
      mockVariableGroup2,
    ]);

    await action.handler({
      ...mockContext,
      input: {
        host: 'dev.azure.com',
        organization: 'org',
        project: 'project',
        token: 'input-token',
        groupsId: [123, 456],
      },
    });

    expect(mockTaskAgentClient.getVariableGroupsById).toHaveBeenCalledWith(
      'project',
      [123, 456],
    );

    expect(mockContext.output).toHaveBeenCalledWith('variableGroups', [
      expect.objectContaining({
        id: 123,
        name: 'Test-Variable-Group-1',
      }),
      expect.objectContaining({
        id: 456,
        name: 'Test-Variable-Group-2',
      }),
    ]);

    expect(mockContext.output).toHaveBeenCalledWith('totalCount', 2);
  });

  it('should filter variable groups by name', async () => {
    mockTaskAgentClient.getVariableGroups.mockResolvedValue([
      mockVariableGroup1,
    ]);

    await action.handler({
      ...mockContext,
      input: {
        host: 'dev.azure.com',
        organization: 'org',
        project: 'project',
        token: 'input-token',
        groupName: 'Test-Variable-Group-1',
      },
    });

    expect(mockTaskAgentClient.getVariableGroups).toHaveBeenCalledWith(
      'project',
      'Test-Variable-Group-1',
    );

    expect(mockContext.output).toHaveBeenCalledWith('variableGroups', [
      expect.objectContaining({
        id: 123,
        name: 'Test-Variable-Group-1',
      }),
    ]);

    expect(mockContext.output).toHaveBeenCalledWith('totalCount', 1);
  });

  it('should set host to dev.azure.com if not provided', async () => {
    mockTaskAgentClient.getVariableGroups.mockResolvedValue([
      mockVariableGroup1,
    ]);

    await action.handler({
      ...mockContext,
      input: {
        organization: 'org',
        project: 'project',
        token: 'input-token',
      },
    });

    expect(WebApi).toHaveBeenCalledWith(
      'https://dev.azure.com/org',
      expect.any(Function),
    );

    expect(mockContext.output).toHaveBeenCalledWith('totalCount', 1);
  });

  it('should handle empty variable groups result', async () => {
    mockTaskAgentClient.getVariableGroups.mockResolvedValue([]);

    await action.handler({
      ...mockContext,
      input: {
        host: 'dev.azure.com',
        organization: 'org',
        project: 'project',
        token: 'input-token',
      },
    });

    expect(mockContext.output).toHaveBeenCalledWith('variableGroups', []);
    expect(mockContext.output).toHaveBeenCalledWith('totalCount', 0);
  });

  it('should filter out variable groups with undefined id or name', async () => {
    const invalidVariableGroup = {
      id: undefined,
      name: undefined,
      description: 'Invalid group',
    };

    mockTaskAgentClient.getVariableGroups.mockResolvedValue([
      mockVariableGroup1,
      invalidVariableGroup,
    ]);

    await action.handler({
      ...mockContext,
      input: {
        host: 'dev.azure.com',
        organization: 'org',
        project: 'project',
        token: 'input-token',
      },
    });

    expect(mockContext.output).toHaveBeenCalledWith('variableGroups', [
      expect.objectContaining({
        id: 123,
        name: 'Test-Variable-Group-1',
      }),
    ]);

    expect(mockContext.output).toHaveBeenCalledWith('totalCount', 1);
  });

  it('should handle empty groupsId array', async () => {
    mockTaskAgentClient.getVariableGroups.mockResolvedValue([
      mockVariableGroup1,
      mockVariableGroup2,
    ]);

    await action.handler({
      ...mockContext,
      input: {
        host: 'dev.azure.com',
        organization: 'org',
        project: 'project',
        token: 'input-token',
        groupsId: [],
      },
    });

    // Should fall back to getVariableGroups since array is empty
    expect(mockTaskAgentClient.getVariableGroups).toHaveBeenCalledWith(
      'project',
      undefined,
    );

    expect(mockContext.output).toHaveBeenCalledWith('totalCount', 2);
  });

  it('should return empty result if getVariableGroupsById is not available and groupsId is provided', async () => {
    // Remove the method to simulate older API version
    delete mockTaskAgentClient.getVariableGroupsById;

    await action.handler({
      ...mockContext,
      input: {
        host: 'dev.azure.com',
        organization: 'org',
        project: 'project',
        token: 'input-token',
        groupsId: [123],
      },
    });

    // Should not call getVariableGroups since we're in the groupsId branch
    expect(mockTaskAgentClient.getVariableGroups).not.toHaveBeenCalled();

    // Should return empty result since getVariableGroupsById is not available
    expect(mockContext.output).toHaveBeenCalledWith('variableGroups', []);
    expect(mockContext.output).toHaveBeenCalledWith('totalCount', 0);
  });

  it('should throw if getVariableGroups fails', async () => {
    mockTaskAgentClient.getVariableGroups.mockRejectedValue(
      new Error('API call failed'),
    );

    await expect(
      action.handler({
        ...mockContext,
        input: {
          host: 'dev.azure.com',
          organization: 'org',
          project: 'project',
          token: 'input-token',
        },
      }),
    ).rejects.toThrow(/Failed to retrieve variable groups: API call failed/);
  });

  it('should throw if getVariableGroupsById fails', async () => {
    mockTaskAgentClient.getVariableGroupsById.mockRejectedValue(
      new Error('Variable groups not found'),
    );

    await expect(
      action.handler({
        ...mockContext,
        input: {
          host: 'dev.azure.com',
          organization: 'org',
          project: 'project',
          token: 'input-token',
          groupsId: [123, 456],
        },
      }),
    ).rejects.toThrow(
      /Failed to retrieve variable groups: Variable groups not found/,
    );
  });

  it('should correctly format dates in output', async () => {
    mockTaskAgentClient.getVariableGroups.mockResolvedValue([
      mockVariableGroup1,
    ]);

    await action.handler({
      ...mockContext,
      input: {
        host: 'dev.azure.com',
        organization: 'org',
        project: 'project',
        token: 'input-token',
      },
    });

    expect(mockContext.output).toHaveBeenCalledWith('variableGroups', [
      expect.objectContaining({
        createdOn: '2024-01-01T10:00:00.000Z',
        modifiedOn: '2024-01-02T10:00:00.000Z',
      }),
    ]);
  });

  it('should handle variable groups with minimal data', async () => {
    const minimalVariableGroup = {
      id: 789,
      name: 'Minimal-Group',
      // No description, variables, dates, etc.
    };

    mockTaskAgentClient.getVariableGroups.mockResolvedValue([
      minimalVariableGroup,
    ]);

    await action.handler({
      ...mockContext,
      input: {
        host: 'dev.azure.com',
        organization: 'org',
        project: 'project',
        token: 'input-token',
      },
    });

    expect(mockContext.output).toHaveBeenCalledWith('variableGroups', [
      {
        id: 789,
        name: 'Minimal-Group',
        description: undefined,
        variables: undefined,
        type: undefined,
        createdBy: undefined,
        createdOn: undefined,
        modifiedBy: undefined,
        modifiedOn: undefined,
      },
    ]);

    expect(mockContext.output).toHaveBeenCalledWith('totalCount', 1);
  });

  it('should handle variable groups with variables correctly', async () => {
    mockTaskAgentClient.getVariableGroups.mockResolvedValue([
      mockVariableGroup1,
    ]);

    await action.handler({
      ...mockContext,
      input: {
        host: 'dev.azure.com',
        organization: 'org',
        project: 'project',
        token: 'input-token',
      },
    });

    expect(mockContext.output).toHaveBeenCalledWith('variableGroups', [
      expect.objectContaining({
        variables: {
          VAR1: { value: 'value1', isSecret: false },
          VAR2: { value: 'value2', isSecret: true },
        },
      }),
    ]);
  });
});
