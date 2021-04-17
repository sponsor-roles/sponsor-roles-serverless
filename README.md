# sponsor-roles-serverless
a serverless function to add Discord roles to your Github sponsors

## Setup

### Preparing environmental variables

#### General Configuration
The following environmental variables are required:
- `GITHUB_WEBHOOK_SECRET` - The string for signing and verifying webhooks from Github (`node -p "require('crypto').randomBytes(24).toString('hex')"`)
- `DISCORD_TOKEN` - The token for a Discord bot within your server which has permissions to apply roles to your sponsors
- `DISCORD_GUILD_ID` - The ID of the Discord server roles will be applied in
- `LOG_CHANNEL` - The ID of a Discord channel for sending sponsorship creation and cancellation logs. This channel is also treated as a jank database to 'link' a user to their Discord account if they delete the Gist mentioned in [Instructing your sponsors](#instructing-your-sponsors) (see [Caveats](#caveats)).

#### Configuring Roles
To make deployment as smooth as possible, you can specify which roles to apply to tiers via environmental variables.

Those environmental variables follow this pattern:
`SPONSOR_ROLES{?_TIER_ID}` where the value is a comma-separated list of Discord roles IDs.   

Example:  
```
SPONSOR_ROLES_MDEyOlNwb25zb3JzVGllcjMxNjY2`=587493582638940160
```

To get the IDs of all your sponsorship tiers, visit https://docs.github.com/en/graphql/overview/explorer, login, then run:
```graphql
{
  viewer {
    sponsorsListing {
      tiers(first: 50) {
        nodes {
          id
          monthlyPriceInCents
          name
        }
      }
    }
  }
}
```

If you wish to apply the same role to all sponsors regardless of tier, simply omit the `TIER_ID` in the variable.
```
SPONSOR_ROLES_MDEyOlNwb25zb3JzVGllcjMxNjY2`=587493582638940160
```

⚠ The catch-all variable and tier-specific variables are mutually exclusive and the catch-all will always take priority.

### Deploy on Vercel
Simply click [here](https://vercel.com/new/git/external?repository-url=https%3A%2F%2Fgithub.com%2Fsponsor-roles%2Fsponsor-roles-serverless&env=GITHUB_WEBHOOK_SECRET,DISCORD_TOKEN,DISCORD_GUILD_ID,LOG_CHANNEL&project-name=sponsor-roles-serverless) to deploy to Vercel. Ensure you've filled in your environmental variables correctly.


### Setup webhook on Github Sponsors
Follow [this article](https://docs.github.com/en/github/supporting-the-open-source-community-with-github-sponsors/configuring-webhooks-for-events-in-your-sponsored-account) to add the webhook to your Sponsors page.

Ensure the `Payload URL` is the one provided by Vercel in the previous step, `Content type` is `application/json`, `Secret` is the value from [General Configuration](#general-configuration), and `Active` is checked.

### Instructing your sponsors
It's crutial you add this bit to your description so users know how to setup the prerequisites for recieving their roles.  
Feel free to replace the examples we provide with data of your own.
```
If you'd like to recieve roles in our [Discord server](https://discord.gg/invite), please create a [new Gist](https://gist.github.com/new) with the following data:  
a. Gist Description: `Sponsor Roles Metadata`  
b. Filename including extension: `ME.txt`  
c. Gist Content: `User#0000 (id)` (eg: `Fyko#0001 (492374435274162177)`)

⚠ Make sure to click the 🔽 and select `Crate public gist`.  
[example](https://gist.github.com/Fyko/a43483761666c8d9c6396355929cc93a)
```

## Caveats
The problem with this implementation is that it has no database. So, when a user cancels and their Gist does not exist, we have to fetch all messages in the log channel and search for any messages that include the user's ID.
In the future (of this specific project), we'll add a database.