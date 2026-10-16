const assert = require('node:assert/strict');
const { test } = require('node:test');
const { NodeApiError, NodeHelpers, NodeOperationError } = require('n8n-workflow');
const { CompdfApi } = require('../dist/credentials/CompdfApi.credentials');
const { Compdf } = require('../dist/nodes/Compdf/Compdf.node');

function executionContext({ parameters, request, continueOnFail = false, itemCount = 1 }) {
  return {
    getInputData: () => Array.from({ length: itemCount }, () => ({ json: {} })),
    getNodeParameter: (name, index) => parameters[name]?.[index],
    getNode: () => ({ name: 'ComPDF', type: 'compdf', typeVersion: 1 }),
    continueOnFail: () => continueOnFail,
    helpers: {
      httpRequestWithAuthentication: request,
      assertBinaryData: () => ({ fileName: 'sample.pdf' }),
      getBinaryDataBuffer: async () => Buffer.from('pdf'),
    },
  };
}

test('groups all 17 existing operations under four resource-specific dropdowns', () => {
  const properties = new Compdf().description.properties;
  const resource = properties.find((property) => property.name === 'resource');
  assert.deepEqual(resource.options, [
    { name: 'Document Conversion', value: 'documentConversion' },
    { name: 'Intelligent Document Processing', value: 'intelligentDocumentProcessing' },
    { name: 'PDF', value: 'pdf' },
    { name: 'Task', value: 'task' },
  ]);
  assert.equal(resource.default, 'documentConversion');

  const expectedOperations = {
    documentConversion: [
      'imageToOthers', 'othersToPdf', 'pdfToEditablePdf', 'pdfToJson', 'pdfToOthers', 'pdfToWord',
    ],
    intelligentDocumentProcessing: ['intelligentDocumentExtraction', 'intelligentDocumentParsing'],
    pdf: [
      'compareDocuments', 'compress', 'pdfExtract', 'pdfGeneration',
      'pdfMerger', 'pdfPageTools', 'pdfSplit', 'security',
    ],
    task: ['getTaskInfo'],
  };
  const operationProperties = properties.filter((property) => property.name === 'operation');
  assert.equal(operationProperties.length, 4);
  const values = [];
  for (const [resourceName, expected] of Object.entries(expectedOperations)) {
    const matching = operationProperties.filter(
      (property) => property.displayOptions?.show?.resource?.includes(resourceName),
    );
    assert.equal(matching.length, 1, `one operation dropdown for ${resourceName}`);
    const operation = matching[0];
    assert.deepEqual(operation.displayOptions.show.resource, [resourceName]);
    assert.deepEqual(operation.options.map((option) => option.value), expected);
    assert.ok(expected.includes(operation.default));
    values.push(...expected);
  }
  assert.equal(new Set(values).size, 17);
});

test('n8n resolves each resource default and displays only the matching operation dropdown', () => {
  const { description } = new Compdf();
  const defaults = {
    documentConversion: 'pdfToWord',
    intelligentDocumentProcessing: 'intelligentDocumentExtraction',
    pdf: 'compress',
    task: 'getTaskInfo',
  };
  for (const [resource, operation] of Object.entries(defaults)) {
    const node = { typeVersion: 1 };
    const parameters = NodeHelpers.getNodeParameters(
      description.properties, { resource }, true, false, node, description,
    );
    assert.equal(parameters.operation, operation);
    const visible = description.properties.filter((property) => NodeHelpers.displayParameter(
      parameters, property, node, description,
    ));
    assert.equal(visible.filter((property) => property.name === 'operation').length, 1);
    assert.equal(visible.some((property) => property.name === 'taskId'), resource === 'task');
    assert.equal(visible.some((property) => property.name === 'binaryPropertyName'), resource !== 'task');
  }
});

