/*
 * Copyright 2025 The Backstage Authors
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

//  * Copyright 2024 The Backstage Authors
//  *
//  * Licensed under the Apache License, Version 2.0 (the "License");
//  * you may not use this file except in compliance with the License.
//  * You may obtain a copy of the License at
//  *
//  *     http://www.apache.org/licenses/LICENSE-2.0
//  *
//  * Unless required by applicable law or agreed to in writing, software
//  * distributed under the License is distributed on an "AS IS" BASIS,
//  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  * See the License for the specific language governing permissions and
//  * limitations under the License.
//  */
// import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
// import {
//   DefaultAzureDevOpsCredentialsProvider,
//   ScmIntegrationRegistry,
// } from '@backstage/integration';
// import { examples } from './devopsGetTimeline.example';

// import { InputError } from '@backstage/errors';
// import {
//   getBearerHandler,
//   getPersonalAccessTokenHandler,
//   WebApi,
// } from 'azure-devops-node-api';

// // Importar interfaces de Azure DevOps
// import {
//   Timeline,
//   TimelineRecord,
//   BuildLogReference,
//   TaskResult,
//   TimelineRecordState,
//   BuildLog
// } from 'azure-devops-node-api/interfaces/BuildInterfaces';

// interface JobStatus {
//   id?: string;
//   name?: string;
//   state?: TimelineRecordState;
//   result?: TaskResult;
//   isComplete: boolean;
//   isFailed: boolean;
//   isSucceeded: boolean;
//   isInProgress: boolean;
//   startTime?: Date;
//   finishTime?: Date;
//   logReference?: BuildLogReference;
// }

// /**
//  * Creates an Azure DevOps Timeline Monitoring Scaffolder action.
//  *
//  * @remarks
//  *
//  * Retrieves and monitors build timeline from Azure DevOps, with ability to cancel on job failures and access build logs.
//  *
//  * @public
//  */
// export function createAzureDevopsTimelineAction(options: {
//   integrations: ScmIntegrationRegistry;
// }) {
//   const { integrations } = options;

//   // Función para verificar el status de un job específico
//   function checkJobStatus(timeline: Timeline, jobName: string): JobStatus | null {
//     if (!timeline?.records) return null;

//     const targetJob = timeline.records.find((record: TimelineRecord) => {
//       const recordName = record.name?.toLowerCase() || '';
//       const taskName = record.task?.name?.toLowerCase() || '';
//       const jobNameLower = jobName.toLowerCase();

//       return recordName.includes(jobNameLower) ||
//              taskName.includes(jobNameLower) ||
//              recordName === jobNameLower;
//     });

//     if (!targetJob) return null;

//     const isComplete = targetJob.state === TimelineRecordState.Completed;
//     const isFailed = targetJob.result === TaskResult.Failed;
//     const isSucceeded = targetJob.result === TaskResult.Succeeded;
//     const isInProgress = targetJob.state === TimelineRecordState.InProgress;

//     return {
//       id: targetJob.id,
//       name: targetJob.name,
//       state: targetJob.state,
//       result: targetJob.result,
//       isComplete,
//       isFailed,
//       isSucceeded,
//       isInProgress,
//       startTime: targetJob.startTime,
//       finishTime: targetJob.finishTime,
//       logReference: targetJob.log
//     };
//   }

//   // Función para obtener logs de un record específico
//   async function getBuildLogs(client: WebApi, project: string, buildId: number): Promise<BuildLog[]> {
//     try {
//       const logs = await (await client.getBuildApi()).getBuildLogs(project, buildId);
//       return logs;
//     } catch (error) {
//       return [];
//     }
//   }

//   // Función para cancelar build
//   async function cancelBuild(client: any, project: string, buildId: number): Promise<boolean> {
//     try {
//       const buildUpdate = {
//         status: 4 // BuildStatus.Cancelling
//       };

