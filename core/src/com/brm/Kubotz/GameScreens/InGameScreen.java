package com.brm.Kubotz.GameScreens;


import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.maps.MapObjects;
import com.badlogic.gdx.maps.objects.RectangleMapObject;
import com.badlogic.gdx.maps.tiled.TiledMap;
import com.badlogic.gdx.maps.tiled.TmxMapLoader;
import com.badlogic.gdx.maps.tiled.renderers.OrthogonalTiledMapRenderer;
import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;
import com.brashmonkey.spriter.Spriter;
import com.brashmonkey.spriter.gdxIntegration.LibGdxSpriterDrawer;
import com.brashmonkey.spriter.gdxIntegration.LibGdxSpriterLoader;
import com.brm.GoatEngine.ECS.core.Entity.ECSManager;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Entity.EntityManager;
import com.brm.GoatEngine.ECS.core.Systems.EntitySystemManager;
import com.brm.GoatEngine.ECS.utils.Systems.ScriptSystem;
import com.brm.GoatEngine.ScreenManager.GameScreen;
import com.brm.GoatEngine.ScreenManager.GameScreenManager;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Features.GameRules.Components.PlayerScoreComponent;
import com.brm.Kubotz.Features.PowerUps.Systems.PowerUpsSystem;
import com.brm.Kubotz.Features.Respawn.Components.SpawnPointComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Entities.BlockFactory;
import com.brm.Kubotz.Entities.KubotzFactory;
import com.brm.Kubotz.Features.Grab.Systems.GrabSystem;
import com.brm.Kubotz.Features.Respawn.Systems.RespawnSystem;
import com.brm.Kubotz.Input.InputTranslationSystem;
import com.brm.Kubotz.Systems.AttackSystems.AttackSystem;
import com.brm.Kubotz.Features.MeleeAttacks.Systems.MeleeSystem;
import com.brm.Kubotz.Systems.*;
import com.brm.Kubotz.Systems.MovementSystems.MovementSystem;
import com.brm.Kubotz.Systems.RendringSystems.AnimationSystem;
import com.brm.Kubotz.Systems.RendringSystems.RenderingSystem;
import com.brm.Kubotz.Systems.SkillsSystem.SkillsSystem;


public class InGameScreen extends GameScreen {

    private ECSManager ecsManager = new ECSManager();
    private EntityManager entityManager;
    private EntitySystemManager systemManager;

    //MAP
    private TiledMap tiledMap;
    private OrthogonalTiledMapRenderer mapRenderer;

    //PLAYER
    private Entity player;