test('all legacy operations execute with their saved parameters and no resource value', async () => {
  const node = new Compdf();
  const endpoints = {
    pdfToWord: 'pdf/docx',
    pdfToJson: 'pdf/json',
    pdfToEditablePdf: 'pdf/editable',
    intelligentDocumentExtraction: 'idp/documentExtract',
    intelligentDocumentParsing: 'idp/documentParsing',
    pdfGeneration: 'pdf/generate',
    pdfMerger: 'pdf/merge',
    pdfSplit: 'pdf/split',
    pdfExtract: 'pdf/extract',
    compress: 'pdf/compress',
    compareDocuments: 'pdf/contentCompare',
    pdfToOthers: 'pdf/xlsx',
    othersToPdf: 'docx/pdf',
    imageToOthers: 'png/docx',
    pdfPageTools: 'pdf/rotate',
    security: 'pdf/addWatermark',
    getTaskInfo: null,
  };
  for (const [operation, path] of Object.entries(endpoints)) {
    const saved = {
      operation, binaryPropertyName: 'data', parameter: '{}', language: '2',
      executeTypeUrl: path, taskId: 'existing-task',
    };
    const resolved = NodeHelpers.getNodeParameters(
      node.description.properties, saved, true, false, { typeVersion: 1 }, node.description,
    );
    assert.equal(resolved.operation, operation, `preserve ${operation}`);
    let requestOptions;
    const context = executionContext({
      parameters: Object.fromEntries(Object.entries(resolved).map(([name, value]) => [name, [value]])),
      request: async (_credential, options) => {
        requestOptions = options;
        return { taskId: 'existing-task' };
      },
    });
    const [output] = await node.execute.call(context);
    const expectedUrl = path
      ? `https://api-server.compdf.com/server/v2/processAsync/${path}`
      : 'https://api-server.compdf.com/server/v2/task/taskInfo';
    assert.equal(requestOptions.url, expectedUrl, operation);
    assert.equal(requestOptions.method, path ? 'POST' : 'GET', operation);
    assert.deepEqual(output, [{ json: { taskId: 'existing-task' }, pairedItem: { item: 0 } }]);
  }
});

test('continues after an HTTP failure and preserves input item pairing', async () => {
  const calls = [];
  const context = executionContext({
    parameters: { operation: ['getTaskInfo', 'getTaskInfo'], taskId: ['first', 'second'] },
    itemCount: 2,
    continueOnFail: true,
    request: async (credential, options) => {
      calls.push({ credential, options });
      if (options.qs.taskId === 'first') throw new Error('Request failed');
      return { data: { taskId: 'second' } };
    },
  });

  const [output] = await new Compdf().execute.call(context);
  assert.deepEqual(output, [
    { json: { error: 'Request failed' }, pairedItem: { item: 0 } },
    { json: { taskId: 'second' }, pairedItem: { item: 1 } },
  ]);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(({ credential }) => credential === 'compdfApi'));
  assert.ok(calls.every(({ options }) => !options.headers?.['x-api-key']));
});

test('keeps the HTTP status in NodeApiError when continue on fail is disabled', async () => {
  const context = executionContext({
    parameters: { operation: ['getTaskInfo'], taskId: ['first'] },
    request: async () => {
      throw { message: 'Unauthorized', statusCode: 401, response: { body: { code: 'INVALID_KEY' } } };
    },
  });

  await assert.rejects(
    () => new Compdf().execute.call(context),
    (error) => error instanceof NodeApiError
      && error.httpCode === '401'
      && error.errorResponse.response.body.code === 'INVALID_KEY',
  );
});

test('preserves an existing NodeApiError instance and its HTTP context', async () => {
  let originalError;
  const context = executionContext({
    parameters: { operation: ['getTaskInfo'], taskId: ['first'] },
    request: async () => { throw originalError; },
  });
  originalError = new NodeApiError(
    context.getNode(),
    { message: 'Forbidden', statusCode: 403, response: { body: { code: 'FORBIDDEN' } } },
    { itemIndex: 0 },
  );

  await assert.rejects(
    () => new Compdf().execute.call(context),
    (error) => error === originalError && error.httpCode === '403' && error.context.itemIndex === 0,
  );
});

test('preserves NodeOperationError and the failing input index for an empty task ID', async () => {
  const calls = [];
  const context = executionContext({
    parameters: { operation: ['getTaskInfo', 'getTaskInfo'], taskId: ['first', ''] },
    itemCount: 2,
    request: async (_credential, options) => {
      calls.push(options);
      return { data: { taskId: 'first' } };
    },
  });

  await assert.rejects(
    () => new Compdf().execute.call(context),
    (error) => error instanceof NodeOperationError
      && error.message === 'Task ID is required'
      && error.context.itemIndex === 1,
  );
  assert.equal(calls.length, 1);
});

test('file processing uses credential authentication with multipart body', async () => {
  let requestOptions;
  const context = executionContext({
    parameters: {
      operation: ['pdfToWord'],
      binaryPropertyName: ['data'],
      parameter: ['{}'],
      language: ['2'],
    },
    request: async (credential, options) => {
      assert.equal(credential, 'compdfApi');
      requestOptions = options;
      return { taskId: 'created' };
    },
  });

  const [output] = await new Compdf().execute.call(context);
  assert.equal(requestOptions.method, 'POST');
  assert.ok(requestOptions.body instanceof FormData);
  assert.equal(requestOptions.headers, undefined);
  assert.equal(output[0].json.taskId, 'created');
  assert.equal(new CompdfApi().authenticate.properties.headers['x-api-key'], '={{$credentials.apiKey}}');
});