//       await client.updateBuild(buildUpdate, project, buildId);
//       return true;
//     } catch (error) {
//       return false;
//     }
//   }

//   // Función para verificar si el build está completo
//   function isBuildComplete(timeline: Timeline): boolean {
//     if (!timeline?.records) return false;

//     return timeline.records.every((record: TimelineRecord) =>
//       record.state === TimelineRecordState.Completed ||
//       record.state === TimelineRecordState.Pending
//     );
//   }

//   // Función mejorada para log con información de logs
//   async function logTimelineWithLogs(
//     ctx: any,
//     client: any,
//     project: string,
//     buildId: number,
//     timeline: Timeline,
//     monitoredJobsStatus: JobStatus[]
//   ) {
//     // Log resumido del timeline
//     const totalRecords = timeline.records?.length || 0;
//     const completedRecords = timeline.records?.filter(r => r.state === TimelineRecordState.Completed).length || 0;
//     const inProgressRecords = timeline.records?.filter(r => r.state === TimelineRecordState.InProgress).length || 0;
//     const failedRecords = timeline.records?.filter(r => r.result === TaskResult.Failed).length || 0;

//     ctx.logger.info(`Timeline Summary - Total: ${totalRecords}, Completed: ${completedRecords}, In Progress: ${inProgressRecords}, Failed: ${failedRecords}`);

//     if (monitoredJobsStatus.length > 0) {
//       ctx.logger.info('=== MONITORED JOBS STATUS ===');

//       for (const job of monitoredJobsStatus) {
//         const record = timeline.records?.find(r => r.id === job.id);

//         // Calcular duración si está disponible
//         const duration = job.startTime && job.finishTime
//           ? `${Math.round((new Date(job.finishTime).getTime() - new Date(job.startTime).getTime()) / 1000)}s`
//           : 'N/A';

//         ctx.logger.info(`📋 ${job.name}`);
//         ctx.logger.info(`   ├─ State: ${job.state} | Result: ${job.result || 'N/A'}`);
//         ctx.logger.info(`   ├─ Duration: ${duration}`);

//         // Información del log
//         if (record?.log) {
//           ctx.logger.info(`   ├─ Log ID: ${record.log.id}`);
//           ctx.logger.info(`   ├─ Log Type: ${record.log.type}`);
//           ctx.logger.info(`   ├─ Log URL: ${record.log.url}`);

//           // Si el job falló, obtener los logs para ver el error
//           if (job.isFailed && record.log.id) {
//             ctx.logger.info(`   ├─ 🔍 Fetching error logs...`);
//             const logContent = await getBuildLogs(client, project, buildId);

//             if (logContent) {
//               // Mostrar las últimas líneas del log (donde suelen estar los errores)
//               const logLines = logContent.split('\n');
//               const relevantLines = logLines
//                 .filter(line => line.trim()) // Filtrar líneas vacías
//                 .filter(line =>
//                   line.toLowerCase().includes('error') ||
//                   line.toLowerCase().includes('failed') ||
//                   line.toLowerCase().includes('exception') ||
//                   line.includes('##[error]') ||
//                   line.includes('EXIT CODE')
//                 )
//                 .slice(-15); // Últimas 15 líneas relevantes

