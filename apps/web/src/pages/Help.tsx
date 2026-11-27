import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { TopBar } from '../components/TopBar'

const SECTIONS = [
  ['principe', 'Comment ça marche'],
  ['relais', 'Installer le relais'],
  ['session', 'Connecter Monsieur Cuisine'],
  ['ia', 'Clés IA'],
  ['transfert', 'Configurer un autre appareil'],
  ['depannage', 'Dépannage'],
  ['securite', 'Sécurité'],
] as const

function Section({ id, children }: { id: (typeof SECTIONS)[number][0]; children: ReactNode }) {
  const title = SECTIONS.find((s) => s[0] === id)![1]
  return (
    <section>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  )
}

/** Aide intégrée : principe, mise en place du relais Cloudflare, session, clés, transfert, dépannage. */
export function Help() {
  const location = useLocation()
  const origin = window.location.origin
  const appUrl = `${origin}${window.location.pathname}`

  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView()
  }, [location.hash])

  return (
    <>
      <TopBar title="Aide" />
      <main className="main help">
        <nav className="toc" aria-label="Sommaire">
          {SECTIONS.map(([id, label]) => (
            <Link key={id} to={`/aide#${id}`} className="chip" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
              {label}
            </Link>
          ))}
        </nav>

        <Section id="principe">
          <p>
            Mr Chef garde vos recettes sur cet appareil et fonctionne hors ligne. Pour créer une recette, il appelle
            directement l’IA de votre choix avec votre clé. Pour l’envoyer sur votre robot, il la publie sur votre compte
            Monsieur Cuisine, que le robot synchronise.
          </p>
          <p>
            Le site Monsieur Cuisine n’accepte pas les requêtes venant d’une autre application web. Mr Chef passe donc par
            un <strong>relais</strong> : un petit programme gratuit, à vous, hébergé chez Cloudflare. Il transmet les
            demandes de Mr Chef à monsieur-cuisine.com et ne conserve rien.
          </p>
          <p className="muted small">Sans relais, tout fonctionne sauf la publication sur Monsieur Cuisine.</p>
        </Section>

        <Section id="relais">
          <p>Comptez 10 minutes, une seule fois. Il vous faut :</p>
          <ul>
            <li>un compte Cloudflare gratuit (le plan gratuit suffit largement) ;</li>
            <li>
              l’adresse de Mr Chef, qui sert d’<em>origine autorisée</em> : <code>{origin}</code>
            </li>
            <li>
              un secret partagé : Paramètres › Relais › <strong>Générer un secret</strong> le crée et le copie.
            </li>
          </ul>

          <h3>Option A : depuis GitHub (sans rien installer)</h3>
          <ol>
            <li>
              Ayez votre propre copie du dépôt Mr Chef sur GitHub (votre dépôt ou un fork). L’onglet <strong>Actions</strong>{' '}
              doit être activé.
            </li>
            <li>
              Sur Cloudflare : <strong>My Profile › API Tokens › Create Token</strong>, modèle <em>Edit Cloudflare Workers</em>.
              Notez aussi votre <strong>Account ID</strong> (page Workers &amp; Pages, colonne de droite).
            </li>
            <li>
              Sur GitHub, dans le dépôt : <strong>Settings › Secrets and variables › Actions</strong>.
              <ul>
                <li>
                  Onglet <em>Secrets</em> : <code>CLOUDFLARE_API_TOKEN</code>, <code>CLOUDFLARE_ACCOUNT_ID</code> et{' '}
                  <code>RELAY_SHARED_SECRET</code> (le secret généré dans Mr Chef).
                </li>
                <li>
                  Onglet <em>Variables</em> : <code>RELAY_ALLOWED_ORIGIN</code> = <code>{origin}</code>, sans chemin ni barre
                  finale. Plusieurs origines possibles, séparées par des virgules.
                </li>
              </ul>
            </li>
            <li>
              Onglet <strong>Actions</strong> › workflow <strong>Déployer le relais</strong> › <strong>Run workflow</strong>.
              Ensuite, chaque modification du relais poussée sur la branche principale le redéploie automatiquement.
            </li>
            <li>
              L’adresse du relais apparaît à la fin du journal : <code>https://mr-chef-relay.&lt;sous-domaine&gt;.workers.dev</code>.
            </li>
          </ol>

          <h3>Option B : depuis votre ordinateur</h3>
          <pre>
            <code>{`npm install
cd apps/relay
npx wrangler login
npx wrangler secret put RELAY_SHARED_SECRET
npx wrangler deploy --var ALLOWED_ORIGIN:${origin}`}</code>
          </pre>

          <h3>Relier Mr Chef au relais</h3>
          <ol>
            <li>
              Vérifiez <code>https://mr-chef-relay.&lt;sous-domaine&gt;.workers.dev/health</code> : la page affiche{' '}
              <code>{'{"ok":true,…}'}</code>.
            </li>
            <li>
              <Link to="/parametres#relais">Paramètres › Relais</Link> : collez l’adresse et le secret, puis{' '}
              <strong>Tester le relais</strong> et <strong>Enregistrer</strong>.
            </li>
          </ol>
        </Section>

        <Section id="session">
          <p>
            Mr Chef utilise la session de votre navigateur sur monsieur-cuisine.com : vous ne donnez jamais votre mot de
            passe Lidl.
          </p>
          <ol>
            <li>Sur un ordinateur, connectez-vous à monsieur-cuisine.com avec votre compte Lidl.</li>
            <li>Ouvrez les outils de développement (F12), onglet Réseau, et rechargez la page.</li>
            <li>
              Clic droit sur la première requête « monsieur-cuisine.com » › Copier › <strong>Copier en tant que cURL</strong>. Vous
              pouvez aussi copier la valeur de l’en-tête <code>cookie</code>.
            </li>
            <li>
              <Link to="/parametres#session">Paramètres › Compte Monsieur Cuisine</Link> : collez, puis{' '}
              <strong>Vérifier et enregistrer</strong>.
            </li>
          </ol>
          <p className="muted small">
            Seuls les cookies de session WordPress sont gardés. Quand la session expire, un bandeau vous le signale :
            recommencez ces étapes. Si vous vous déconnectez du site Monsieur Cuisine, la session collée cesse de fonctionner.
          </p>
        </Section>

        <Section id="ia">
          <p>Ajoutez au moins une clé dans <Link to="/parametres#ia">Paramètres › Intelligence artificielle</Link> :</p>
          <ul>
            <li>
              Mistral AI : <a href="https://console.mistral.ai/api-keys" target="_blank" rel="noreferrer">console.mistral.ai</a>
            </li>
            <li>
              OpenAI : <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">platform.openai.com</a>
            </li>
            <li>
              Claude : <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noreferrer">platform.claude.com</a>
            </li>
          </ul>
          <p className="muted small">
            Chaque génération est facturée par le fournisseur sur votre compte, généralement quelques centimes. Les recettes
            sont limitées aux programmes du robot choisi, et les réglages hors plage sont corrigés automatiquement.
          </p>
        </Section>

        <Section id="transfert">
          <p>Configurez votre téléphone sans rien retaper :</p>
          <ol>
            <li>
              Sur l’appareil déjà configuré : <Link to="/parametres#transfert">Paramètres › Transférer vers un autre appareil</Link>,
              cochez ce qu’il faut transférer, puis <strong>Générer le QR code</strong>.
            </li>
            <li>
              Sur le téléphone, ouvrez Mr Chef (<code>{appUrl}</code>) › <strong>Importer une configuration</strong> ›{' '}
              <strong>Scanner le QR code</strong>. L’appareil photo du téléphone fonctionne aussi : il ouvre directement la page
              d’import.
            </li>
            <li>Tapez la phrase secrète affichée sous le QR code, vérifiez le contenu, puis <strong>Importer</strong>.</li>
          </ol>
          <p className="muted small">
            Le QR code est chiffré (AES-256, clé dérivée de la phrase secrète). La phrase n’est jamais dans le QR code.
            Si Mr Chef est installé sur l’écran d’accueil d’un iPhone, faites l’import depuis l’application installée, qui
            a son propre stockage. Les recettes ne sont pas transférées : récupérez celles qui sont publiées avec{' '}
            <strong>Synchroniser</strong>.
          </p>
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
                <td>Origine refusée par le relais</td>
                <td>
                  <code>RELAY_ALLOWED_ORIGIN</code> doit valoir <code>{origin}</code>. Corrigez puis redéployez le relais.
                </td>
              </tr>
              <tr>
                <td>Secret incorrect</td>
                <td>Le secret du relais et celui de Mr Chef doivent être identiques. Recollez-le des deux côtés.</td>
              </tr>
              <tr>
                <td>Relais injoignable</td>
                <td>Vérifiez l’adresse <code>…workers.dev</code> et votre connexion, puis ouvrez <code>/health</code>.</td>
              </tr>
              <tr>
                <td>Session Monsieur Cuisine expirée</td>
                <td>
                  <a href="#session">Recollez une session</a> après vous être reconnecté sur monsieur-cuisine.com.
                </td>
              </tr>
              <tr>
                <td>Workflow « Déployer le relais » introuvable</td>
                <td>
                  Le fichier <code>.github/workflows/deploy-relay.yml</code> doit être sur la branche principale de votre dépôt
                  et l’onglet Actions activé. Le workflow apparaît dans la liste de gauche de l’onglet Actions.
                </td>
              </tr>
              <tr>
                <td>Clé refusée par le fournisseur</td>
                <td>Vérifiez la clé et le crédit de votre compte chez le fournisseur.</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section id="securite">
          <ul>
            <li>
              Clés IA, secret du relais et session sont chiffrés sur l’appareil. La clé de chiffrement ne peut pas être
              exportée.
            </li>
            <li>Le relais ne stocke rien et ses journaux sont désactivés. Il refuse toute opération que Mr Chef n’utilise pas.</li>
            <li>Les clés IA ne sont envoyées qu’au fournisseur concerné.</li>
            <li>
              La <Link to="/parametres#deconnexion">déconnexion</Link> efface tout de cet appareil et ferme aussi la session
              Monsieur Cuisine.
            </li>
          </ul>
        </Section>
      </main>
    </>
  )
}
