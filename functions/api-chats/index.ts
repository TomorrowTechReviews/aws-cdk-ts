import { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda';
import * as chat from './chat';
import { notAllowedResponse } from '@shared/index';

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event): Promise<any> => {
  const httpMethod = event.requestContext.http.method;
  const routeKey = event.routeKey.split(' ')[1];
  const pathParameters = event.pathParameters;
  const userId = event.requestContext.authorizer.jwt.claims.sub as string;

  await chat.seedData();

  if (httpMethod === 'GET' && routeKey === '/chats/{id}') {
    return chat.getById(userId, pathParameters?.id || '');
  } else if (httpMethod === 'GET' && routeKey === '/chats') {
    return chat.list(userId);
  } else if (httpMethod === 'POST' && routeKey === '/chats') {
    return chat.create(userId, event.body || '');
  }

  return notAllowedResponse();
};
