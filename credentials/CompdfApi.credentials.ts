
import {
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class CompdfApi implements ICredentialType {
  name = 'compdfApi';
  displayName = 'ComPDF API';
  documentationUrl = 'https://github.com/youna12345/n8n-nodes-compdf#credentials';
  icon = 'file:../nodes/Compdf/compdf.svg' as const;
  authenticate = {
    type: 'generic' as const,
    properties: {
      headers: {
        'x-api-key': '={{$credentials.apiKey}}',
      },
    },
  };
  properties: INodeProperties[] = [
    {
      displayName: 'Public API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
    },
  ];

  test: ICredentialTestRequest = {
    request: {
      baseURL: 'https://api-server.compdf.com',
      url: '/server/v2/tool/support',
      method: 'GET',
    },
  };
}
