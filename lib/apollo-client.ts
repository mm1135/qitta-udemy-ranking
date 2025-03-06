import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { registerApolloClient } from '@apollo/experimental-nextjs-app-support/rsc';

export const { getClient } = registerApolloClient(() => {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: process.env.GRAPHQL_URL || 'http://localhost:3000/api/graphql',
      // サーバー側で実行する場合はcredentialsを含めない
      credentials: typeof window === 'undefined' ? 'omit' : 'same-origin',
    }),
  });
}); 