import { Resource } from 'animegarden';
import { PrismaClient } from '@prisma/client';

import { transformResource } from '../src/scheduled';

// pscale connect animegarden main
const client = new PrismaClient({
  datasources: { db: { url: 'mysql://root@127.0.0.1:3306/animegarden' } }
});

export async function uploadUsers(users: Array<{ id: number; name: string }>) {
  const resp = await client.user.createMany({ data: users });
  return resp;
}

export async function uploadTeams(teams: Array<{ id: number; name: string }>) {
  const resp = await client.team.createMany({ data: teams });
  return resp;
}

export async function uploadResources(resources: Resource[]) {
  const resp = await client.resource.createMany({ data: resources.map(transformResource) });
  return resp;
}
