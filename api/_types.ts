export interface GithubUser {
	login: string;
	id: number;
	node_id: string;
	avatar_url: string;
	gravatar_id: string;
	url: string;
	html_url: string;
	followers_url: string;
	following_url: string;
	gists_url: string;
	starred_url: string;
	subscriptions_url: string;
	organizations_url: string;
	repos_url: string;
	events_url: string;
	received_events_url: string;
	type: string;
	site_admin: boolean;
}

export interface GithubSponsorTier {
	node_id: string;
	created_at: string;
	description: string;
	monthly_price_in_cents: number;
	monthly_price_in_dollars: number;
	name: string;
	is_one_time: boolean;
	is_custom_amount: boolean;
}

export interface GithubSponsorship {
	node_id: string;
	created_at: string;
	sponsorable: GithubUser;
	sponsor: GithubUser;
	privacy_level: 'public' | 'private';
	tier: GithubSponsorTier;
}

export enum GithubSponsorshipPayloadAction {
	CREATED = 'created',
	CANCELLED = 'cancelled',
}

export interface GithubSponsorshipPayload {
	action: GithubSponsorshipPayloadAction;
	sponsorship: GithubSponsorship;
	sender: GithubUser;
}

export interface GithubGist {
	url: string;
	forks_url: string;
	commits_url: string;
	id: string;
	node_id: string;
	git_pull_url: string;
	git_push_url: string;
	html_url: string;
	files: Record<string, GithubFile>;
	public: boolean;
	created_at: string;
	updated_at: string;
	description: string;
	comments: number;
	user: GithubUser | null;
	comments_url: string;
	owner: GithubUser;
	truncated: boolean;
}

export interface GithubFile {
	filename: string;
	type: string;
	language: string;
	raw_url: string;
	size: number;
}
