import { Link } from 'react-router'
import { PublicRelayNotice } from '../components/RelayChooser'
import { PUBLIC_RELAY_URL } from '../lib/relay'
import { Section } from './HelpSection'

/** Installing to the home screen, per platform. */
export function InstallHelpEn() {
  return (
    <>
      <p>
        Installed on the home screen, Mr Chef opens full screen like an app, starts faster and stays available offline.
        Nothing is downloaded from an app store.
      </p>
      <ul>
        <li>
          <strong>Android (Chrome, Edge, Samsung Internet)</strong>: tap <strong>Install</strong> in the banner shown by Mr
          Chef, or menu <strong>⋮ › Install app</strong>.
        </li>
        <li>
          <strong>iPhone and iPad (Safari)</strong>: tap the <strong>Share</strong> button, then{' '}
          <strong>Add to Home Screen</strong> and <strong>Add</strong>.
        </li>
        <li>
          <strong>Computer (Chrome, Edge)</strong>: install icon on the right of the address bar.
        </li>
      </ul>
      <p className="muted small">
        On iPhone, the installed app has its own storage: set it up again there, for example with the QR code.
      </p>
    </>
  )
}

/** Built-in help, English version. */
export function HelpEn({ origin, appUrl }: { origin: string; appUrl: string }) {
  return (
    <>
      <Section id="principe">
        <p>
          Mr Chef keeps your recipes on this device and works offline. To create a recipe, it calls the AI of your choice
          directly with your key. To send it to your robot, it publishes it to your Monsieur Cuisine account, which the robot
          syncs.
        </p>
        <p>
          The Monsieur Cuisine website does not accept requests coming from another web app. Mr Chef therefore goes through a{' '}
          <strong>relay</strong>: a small program hosted on Cloudflare that forwards requests to monsieur-cuisine.com and
          keeps nothing. You have two options:
        </p>
        <ul>
          {PUBLIC_RELAY_URL && (
            <li>
              <strong>the public relay</strong> of this site: nothing to install;
            </li>
          )}
          <li>
            <strong>your own relay</strong>, free, set up in about ten minutes. Your data then only goes through your own
            Cloudflare account.
          </li>
        </ul>
        <p className="muted small">Without a relay, everything works except publishing to Monsieur Cuisine.</p>
      </Section>

      <Section id="relais">
        {PUBLIC_RELAY_URL && (
          <>
            <h3>The public relay</h3>
            <p>
              Choose it in <Link to="/parametres#relais">Settings › Relay</Link>. It is open to every visitor of this site,
              with no secret to know. Your Monsieur Cuisine session authenticates each of your uploads: the relay gives
              access to no other account.
            </p>
            <PublicRelayNotice />
          </>
        )}

        <h3>Using your own relay</h3>
        <p>
          You keep this app as it is: <strong>nothing to rebuild or host</strong>. You only set up a relay on your free
          Cloudflare account, then paste its address into Mr Chef. This relay must allow this site’s address:{' '}
          <code>{origin}</code>
        </p>

        <h4>Simple method: from the Cloudflare dashboard</h4>
        <ol>
          <li>
            Download the relay script:{' '}
            <a href={`${import.meta.env.BASE_URL}relais/index.js`} download="mr-chef-relay.js">
              mr-chef-relay.js
            </a>{' '}
            (about ten KB, the same code as the public relay).
          </li>
          <li>
            On{' '}
            <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer">
              dash.cloudflare.com
            </a>
            : <strong>Workers &amp; Pages › Create › Start with Hello World</strong>, name it <code>mr-chef-relay</code>,
            then <strong>Deploy</strong>.
          </li>
          <li>
            <strong>Edit code</strong>: replace all the content with the downloaded file, then <strong>Deploy</strong>.
          </li>
          <li>
            <strong>Settings › Variables and Secrets</strong>, add:
            <ul>
              <li>
                <code>ALLOWED_ORIGIN</code> = <code>{origin}</code>
              </li>
              <li>
                <code>RELAY_PUBLIC</code> = <code>false</code> and a <code>RELAY_SHARED_SECRET</code> secret (
                <strong>Generate a secret</strong> button in Mr Chef) to keep it for yourself. Or <code>RELAY_PUBLIC</code> ={' '}
                <code>true</code> to share it.
              </li>
            </ul>
          </li>
        </ol>

        <h4>With GitHub: automatic deployment and updates</h4>
        <ol>
          <li>
            Fork the Mr Chef repository to your GitHub account. Only the relay workflow matters: you can disable the others in
            the Actions tab.
          </li>
          <li>
            On Cloudflare: <strong>My Profile › API Tokens › Create Token</strong>, <em>Edit Cloudflare Workers</em> template.
            Also note your <strong>Account ID</strong> (Workers &amp; Pages page, right column).
          </li>
          <li>
            In your fork: <strong>Settings › Secrets and variables › Actions</strong>.
            <ul>
              <li>
                Secrets: <code>CLOUDFLARE_API_TOKEN</code> and <code>CLOUDFLARE_ACCOUNT_ID</code>.
              </li>
              <li>
                Variable: <code>RELAY_ALLOWED_ORIGIN</code> = <code>{origin}</code>, with no path or trailing slash. Several
                origins can be given, separated by commas.
              </li>
            </ul>
          </li>
          <li>
            <strong>Actions</strong> tab › <strong>Déployer le relais</strong> (deploy the relay) › <strong>Run workflow</strong>.
            Every relay update you pull into your fork then redeploys it automatically.
          </li>
        </ol>

        <h4>With a terminal</h4>
        <pre>
          <code>{`git clone <Mr Chef repository> && cd mr-chef
npm install
cd apps/relay
npx wrangler login
npx wrangler deploy --var ALLOWED_ORIGIN:${origin} --var RELAY_PUBLIC:true`}</code>
        </pre>

        <h4>Connecting Mr Chef to your relay</h4>
        <ol>
          <li>
            The relay address looks like <code>https://mr-chef-relay.&lt;subdomain&gt;.workers.dev</code>. Open{' '}
            <code>…/health</code>: the page shows <code>{'{"ok":true,…}'}</code>.
          </li>
          <li>
            <Link to="/parametres#relais">Settings › Relay › My own relay</Link>: paste the address, and the secret if the
            relay is private, then <strong>Test the relay</strong> and <strong>Save</strong>.
          </li>
        </ol>

        <h3>For the site administrator: public or private relay</h3>
        <p>
          Deployed from GitHub, the relay is <strong>public</strong> by default: it accepts every visitor of the site, each
          with their own Monsieur Cuisine session. It refuses other sites and any operation Mr Chef does not use, and limits
          each connection to 120 requests per minute.
        </p>
        <ul>
          <li>
            To offer it by default to your visitors, add the GitHub variable <code>PUBLIC_RELAY_URL</code> with its address,
            then run the <strong>Déployer sur GitHub Pages</strong> workflow again.
          </li>
          <li>
            To keep it for yourself, add the variable <code>RELAY_MODE</code> = <code>private</code> and the secret{' '}
            <code>RELAY_SHARED_SECRET</code> (Settings › Relay › <strong>Generate a secret</strong> creates one), then redeploy
            the relay. Then enter this secret in Mr Chef.
          </li>
        </ul>
      </Section>

      <Section id="session">
        <p>
          Mr Chef uses your browser session on monsieur-cuisine.com: you never give out your Lidl password.
        </p>
        <ol>
          <li>On a computer, sign in to monsieur-cuisine.com with your Lidl account.</li>
          <li>Open the developer tools (F12), Network tab, and reload the page.</li>
          <li>
            Right-click the first “monsieur-cuisine.com” request › Copy › <strong>Copy as cURL</strong>. You can also copy the
            value of the <code>cookie</code> header.
          </li>
          <li>
            <Link to="/parametres#session">Settings › Monsieur Cuisine account</Link>: paste, then{' '}
            <strong>Check and save</strong>.
          </li>
        </ol>
        <p className="muted small">
          Only the WordPress session cookies are kept. When the session expires, a banner tells you: repeat these steps. If
          you sign out of the Monsieur Cuisine website, the pasted session stops working.
        </p>
      </Section>

      <Section id="ia">
        <p>
          Add at least one key in <Link to="/parametres#ia">Settings › Artificial intelligence</Link>:
        </p>
        <ul>
          <li>
            Mistral AI:{' '}
            <a href="https://console.mistral.ai/api-keys" target="_blank" rel="noreferrer">
              console.mistral.ai
            </a>
          </li>
          <li>
            OpenAI:{' '}
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
              platform.openai.com
            </a>
          </li>
          <li>
            Claude:{' '}
            <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noreferrer">
              platform.claude.com
            </a>
          </li>
        </ul>
        <p className="muted small">
          Each generation is billed by the provider to your account, usually a few cents. Recipes only use the programs of
          the chosen robot, and out-of-range settings are corrected automatically. With the app in English, the default
          prompt asks the AI to write the recipe in English.
        </p>
      </Section>

      <Section id="transfert">
        <p>Set up your phone without typing anything again:</p>
        <ol>
          <li>
            On the device already set up: <Link to="/parametres#transfert">Settings › Transfer to another device</Link>, tick
            what to transfer, then <strong>Generate the QR code</strong>.
          </li>
          <li>
            On the phone, open Mr Chef (<code>{appUrl}</code>) › <strong>Import a configuration</strong> ›{' '}
            <strong>Scan the QR code</strong>. The phone’s camera app works too: it opens the import page directly.
          </li>
          <li>
            Type the passphrase shown under the QR code (dashes are added for you), check the contents, then{' '}
            <strong>Import</strong>.
          </li>
        </ol>
        <p className="muted small">
          The QR code is encrypted (AES-256, key derived from the passphrase). The passphrase is never in the QR code. If Mr
          Chef is installed on an iPhone home screen, import from the installed app, which has its own storage. Recipes are
          not transferred: get the published ones back with <strong>Sync</strong>.
        </p>
      </Section>

      <Section id="installer">
        <InstallHelpEn />
      </Section>

      <Section id="depannage">
        <table>
          <thead>
            <tr>
              <th>Message</th>
              <th>Solution</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Origin refused by the relay</td>
              <td>
                <code>RELAY_ALLOWED_ORIGIN</code> must be <code>{origin}</code>. Fix it, then redeploy the relay.
              </td>
            </tr>
            <tr>
              <td>Wrong secret</td>
              <td>
                The relay is private: enter in Mr Chef the same secret as <code>RELAY_SHARED_SECRET</code>, or make the relay
                public.
              </td>
            </tr>
            <tr>
              <td>Too many requests to the relay</td>
              <td>The limit of 120 requests per minute was reached. Wait a minute.</td>
            </tr>
            <tr>
              <td>Relay unreachable</td>
              <td>
                Check the <code>…workers.dev</code> address and your connection, then open <code>/health</code>.
              </td>
            </tr>
            <tr>
              <td>Monsieur Cuisine session expired</td>
              <td>
                <a href="#session">Paste a session again</a> after signing in again on monsieur-cuisine.com.
              </td>
            </tr>
            <tr>
              <td>“Déployer le relais” workflow not found</td>
              <td>
                The <code>.github/workflows/deploy-relay.yml</code> file must be on your repository’s main branch and the
                Actions tab enabled. The workflow shows up in the left list of the Actions tab.
              </td>
            </tr>
            <tr>
              <td>Key refused by the provider</td>
              <td>Check the key and your account credit at the provider.</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="securite">
        <ul>
          <li>AI keys, relay secret and session are encrypted on the device. The encryption key cannot be exported.</li>
          <li>
            The relay stores nothing and its logs are disabled. It refuses other sites and any operation Mr Chef does not
            use, and limits the number of requests per connection.
          </li>
          <li>
            With the public relay, your session goes through the site administrator’s Cloudflare account. If you do not want
            to trust them, set up your own relay.
          </li>
          <li>AI keys are only sent to the provider concerned.</li>
          <li>
            <Link to="/parametres#deconnexion">Signing out</Link> erases everything from this device and also closes the
            Monsieur Cuisine session.
          </li>
        </ul>
      </Section>
    </>
  )
}
