# A propos de ce fork
C'est un fork de [Potree](https://github.com/potree/potree) par [m-schuetz](https://github.com/m-schuetz). Je conseille de mettre une origine qui pointe vers le repo original, de sorte à pouvoir pull les changements qu'il apporte de son côté.

# Pour pouvoir utiliser en local

## Dépendances

Installer [Node](http://nodejs.org/) (via [nvm](https://github.com/coreybutler/nvm-windows/releases) si vous êtes sous Windows, ce sera plus simple à gérer plus tard).

Installer les dépendances de **package.json**. Vous aurez aussi besoin de **rollup** et **gulp**.

```bash
npm install
npm i -g rollup
npm i -g gulp
```

## Relancer un build à chaque édition du code

Utiliser `npm run watch` pour avoir un build automatique à chaque édition du code.

## Déclaration de types

Les types sont (pour l'instant) écrits à la main dans types/potree.d.ts. Ils sont automatiquement copiés dans le dossier de build.

## Pour inclure Potree dans un autre projet

### Depuis votre repo local, si vous avez besoin de tester des changements dans l'application Angular
```typescript
import * as Potree from 'path_du_repo_sur_votre_machine/build/potree/potree';
const viewer = new Potree.viewer(document.getElementById('viewer'));
```
NB : vous pouvez aussi l'installer en tant que package local mais vous n'aurez pas le build automatique à chaque édition.

### Depuis ce repo
Se référer à https://docs.npmjs.com/cli/v9/configuring-npm/package-json#git-urls-as-dependencies. Concrètement, dans **package.json**, il faut quelque chose de la forme :
```json
{
	// ...
	"dependencies": {
		// ...
		"potree": "git+https://username@bitbucket.com/innovela/potree.git"
		// ...
	}
	// ...
}
```

Puis simplement :
```typescript
import * as Potree from 'potree';
const viewer = new Potree.viewer(document.getElementById('viewer'));
```