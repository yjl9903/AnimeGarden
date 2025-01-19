import { retryFn } from '@animegarden/client';

const Users = new Map<string, { provider: 'moe'; providerId: string; name: string }>();

const Teams = new Map<
  string,
  { provider: 'moe'; providerId: string; name: string; avatar: string }
>();

export async function fetchUser(
  ofetch: (request: string, init?: RequestInit) => Promise<Response>,
  id: string
) {
  if (Users.get(id)) {
    return Users.get(id)!;
  }

  const resp = await retryFn(async () => {
    const resp = await ofetch(`https://bangumi.moe/api/user/fetch`, {
      method: 'POST',
      body: JSON.stringify({ _ids: [id] }),
      headers: new Headers([
        [
          'User-Agent',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'
        ]
      ])
    });
    if (!resp.ok) {
      throw new Error(resp.statusText, { cause: resp });
    }
    return resp;
  }, 10);
  if (!resp.ok) {
    throw new Error('Failed connecting https://bangumi.moe/');
  }

  const data = await resp.json();

  const user = {
    provider: 'moe',
    providerId: id,
    name: data[0].username
  } as const;

  Users.set(id, user);

  return user;
}

export async function fetchTeam(
  ofetch: (request: string, init?: RequestInit) => Promise<Response>,
  id: string
) {
  if (Teams.get(id)) {
    return Teams.get(id)!;
  }

  const resp = await retryFn(async () => {
    const resp = await ofetch(`https://bangumi.moe/api/team/fetch`, {
      method: 'POST',
      body: JSON.stringify({ _ids: [id] }),
      headers: new Headers([
        [
          'User-Agent',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'
        ]
      ])
    });
    if (!resp.ok) {
      throw new Error(resp.statusText, { cause: resp });
    }
    return resp;
  }, 10);
  if (!resp.ok) {
    throw new Error('Failed connecting https://bangumi.moe/');
  }

  const data = await resp.json();

  const team = {
    provider: 'moe',
    providerId: id,
    name: data[0].name,
    avatar: data[0].icon
  } as const;

  Teams.set(id, team);

  return team;
}
