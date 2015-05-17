#TODO

* [ ] Corriger les contacts
* [x] Encapsuler TOUTES les variables membres des Composantes
* [x] Renommer le package Component pour Components
* [x] Renommer le package System pour Systems
* [x] Renommer la classe Component pour EntityComponent
* [ ] Modifier Entity Manager pour pouvoir utiliser des Templates Class<T> plutôt que des ID
* [ ] Multiplayer
* [ ] Disable Punch
* [ ] Clean GunSystem + Bullet
* [ ] A TeamComponent
* [ ] A ScoreComponent
* [ ] CheckFor Enabling Disabling
* [ ] Extraire PositionComopnent, VelocityComponent, CollisionComponent From PhysicsComponent
* [ ] Système de Respawn
* [ ] Vérifier les boutons pour chacun des skills
* [ ] Se débarasser d'un objet
* [ ] Script Component
* [ ] Ne pas oublier l'implémentation de l'audio
* [ ] Une Doc Propre
* [ ] IN CODE TODO


***




## [] Corriger les contacts
Quand on touche un powerup par exemple et qu'on se déplace plus loin, le cotnact existe toujours. Il devient alors possible de le ramasser à distance ce qui ne fait aucun sens.

## [] Encapsuler TOUTES les variables membres des Composantes
Bien qu'au départ il semblait beaucoup plus simple de faire dans variables membres publiques, c'est vraiment plus facile à maintenir si elles sont encapsulée. Pour le moment seulement une partie sont faites, il faut toutes les terminées.


## [] Renommer le package Component pour Components
C'est plus approprié

## [] Renommer le package System pour Systems
C'est plus approprié

## [] Renommer la classe Component pour EntityComponent
Sémentiquement ça ferait plus de sens parce que les systèmes s'appelles EntitySystems

## [] Modifier Entity Manager pour pouvoir utiliser des Templates Class<T> plutôt que des ID
C'est juste vraiment plus simple à utiliser par la suite et ça rend le code plus cours et plus lisible. **ATTENTION** Ne pas oublier de LAISSER LE CHAMPS STATIC ID dans chacune des Components; Ça pourrait être utile un jours...



## [] Multiplayer
At least to real players should be able to play


## [] Disable Punch
Disable PunchComponent When using a picked up weapon or some of the active skills

## [] Clean GunSystem + Bullet
ProjectileComponent? Le GunSystème est pas très propre.. il y a des petits hacks un peu partout.

## [] A TeamComponent
Pour les dommages! Genre, si tes dans la même team et que le Friendly Fire est OFF ne pas appliquer les dommages.


## [] A ScoreComponent
Pour inscrire le nombre de kill et de mort. Et le nombre total de vie


## CheckFor Enabling Disabling
Regarder si tous les sytèmes update des entités avec la composante ENABLED. Documenter les Composantes dont le Enabling et disabling est improtant


##[] Extraire PositionComopnent, VelocityComponent, CollisionComponent From PhysicsComponent
Ça pourrait devenir util dans le cas où il y aurait des entités avec des positions sans avoir de corps physique. À VOIR


## [] Système de Respawn
Il faut bien qu'après une mort on puisse recommencer à jouer

## [] Vérifier les boutons pour chacun des skills
Vérifier à ce que le punch soit sur le bon bouton lancer un objet ramasser etc

## [] Se débarasser d'un objet
Ouep... pfff..


## [] Script Component
Une composante permettant d'éxécuter un script pour une entité donnée. Un script étant un moyen d'implémenter une feature trop petite pour posséder son propre système. (Ça serat overkill sinon). Example: animtion d'un titre, changement de couleur d'un personnage durant certains moment. etc. Ce sont des «petits sytèmes». Il serait bon de faire un ScriptComponent pouvant contenir plusieurs scripts. Scripts are really for custom behaviours.


## [] Ne pas oublier l'implémentation de l'audio
Il est conseillé de laisser les différents systèmes jouer l'audio désiré selon les évènement est appelant le "ServiceAudio". Ainsi la gestion du son ne se fait pas dans l'architecture ECS


## [] Une Doc Propre
Faire une vraie doc toute propre sur le projet. Doc au sens : Comment le ECS est fait, comment les inputs sont gérés, quels boutons font quoi etc...


## [] IN CODE TODO
Faut bien les terminer eux aussis



## Entities Prefab
```javascript
"Kubotz"
	PhysicsComponent
    VirtualGamePad
    SpriteComponent
    AnimationComponent
    TagsComponent
    RunningComponent
    JumpComponent
    PunchComponent
    CameraTargetComponent
    GrabComponent
    HealthComponent
    ScoreComponent
    TeamComponent
    PowerUpContainerComponent
    //Optional
    KubotzAIComponent
```

```javascript
"Drone Turret"
	PhysicsComponent
    VirtualGamePad
    SpriteComponent
    AnimationComponent
    ScriptComponent		//AI?
    CameraTargetComponent
    HealthComponent
    TeamComponent
```

```javascript
"Bullets"
	PhysicsComponent
    LifespanComponent
    SpriteComponent
    AnimationComponent		// really?
    DamageComponent
    TeamComponent
```

```javascript
"Platforms"
	PhysicsComponent
```

```javascript
"PowerUps"
	PowerUpComponent
    LifespanComponent
    PhysicsComponent
    GrabbableComponent
    CameraTargetComponent //? Supersmash bros style?
```





"TrackerBot"









