#TODO


## [] Corriger les contacts
	Quand on touche un powerup par exemple et qu'on se déplace plus loin, le cotnact existe toujours. Il devient alors possible de le ramasser
	à distance ce qui ne fait aucun sens.

## [] Encapsuler TOUTES les variables membres des Composantes
	Bien qu'au départ il semblait beaucoup plus simple de faire dans variables membres publiques, c'est vraiment plus facile à maintenir si elles sont encapsulée. Pour le moment seulement une partie sont faites, il faut toutes les terminées.


## [] Renommer le package Component pour Components
	C'est plus approprié

## [] Renommer le package System pour Systems
	C'est plus approprié

## [] Renommer la classe Component pour EntityComponent
	Sémentiquement ça ferait plus de sens parce que les systèmes s'appelles EntitySystems

## [] Modifier Entity Manager pour pouvoir utiliser des Templates Class<T> plutôt que des ID
	C'est juste vraiment plus simple à utiliser par la suite et ça rend le code plus cours et plus lisible.
	**ATTENTION** Ne pas oublier de LAISSER LE CHAMPS STATIC ID dans chacune des Components; Ça pourrait être utile un jours...



## Multiplayer
	 At least to real players should be able to play


## Disable Punch
	Disable PunchComponent
	When using a picked up weapon or some of the active skills

## Clean GunSystem + Bullet
	ProjectileComponent? Le GunSystème est pas très propre.. il y a des petits hacks un peu partout.

## A TeamComponent
	Pour les dommages! Genre, si tes dans la même team et que le Friendly Fire est OFF ne pas appliquer les dommages.


## A ScoreComponent
	Pour inscrire le nombre de kill et de mort. Et le nombre total de vie


## CheckFor Enabling Disabling
	Regarder si tous les sytèmes update des entités avec la composante ENABLED. Documenter les Composantes dont le Enabling et disabling est improtant


## Extraire PositionComopnent, VelocityComponent, CollisionComponent From PhysicsComponent
	Ça pourrait devenir util dans le cas où il y aurait des entités avec des positions sans avoir de corps physique. À VOIR


## Système de Respawn
	Il faut bien qu'après une mort on puisse recommencer à jouer

## Vérifier les boutons pour chacun des skills 
	Vérifier à ce que le punch soit sur le bon bouton lancer un objet ramasser etc

## Se débarasser d'un objet
	Ouep... pfff..

