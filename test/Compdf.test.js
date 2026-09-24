const assert = require('node:assert/strict');
const { test } = require('node:test');
const { NodeApiError } = require('n8n-workflow');
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