//               if (relevantLines.length > 0) {
//                 ctx.logger.error(`   ├─ 📄 Error log entries:`);
//                 relevantLines.forEach(line => {
//                   ctx.logger.error(`   │     ${line.trim()}`);
//                 });
//               } else {
//                 // Si no hay líneas de error específicas, mostrar las últimas 10 líneas
//                 const lastLines = logLines.slice(-10).filter(line => line.trim());
//                 ctx.logger.info(`   ├─ 📄 Last log entries:`);
//                 lastLines.forEach(line => {
//                   ctx.logger.info(`   │     ${line.trim()}`);
//                 });
//               }
//             } else {
//               ctx.logger.warn(`   ├─ ⚠️  Could not fetch logs for ID ${record.log.id}`);
//             }
//           } else if (job.isInProgress && record.log.id) {
//             // Para jobs en progreso, mostrar las últimas líneas para seguimiento
//             ctx.logger.info(`   ├─ 🔍 Fetching current progress logs...`);
//             const logContent = await getBuildLogs(client, project, buildId, record.log.id);
//             if (logContent) {
//               const logLines = logContent.split('\n');
//               const lastLines = logLines.slice(-5).filter(line => line.trim()); // Últimas 5 líneas
//               if (lastLines.length > 0) {
//                 ctx.logger.info(`   ├─ 📄 Current progress:`);
//                 lastLines.forEach(line => {
//                   ctx.logger.info(`   │     ${line.trim()}`);
//                 });
//               }
//             }
//           }
//         } else {
//           ctx.logger.info(`   ├─ 📄 No log reference available`);
//         }

//         ctx.logger.info(`   └─ Status: ${job.isComplete ? '✅ Complete' : job.isInProgress ? '⏳ In Progress' : '⏸️ Pending'}`);
//         ctx.logger.info('');
//       }

//       ctx.logger.info('============================');
//     }

//     // Log de TODOS los records con sus log references (para debug detallado)
//     ctx.logger.debug('=== ALL RECORDS LOG REFERENCES ===');
//     timeline.records?.forEach((record, index) => {
//       if (record.log) {
//         ctx.logger.debug(`${index + 1}. ${record.name || 'Unnamed'} (${record.type}) - Log ID: ${record.log.id}, URL: ${record.log.url}`);
//       } else {
//         ctx.logger.debug(`${index + 1}. ${record.name || 'Unnamed'} (${record.type}) - No log reference`);
//       }
//     });
//     ctx.logger.debug('===================================');
//   }

//   return createTemplateAction({
//     id: 'azure:build:timeline:get',
//     description: 'Retrieves and monitors build timeline with job-specific monitoring, log access, and cancellation capabilities',
//     examples,
//     schema: {
//       input: {
//         host: d =>
//           d
//             .string()
//             .describe('The host of Azure DevOps. Defaults to dev.azure.com')
//             .optional(),
//         organization: d =>
//           d.string().describe('The name of the Azure DevOps organization.'),
//         project: d => d.string().describe('The name of the Azure project.'),
//         buildId: d =>
//           d.string().describe('The build ID to retrieve.'),
//         jobsToMonitor: d =>
//           d
//             .array()
//             .items(d.string())
//             .describe('Array of job names to monitor (supports partial matching)')
//             .optional(),
//         cancelOnJobFailure: d =>
//           d
//             .boolean()
//             .describe('Whether to cancel the build if a monitored job fails')
//             .optional(),
//         fetchLogsOnFailure: d =>
//           d
//             .boolean()
//             .describe('Whether to fetch and display logs when a job fails')
//             .optional(),
//         showProgressLogs: d =>
//           d
//             .boolean()
//             .describe('Whether to show progress logs for in-progress jobs')
//             .optional(),
//         pollingInterval: d =>
//           d
//             .number()
//             .describe('Seconds between each poll for timeline update. 0 = no polling.')
//             .optional(),
//         pipelineTimeout: d =>
//           d
//             .number()
//             .describe('Max. seconds to wait for timeline completion. Only effective if `pollingInterval` is greater than zero.')
//             .optional(),
//         token: d =>
//           d
//             .string()
//             .describe('Token to use for Azure DevOps REST API.')
//             .optional(),
//       },
//       output: {
//         timeline: d => d.object().describe('The final timeline data'),
//         monitoredJobs: d => d.array(d).describe('Status of monitored jobs'),
//         buildCancelled: d => d.boolean().describe('Whether the build was cancelled'),
//         completedSuccessfully: d => d.boolean().describe('Whether monitoring completed successfully'),
//         failedJobs: d => d.array().describe('List of jobs that failed during monitoring')
//       },
//     },
//     async handler(ctx) {
//       const {
//         host = 'dev.azure.com',
//         organization,
//         project,
//         buildId,
//         jobsToMonitor = ['CD', 'Continuous Delivery', 'Helm Deployment'],
//         cancelOnJobFailure = true,
//         fetchLogsOnFailure = true,
//         showProgressLogs = false,
//         pollingInterval,
//         pipelineTimeout,
//       } = ctx.input;

