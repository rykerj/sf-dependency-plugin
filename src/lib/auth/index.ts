/**
 * Auth module — piggybacks entirely on existing SF CLI authentication.
 * No separate credential management. Uses @salesforce/core Org and Connection.
 *
 * Usage:
 *   const { connection } = await getSfConnection('myOrgAlias');
 *   const result = await connection.tooling.query('SELECT ...');
 */

export interface SfConnection {
  query: <T>(soql: string) => Promise<{ records: T[] }>;
  tooling: {
    query: <T>(soql: string) => Promise<{ records: T[] }>;
  };
}

export interface AuthResult {
  connection: SfConnection;
  orgAlias: string;
  instanceUrl: string;
}

/**
 * Returns a live jsforce Connection for the given org alias or username.
 * Requires the org to already be authenticated via SF CLI (sf org login ...).
 *
 * @salesforce/core is a peer dependency provided by the SF CLI plugin runtime.
 * It is NOT bundled — do not import statically at the top of CLI command files
 * that run before plugin initialization completes.
 */
export async function getSfConnection(orgAlias: string): Promise<AuthResult> {
  // Dynamic import — @salesforce/core is provided by SF CLI plugin runtime
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Org } = require('@salesforce/core');

  const org = await Org.create({ aliasOrUsername: orgAlias });
  const connection = org.getConnection();

  return {
    connection,
    orgAlias,
    instanceUrl: connection.instanceUrl,
  };
}

/**
 * Wraps a raw jsforce connection into the ToolingApiClient interface
 * expected by ToolingApiResolver. Targets the Tooling API endpoint.
 */
export function buildToolingApiClient(connection: SfConnection) {
  return {
    query: async <T>(soql: string): Promise<{ records: T[] }> => {
      return connection.tooling.query<T>(soql);
    },
  };
}