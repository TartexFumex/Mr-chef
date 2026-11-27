import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { PublicRelayNotice } from '../components/RelayChooser'
import { TopBar } from '../components/TopBar'
import { PUBLIC_RELAY_URL } from '../lib/relay'

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
            un <strong>relais</strong> : un petit programme hébergé chez Cloudflare, qui transmet les demandes à
            monsieur-cuisine.com et ne conserve rien. Vous avez deux possibilités :
          </p>
          <ul>
            {PUBLIC_RELAY_URL && (
              <li>
                <strong>le relais public</strong> de ce site : rien à installer ;
              </li>
            )}
            <li>
              <strong>votre propre relais</strong>, gratuit, installé en une dizaine de minutes. Vos données ne passent alors
              que par votre compte Cloudflare.
            </li>
          </ul>
          <p className="muted small">Sans relais, tout fonctionne sauf la publication sur Monsieur Cuisine.</p>
        </Section>

        <Section id="relais">
          {PUBLIC_RELAY_URL && (
            <>
              <h3>Le relais public</h3>
              <p>
                Choisissez-le dans <Link to="/parametres#relais">Paramètres › Relais</Link>. Il est ouvert à tous les
                visiteurs de ce site, sans secret à connaître. C’est votre session Monsieur Cuisine qui authentifie chacun de
                vos envois : le relais ne donne accès à aucun autre compte.
              </p>
              <PublicRelayNotice />
            </>
          )}

          <h3>Utiliser votre propre relais</h3>
          <p>
            Vous gardez cette application telle quelle : <strong>rien à recompiler ni à héberger</strong>. Vous installez
            seulement un relais sur votre compte Cloudflare gratuit, puis vous collez son adresse dans Mr Chef. Ce relais doit
            autoriser l’adresse de ce site : <code>{origin}</code>
          </p>

          <h4>Méthode simple : depuis le tableau de bord Cloudflare</h4>
          <ol>
            <li>
              Téléchargez le script du relais :{' '}
              <a href={`${import.meta.env.BASE_URL}relais/index.js`} download="mr-chef-relay.js">
                mr-chef-relay.js
              </a>{' '}
              (une dizaine de ko, le même code que le relais public).
            </li>
            <li>
              Sur <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer">dash.cloudflare.com</a> :{' '}
              <strong>Workers &amp; Pages › Create › Start with Hello World</strong>, nommez-le <code>mr-chef-relay</code>,
              puis <strong>Deploy</strong>.
            </li>
            <li>
              <strong>Edit code</strong> : remplacez tout le contenu par celui du fichier téléchargé, puis <strong>Deploy</strong>.
            </li>
            <li>
              <strong>Settings › Variables and Secrets</strong>, ajoutez :
              <ul>
                <li>
                  <code>ALLOWED_ORIGIN</code> = <code>{origin}</code>
                </li>
                <li>
                  <code>RELAY_PUBLIC</code> = <code>false</code> et un secret <code>RELAY_SHARED_SECRET</code> (bouton{' '}
                  <strong>Générer un secret</strong> dans Mr Chef) pour le réserver à vous seul. Ou{' '}
                  <code>RELAY_PUBLIC</code> = <code>true</code> pour le partager.
                </li>
              </ul>
            </li>
          </ol>

          <h4>Avec GitHub : déploiement et mises à jour automatiques</h4>
          <ol>
            <li>
              Forkez le dépôt Mr Chef sur votre compte GitHub. Seul le workflow du relais vous sert : vous pouvez désactiver
              les autres dans l’onglet Actions.
            </li>
            <li>
              Sur Cloudflare : <strong>My Profile › API Tokens › Create Token</strong>, modèle <em>Edit Cloudflare Workers</em>.
              Notez aussi votre <strong>Account ID</strong> (page Workers &amp; Pages, colonne de droite).
            </li>
            <li>
              Dans votre fork : <strong>Settings › Secrets and variables › Actions</strong>.
              <ul>
                <li>
                  Secrets : <code>CLOUDFLARE_API_TOKEN</code> et <code>CLOUDFLARE_ACCOUNT_ID</code>.
                </li>
                <li>
                  Variable : <code>RELAY_ALLOWED_ORIGIN</code> = <code>{origin}</code>, sans chemin ni barre finale. Plusieurs
                  origines possibles, séparées par des virgules.
                </li>
              </ul>
            </li>
            <li>
              Onglet <strong>Actions</strong> › <strong>Déployer le relais</strong> › <strong>Run workflow</strong>. Chaque mise à
              jour du relais que vous récupérez dans votre fork le redéploie ensuite automatiquement.
            </li>
          </ol>

          <h4>Avec un terminal</h4>
          <pre>
            <code>{`git clone <dépôt Mr Chef> && cd mr-chef
npm install
cd apps/relay
npx wrangler login
npx wrangler deploy --var ALLOWED_ORIGIN:${origin} --var RELAY_PUBLIC:true`}</code>
          </pre>

          <h4>Relier Mr Chef à votre relais</h4>
          <ol>
            <li>
              L’adresse du relais a la forme <code>https://mr-chef-relay.&lt;sous-domaine&gt;.workers.dev</code>. Ouvrez{' '}
              <code>…/health</code> : la page affiche <code>{'{"ok":true,…}'}</code>.
            </li>
            <li>
              <Link to="/parametres#relais">Paramètres › Relais › Mon propre relais</Link> : collez l’adresse, et le secret si
              le relais est privé, puis <strong>Tester le relais</strong> et <strong>Enregistrer</strong>.
            </li>
          </ol>

          <h3>Pour l’administrateur du site : relais public ou privé</h3>
          <p>
            Déployé par GitHub, le relais est <strong>public</strong> par défaut : il accepte tous les visiteurs du site, chacun
            avec sa propre session Monsieur Cuisine. Il refuse les autres sites et toute opération que Mr Chef n’utilise pas, et
            limite chaque connexion à 120 requêtes par minute.
          </p>
          <ul>
            <li>
              Pour le proposer par défaut à vos visiteurs, ajoutez la variable GitHub <code>PUBLIC_RELAY_URL</code> avec son
              adresse, puis relancez le workflow <strong>Déployer sur GitHub Pages</strong>.
            </li>
            <li>
              Pour le réserver à vous seul, ajoutez la variable <code>RELAY_MODE</code> = <code>private</code> et le secret{' '}
              <code>RELAY_SHARED_SECRET</code> (Paramètres › Relais › <strong>Générer un secret</strong> en crée un), puis
              redéployez le relais. Saisissez ensuite ce secret dans Mr Chef.
            </li>
          </ul>

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
                <td>
                  Le relais est privé : saisissez dans Mr Chef le même secret que <code>RELAY_SHARED_SECRET</code>, ou passez
                  le relais en public.
                </td>
              </tr>
              <tr>
                <td>Trop de requêtes vers le relais</td>
                <td>La limite de 120 requêtes par minute est atteinte. Patientez une minute.</td>
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
            <li>
              Le relais ne stocke rien et ses journaux sont désactivés. Il refuse les autres sites, toute opération que Mr Chef
              n’utilise pas, et limite le nombre de requêtes par connexion.
            </li>
            <li>
              Avec le relais public, votre session transite par le compte Cloudflare de l’administrateur du site. Si vous ne
              voulez pas lui faire confiance, installez votre propre relais.
            </li>
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
