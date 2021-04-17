import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { APIUser } from 'discord-api-types';
import { inspect } from 'util';
import { GithubSponsorshipPayload, GithubSponsorshipPayloadAction } from './_types';
import {
	fetchLogs,
	fetchUser,
	getGistsAndFetchUser,
	resolveRoles,
	sendLog,
	updateUserRoles,
	verifyRequest,
} from './_util';

export default async (req: VercelRequest, res: VercelResponse) => {
	if (req.method?.toUpperCase() !== 'POST') {
		return res.status(405).send({
			success: false,
			message: 'Can only POST to this endpoint.',
		});
	}
	if (!verifyRequest(req)) return res.status(401).send(`Request body digest did not match signature.`);
	void res.status(200);

	const payload = req.body as GithubSponsorshipPayload;

	if (payload.action === GithubSponsorshipPayloadAction.CREATED) {
		const {
			sponsorship: { sponsor, tier },
		} = payload;

		const user = await getGistsAndFetchUser(sponsor.login);
		if (!user || user === 'log') return;

		const rolesToAply = resolveRoles(tier.node_id);
		if (!rolesToAply.length)
			return sendLog(
				`<@${user.id}> (\`${sponsor.login}:${sponsor.node_id}\`) just sponsored but there are no configured roles to apply!`,
			);

		const applied = await updateUserRoles(user, rolesToAply);
		if (!applied) {
			return sendLog(`<@${user.id}> (\`${sponsor.node_id}\`) just sponsored but isn't in the server!`, user.id);
		}
		// @ts-expect-error
		if (typeof applied.error !== 'undefined') {
			return sendLog(
				`<@${user.id}> (\`${sponsor.login}:${
					sponsor.node_id

					// @ts-expect-error
				}\`) just sponsored but applying roles failed.\n\`\`\`\n${inspect(applied.error, true, 4)}\`\`\`.`,
				user.id,
			);
		}

		return sendLog(
			`<@${user.id}> (\`${sponsor.login}:${sponsor.node_id}\`) just sponsored for ${payload.sponsorship.tier.monthly_price_in_dollars} a month!`,
			user.id,
		);
	}

	if (payload.action === GithubSponsorshipPayloadAction.CANCELLED) {
		const {
			sponsorship: { sponsor, tier },
		} = payload;

		const _user = await getGistsAndFetchUser(sponsor.login);
		let user: APIUser;
		if (_user === 'log') return;
		if (_user === null) {
			// this is obviously a bad idea and pretty jank
			const messages = await fetchLogs();
			const hit = messages.find((m) => m.content.includes(sponsor.node_id));
			if (!hit)
				return sendLog(
					`${sponsor.login}'s just cancelled and they've deleted their Gist and I can't find any logs so I can't remove their roles!`,
				);

			user = (await fetchUser(hit.mentions[0].id))!;
		} else {
			user = _user;
		}

		const rolesToRemove = resolveRoles(tier.node_id);
		if (!rolesToRemove.length)
			return sendLog(
				`<@${user.id}> (\`${sponsor.login}:${sponsor.node_id}\`) just cancelled but there are no configured roles to remove!`,
				user.id,
			);

		const applied = await updateUserRoles(user, rolesToRemove, true);
		if (!applied) {
			return sendLog(
				`<@${user.id}> (\`${sponsor.login}:${sponsor.node_id}\`) just sponsored but isn't in the server!`,
				user.id,
			);
		}
		// @ts-expect-error
		if (typeof applied.error !== 'undefined') {
			return sendLog(
				`<@${user.id}> (\`${sponsor.login}:${
					sponsor.node_id
					// @ts-expect-error
				}\`) just cancelled but removing their roles failed.\n\`\`\`\n${inspect(applied.error, true, 4)}\`\`\`.`,
				user.id,
			);
		}
	}
};