//       const url = `https://${host}/${organization}`;
//       const credentialProvider =
//         DefaultAzureDevOpsCredentialsProvider.fromIntegrations(integrations);
//       const credentials = await credentialProvider.getCredentials({ url: url });

//       if (credentials === undefined && ctx.input.token === undefined) {
//         throw new InputError(
//           `No credentials provided for ${url}, please check your integrations config`,
//         );
//       }

//       const authHandler =
//         ctx.input.token || credentials?.type === 'pat'
//           ? getPersonalAccessTokenHandler(ctx.input.token ?? credentials!.token)
//           : getBearerHandler(credentials!.token);

//       const webApi = new WebApi(url, authHandler);
//       const client = await webApi.getBuildApi();

//       let buildCancelled = false;
//       let monitoredJobsStatus: JobStatus[] = [];
//       const failedJobs: JobStatus[] = [];

//       try {
//         const buildIdAsInt = parseInt(buildId, 10);
//         let timeline: Timeline = await client.getBuildTimeline(project, buildIdAsInt);

//         ctx.logger.info(`🚀 Starting timeline monitoring for build ${buildIdAsInt}`);

//         // Log inicial con información de logs
//         await logTimelineWithLogs(ctx, client, project, buildIdAsInt, timeline, []);

//         let shouldContinuePolling = true;
//         let timeoutExceeded = false;

//         if ((pollingInterval || 0) > 0) {
//           let totalRunningTime = 0;
//           const delayInSec = pollingInterval!;

//           ctx.logger.info(`⏱️  Starting polling every ${delayInSec}s (timeout: ${pipelineTimeout || 'none'}s)`);

//           do {
//             await new Promise(f => setTimeout(f, delayInSec * 1000));

//             timeline = await client.getBuildTimeline(project, buildIdAsInt);

//             // Verificar estado de los jobs monitoreados
//             monitoredJobsStatus = jobsToMonitor
//               .map(jobName => checkJobStatus(timeline, jobName))
//               .filter((status): status is JobStatus => status !== null);

//             // Log con información de logs
//             await logTimelineWithLogs(ctx, client, project, buildIdAsInt, timeline, monitoredJobsStatus);

//             // Verificar si algún job crítico falló
//             if (cancelOnJobFailure) {
//               for (const jobStatus of monitoredJobsStatus) {
//                 if (jobStatus.isComplete && jobStatus.isFailed) {
//                   ctx.logger.warn(`❌ Job '${jobStatus.name}' failed. Attempting to cancel build...`);

//                   // Agregar a la lista de jobs fallidos
//                   if (!failedJobs.some(fj => fj.id === jobStatus.id)) {
//                     failedJobs.push(jobStatus);
//                   }

//                   // Obtener logs del job fallido antes de cancelar (si está habilitado)
//                   if (fetchLogsOnFailure) {
//                     const failedRecord = timeline.records?.find(r => r.id === jobStatus.id);
//                     if (failedRecord?.log?.id) {
//                       ctx.logger.error(`📄 Retrieving detailed failure logs for job '${jobStatus.name}'...`);
//                       const errorLogs = await getBuildLogs(client, project, buildIdAsInt, failedRecord.log.id);
//                       if (errorLogs) {
//                         const logLines = errorLogs.split('\n');

//                         // Buscar líneas con errores específicos
//                         const errorLines = logLines.filter(line =>
//                           line.toLowerCase().includes('error') ||
//                           line.toLowerCase().includes('failed') ||
//                           line.toLowerCase().includes('exception') ||
//                           line.includes('##[error]') ||
//                           line.toLowerCase().includes('exit code')
//                         );

