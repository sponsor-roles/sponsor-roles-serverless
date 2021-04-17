import type { VercelRequest } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'crypto';
import {
	APIGuildMember,
	APIMessage,
	APIUser,
	RESTPatchAPIGuildMemberResult,
	Routes,
	Snowflake,
} from 'discord-api-types/v8';
import fetch from 'node-fetch';
import { URLSearchParams } from 'node:url';
import { META_REGEX } from './_constants';
import type { GithubFile, GithubGist } from './_types';
import { Rest } from '@cordis/rest';

const { GITHUB_WEBHOOK_SECRET, LOG_CHANNEL, DISCORD_TOKEN, DISCORD_GUILD_ID } = process.env as Record<string, string>;
const rest = new Rest(DISCORD_TOKEN);

export function verifyRequest(req: VercelRequest) {
	const sig = Buffer.from(req.headers['X-Hub-Signature-256'] as string);
	const hmac = createHmac('sha256', GITHUB_WEBHOOK_SECRET);
	const digest = Buffer.from(`sha256=${hmac.update(req.body).digest('hex')}`, 'utf8');
	if (sig.length !== digest.length || !timingSafeEqual(digest, sig)) {
		return false;
	}
	return true;
}

export async function fetchUserGists(user: string, page = 1): Promise<GithubGist[]> {
	const query = new URLSearchParams();
	query.set('per_page', '100');
	query.set('page', String(page));

	const response = await fetch(`https://api.github.com/users/fyko/gists?${query}`);
	const gists = (await response.json()) as GithubGist[];
	if (gists.length < 100) return gists;

	const next = await fetchUserGists(user, page + 1);
	return gists.concat(next);
}

export function sendLog(content: string, userId?: string): Promise<void> {
	// @ts-expect-error
	return void fetch(Routes.channelMessages(LOG_CHANNEL), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bot ${DISCORD_TOKEN}`,
		},
		body: JSON.stringify({ content, ...(userId ? { allowed_mentions: { users: [userId] } } : {}) }),
	});
}

export async function fetchUser(id: Snowflake): Promise<APIUser | null> {
	const response = await fetch(Routes.user(id), {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bot ${DISCORD_TOKEN}`,
		},
	});
	if (response.status !== 200) return null;
	return response.json();
}

export async function fetchMember(id: Snowflake): Promise<APIGuildMember | null> {
	const response = await fetch(Routes.guildMember(DISCORD_GUILD_ID as Snowflake, id), {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bot ${DISCORD_TOKEN}`,
		},
	});
	if (response.status !== 200) return null;
	return response.json();
}

export async function getGistsAndFetchUser(name: string, cancel = false): Promise<APIUser | 'log' | null> {
	const sponsorGists = await fetchUserGists(name);
	const metaGist = sponsorGists.find((g) => g.description.toLowerCase() === 'sponsor roles metadata');
	if (!metaGist)
		return cancel ? null : sendLog(`${name} doesn't have a Gist with their Discord information.`).then(() => 'log');
	const file = metaGist.files['ME.txt'] as GithubFile | undefined;
	if (!file) return cancel ? null : sendLog(`${name} doesn't have a \`ME.txt\` file on their Gist.`).then(() => 'log');

	const response = await fetch(file.raw_url);
	const meta = await response.text();
	const exec = META_REGEX.exec(meta);
	if (!exec) return cancel ? null : sendLog(`${name}'s \`ME.txt\` data didn't match our RegEx.`).then(() => 'log');
	const { id } = exec.groups as { id: Snowflake };

	const user = cancel ? null : await fetchUser(id);
	if (!user) return sendLog(`${name}'s Discord account they provided does not exist.`).then(() => 'log');

	return user;
}

export function resolveRoles(tier: string): Snowflake[] {
	const catchAll = process.env.SPONSOR_ROLES;
	if (catchAll) return catchAll.split(',') as Snowflake[];

	const tierRoles = process.env[`SPONSOR_ROLES_${tier}`];
	if (tierRoles) return tierRoles.split(',') as Snowflake[];

	return [];
}
export async function updateUserRoles(
	user: APIUser,
	roles: Snowflake[],
	remove = false,
): Promise<RESTPatchAPIGuildMemberResult | { error: Record<string, unknown> } | null> {
	const member = await fetchMember(user.id);
	if (!member) return null;
	const response = await fetch(Routes.guildMember(DISCORD_GUILD_ID as Snowflake, user.id), {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bot ${DISCORD_TOKEN}`,
		},
		body: JSON.stringify({
			roles: remove ? member.roles.filter((r) => !roles.includes(r)) : member.roles.concat(roles),
		}),
	});
	const body = await response.json();
	if (response.status !== 200) return { error: body };
	return response.json();
}

export async function fetchLogs(after?: string): Promise<APIMessage[]> {
	const messages: APIMessage[] = await rest.get(
		`${Routes.channelMessages(LOG_CHANNEL as Snowflake)}${after ? `?after=${after}` : ''}`,
	);
	if (messages.length > 100) return messages;

	const last = messages[messages.length - 1].id;
	const next = await fetchLogs(last);
	return messages.concat(next);
}