    @Override
    public void init(GameScreenManager engine) {

        Logger.log("In Game State initialisation");


        // Systems Init
        entityManager = ecsManager.getEntityManager();
        systemManager = ecsManager.getSystemManager();

        systemManager.addSystem(PhysicsSystem.class, new PhysicsSystem());
        systemManager.addSystem(RenderingSystem.class, new RenderingSystem());
        systemManager.addSystem(InputTranslationSystem.class, new InputTranslationSystem());
        systemManager.addSystem(MovementSystem.class, new MovementSystem());

        systemManager.addSystem(TrackerSystem.class, new TrackerSystem());

        systemManager.addSystem(GrabSystem.class, new GrabSystem());

        systemManager.addSystem(SkillsSystem.class, new SkillsSystem());

        systemManager.addSystem(PowerUpsSystem.class, new PowerUpsSystem());

        systemManager.addSystem(MeleeSystem.class, new MeleeSystem());

        systemManager.addSystem(LifespanSystem.class, new LifespanSystem());

        systemManager.addSystem(DamageSystem.class, new DamageSystem());

        systemManager.addSystem(AttackSystem.class, new AttackSystem());

        systemManager.addSystem(ScriptSystem.class, new ScriptSystem());

        systemManager.addSystem(AnimationSystem.class, new AnimationSystem());

        systemManager.addSystem(RespawnSystem.class, new RespawnSystem());


        systemManager.addSystem(AISystem.class, new AISystem());


        //INIT SYSTEMS
        systemManager.initSystems();



        // Init Animation Manager
        Spriter.setDrawerDependencies(
                systemManager.getSystem(RenderingSystem.class).getSpriteBatch(),
                systemManager.getSystem(RenderingSystem.class).getShapeRenderer()
        );
        Spriter.init(LibGdxSpriterLoader.class, LibGdxSpriterDrawer.class);
        Spriter.load(Gdx.files.internal(Constants.KUBOTZ_ANIM_FILE).read(), Constants.KUBOTZ_ANIM_FILE);



        // MAP
        //LOAD MAP
        tiledMap = new TmxMapLoader().load(Constants.MAIN_MAP_FILE);
        float tileSize = tiledMap.getProperties().get("tilewidth", Integer.class);


        mapRenderer = new OrthogonalTiledMapRenderer(tiledMap, 1/tileSize);


        MapObjects mapObjects = tiledMap.getLayers().get("objects").getObjects();


        for(int i=0; i<mapObjects.getCount(); i++){


            RectangleMapObject obj = (RectangleMapObject) mapObjects.get(i);
            Rectangle rect = obj.getRectangle();
            String objType = (String) obj.getProperties().get("type");
            Vector2 position = new Vector2(rect.getX()/tileSize, rect.getY()/tileSize);


            if(objType.equals("PLAYER_SPAWN")){
                this.player = new KubotzFactory(entityManager, systemManager.getSystem(PhysicsSystem.class).getWorld(),
                        new Vector2(rect.getX()/tileSize, rect.getY()/tileSize))
                        .withHeight(2.0f)
                        .withCameraTargetComponent()
                        .build();
                this.player.addComponent(new PlayerScoreComponent(1), PlayerScoreComponent.ID);

                Entity entity = new Entity();
                entityManager.registerEntity(entity);
                entity.addComponent(new SpawnPointComponent(new Vector2(rect.getX()/tileSize, rect.getY()/tileSize),
                        SpawnPointComponent.Type.Player), SpawnPointComponent.ID);

            }else if(objType.equals("BONUS_SPAWN")){
                Entity entity = new Entity();
                entityManager.registerEntity(entity);
                entity.addComponent(new SpawnPointComponent(new Vector2(rect.getX()/tileSize, rect.getY()/tileSize),
                        SpawnPointComponent.Type.PowerUp), SpawnPointComponent.ID);


            }else{
                new BlockFactory(this.entityManager, systemManager.getSystem(PhysicsSystem.class).getWorld(),
                        new Vector2(rect.getX()/tileSize, rect.getY()/tileSize))
                        .withSize(rect.getWidth()/tileSize, rect.getHeight()/tileSize)
                        .withTag(Constants.ENTITY_TAG_PLATFORM)
                        .build();
            }
        }



        for(int i=0; i<1; i++){
            Entity ba = new KubotzFactory(entityManager, systemManager.getSystem(PhysicsSystem.class).getWorld(), new Vector2(8 + i,7))
                    .withHeight(2.0f)
                    .withCameraTargetComponent().build();
            //ba.addComponent(new AIComponent(), AIComponent.ID);
            ba.addComponent(new PlayerScoreComponent(2), PlayerScoreComponent.ID);


            //Scripts
            //ScriptComponent script = new ScriptComponent();
            //script.addScript(new KubotzBehaviourScript());
            //ba.addComponent(script, ScriptComponent.ID);

            //ba.addComponent(new GrabbableComponent(), GrabbableComponent.ID);

        }

        Logger.log("In Game State initialised");
    }



    @Override
    public void cleanUp(){}

    @Override
    public void resume(){}

    @Override
    public void handleInput(GameScreenManager engine){

        systemManager.getSystem(InputTranslationSystem.class).handleInput();

        //Since Scripts Can produce Input during their update phase
        systemManager.getSystem(ScriptSystem.class).update(0);

        systemManager.getSystem(MovementSystem.class).handleInput();
        systemManager.getSystem(GrabSystem.class).handleInput();
        systemManager.getSystem(SkillsSystem.class).handleInput();
        systemManager.getSystem(AttackSystem.class).handleInput();


    }

    @Override
    public void update(GameScreenManager engine, float deltaTime) {

        systemManager.getSystem(AISystem.class).update(deltaTime);

        systemManager.getSystem(MovementSystem.class).update(deltaTime);
        systemManager.getSystem(TrackerSystem.class).update(deltaTime);
        systemManager.getSystem(SkillsSystem.class).update(deltaTime);

        systemManager.getSystem(AttackSystem.class).update(deltaTime);

        systemManager.getSystem(GrabSystem.class).update(deltaTime);
        systemManager.getSystem(DamageSystem.class).update(deltaTime);
        systemManager.getSystem(LifespanSystem.class).update(deltaTime);
        systemManager.getSystem(PowerUpsSystem.class).update(deltaTime);

        systemManager.getSystem(ScriptSystem.class).update(deltaTime);

        systemManager.getSystem(PhysicsSystem.class).update(deltaTime);
        systemManager.getSystem(AnimationSystem.class).update(deltaTime);


        systemManager.getSystem(RespawnSystem.class).update(deltaTime);
    }

    @Override

    public void draw(GameScreenManager engine, float deltaTime) {

        // DRAW WORLD
        systemManager.getSystem(RenderingSystem.class).update(deltaTime);
        systemManager.getSystem(RenderingSystem.class).renderMap(mapRenderer);
        systemManager.getSystem(RenderingSystem.class).renderHud(deltaTime);
    }
}