//                         if (errorLines.length > 0) {
//                           ctx.logger.error('=== DETAILED FAILURE LOGS ===');
//                           errorLines.slice(-20).forEach(line => ctx.logger.error(line.trim()));
//                           ctx.logger.error('============================');
//                         } else {
//                           // Si no hay errores específicos, mostrar las últimas líneas
//                           const lastLines = logLines.slice(-30).filter(line => line.trim());
//                           ctx.logger.error('=== LAST LOG ENTRIES ===');
//                           lastLines.forEach(line => ctx.logger.error(line.trim()));
//                           ctx.logger.error('=======================');
//                         }
//                       }
//                     }
//                   }

//                   const cancelled = await cancelBuild(client, project, buildIdAsInt);

//                   if (cancelled) {
//                     ctx.logger.info(`🛑 Build ${buildIdAsInt} cancellation requested successfully`);
//                     buildCancelled = true;
//                     shouldContinuePolling = false;
//                     break;
//                   } else {
//                     ctx.logger.error(`❌ Failed to cancel build ${buildIdAsInt}`);
//                   }
//                 }
//               }
//             }

//             // Verificar si el build completo terminó
//             if (isBuildComplete(timeline)) {
//               ctx.logger.info('✅ Build monitoring completed - all steps finished');
//               shouldContinuePolling = false;
//             }

//             totalRunningTime += delayInSec;
//             timeoutExceeded = pipelineTimeout !== undefined && totalRunningTime > pipelineTimeout;

//             if (!shouldContinuePolling && !timeoutExceeded) {
//               ctx.logger.info(`⏱️  Total monitoring time: ${totalRunningTime}s`);
//             }

//           } while (shouldContinuePolling && !timeoutExceeded);
//         }

//         // Manejo de timeout
//         if (timeoutExceeded && !buildCancelled) {
//           ctx.logger.warn(`⏱️  Pipeline timeout exceeded (${pipelineTimeout}s). Attempting to cancel...`);
//           buildCancelled = await cancelBuild(client, project, buildIdAsInt);
//           if (buildCancelled) {
//             ctx.logger.info('🛑 Build cancelled due to timeout');
//           } else {
//             ctx.logger.error('❌ Failed to cancel build after timeout');
//           }
//         }

//         // Resultado final
//         const completedSuccessfully = !buildCancelled && !timeoutExceeded && failedJobs.length === 0;

//         ctx.logger.info('=== FINAL MONITORING SUMMARY ===');
//         ctx.logger.info(`✅ Monitoring completed successfully: ${completedSuccessfully}`);
//         ctx.logger.info(`🛑 Build cancelled: ${buildCancelled}`);
//         ctx.logger.info(`⏱️  Timeout exceeded: ${timeoutExceeded}`);
//         ctx.logger.info(`❌ Failed jobs count: ${failedJobs.length}`);
//         if (failedJobs.length > 0) {
//           ctx.logger.info(`❌ Failed jobs: ${failedJobs.map(j => j.name).join(', ')}`);
//         }
//         ctx.logger.info('================================');

//         // Establecer outputs
//         ctx.output('timeline', timeline);
//         ctx.output('monitoredJobs', monitoredJobsStatus);
//         ctx.output('buildCancelled', buildCancelled);
//         ctx.output('completedSuccessfully', completedSuccessfully);
//         ctx.output('failedJobs', failedJobs);

//       } catch (error) {
//         const errorMessage =
//           error instanceof Error ? error.message : 'Unknown error';
//         ctx.logger.error(`❌ Failed to retrieve/monitor build timeline: ${errorMessage}`);
//         throw new InputError(
//           `Failed to retrieve/monitor build timeline: ${errorMessage}`,
//         );
//       }
//     },
//   });
// }
