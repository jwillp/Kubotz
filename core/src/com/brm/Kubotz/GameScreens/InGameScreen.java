package com.brm.Kubotz.GameScreens;


import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.GL20;
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
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.ScreenManager.GameScreen;
import com.brm.GoatEngine.ScreenManager.GameScreenManager;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Components.AIComponent;
import com.brm.Kubotz.Components.GrabbableComponent;
import com.brm.Kubotz.Components.SpawnPointComponent;

import com.brm.Kubotz.Config;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Entities.BlockFactory;
import com.brm.Kubotz.Entities.KubotzFactory;
import com.brm.Kubotz.Scripts.AI.KubotzBehaviourScript;
import com.brm.Kubotz.Systems.*;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Entities.BlockFactory;
import com.brm.Kubotz.Entities.KubotzFactory;
import com.brm.Kubotz.Systems.AttackSystems.AttackSystem;
import com.brm.Kubotz.Systems.AttackSystems.MeleeSystem;
import com.brm.Kubotz.Systems.*;
import com.brm.Kubotz.Systems.MovementSystems.MovementSystem;
import com.brm.Kubotz.Systems.RendringSystems.AnimationSystem;
import com.brm.Kubotz.Systems.RendringSystems.RenderingSystem;
import com.brm.Kubotz.Systems.SkillsSystem.SkillsSystem;


public class InGameScreen extends GameScreen {

    private ECSManager ecsManager = new ECSManager();
    private EntityManager entityManager;

    private AISystem aiSystem;


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


        systemManager.addSystem(PowerUpsSystem.class, new PowerUpsSystem(this.entityManager));
        systemManager.addSystem(PunchSystem.class, new PunchSystem(this.entityManager));
        systemManager.addSystem(LifespanSystem.class, new LifespanSystem(this.entityManager));
        systemManager.addSystem(DamageSystem.class, new DamageSystem(this.entityManager));
        systemManager.addSystem(AttackSystem.class, new AttackSystem(this.entityManager));
        systemManager.addSystem(ScriptSystem.class, new ScriptSystem(this.entityManager));


        systemManager.addSystem(PowerUpsSystem.class, new PowerUpsSystem());

        systemManager.addSystem(MeleeSystem.class, new MeleeSystem());

        systemManager.addSystem(LifespanSystem.class, new LifespanSystem());

        systemManager.addSystem(DamageSystem.class, new DamageSystem());

        systemManager.addSystem(AttackSystem.class, new AttackSystem());

        systemManager.addSystem(ScriptSystem.class, new ScriptSystem());

        systemManager.addSystem(AISystem.class, new AISystem(this.entityManager));

        systemManager.addSystem(AnimationSystem.class, new AnimationSystem());


        systemManager.addSystem(RespawnSystem.class, new RespawnSystem());

        systemManager.addSystem(SensorSystem.class, new SensorSystem(this.entityManager));


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
                        .withTag("player")
                        .build();

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
                    .withHeight(1.0f)
                    .withInputSource(VirtualGamePad.InputSource.AI_INPUT)
                    .withCameraTargetComponent().build();
            ba.addComponent(new AIComponent(), AIComponent.ID);

            //Scripts
            ScriptComponent script = new ScriptComponent();
            script.addScript(new KubotzBehaviourScript(), ba, entityManager);
            ba.addComponent(script, script.ID);

            ba.addComponent(new GrabbableComponent(), GrabbableComponent.ID);

        }


        Logger.log("In Game State initialized");

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

        systemManager.getSystem(ScriptSystem.class).handleInput();
        systemManager.getSystem(MovementSystem.class).handleInput();
        systemManager.getSystem(GrabSystem.class).handleInput();
        systemManager.getSystem(SkillsSystem.class).handleInput();
        systemManager.getSystem(AttackSystem.class).handleInput();


    }

    @Override
    public void update(GameScreenManager engine, float deltaTime) {



        systemManager.getSystem(AISystem.class).update(deltaTime);

        systemManager.getSystem(MovementSystem.class).update(deltaTime);
        systemManager.getSystem(SkillsSystem.class).update(deltaTime);

        systemManager.getSystem(AttackSystem.class).update(deltaTime);

        systemManager.getSystem(GrabSystem.class).update(deltaTime);
        systemManager.getSystem(DamageSystem.class).update(deltaTime);
        systemManager.getSystem(LifespanSystem.class).update(deltaTime);
        systemManager.getSystem(PowerUpsSystem.class).update(deltaTime);


        systemManager.getSystem(SensorSystem.class).update(deltaTime);

        systemManager.getSystem(ScriptSystem.class).update(deltaTime);


        systemManager.getSystem(PhysicsSystem.class).update(deltaTime);
        systemManager.getSystem(AnimationSystem.class).update(deltaTime);


        systemManager.getSystem(RespawnSystem.class).update(deltaTime);
    }

    @Override

    public void draw(GameScreenManager engine, float deltaTime) {

        // DRAW WORLD

        //TODO move this to renderer
        // FPS
        if(Config.DEBUG_RENDERING_ENABLED) {
            SpriteBatch sb = systemManager.getSystem(RenderingSystem.class).getSpriteBatch();
            BitmapFont font = new BitmapFont();
            sb.begin();
            font.draw(sb, "FPS: " + Gdx.graphics.getFramesPerSecond(), 0, Gdx.graphics.getHeight());
            font.draw(sb, "IS GROUNDED: " + ((PhysicsComponent) this.player.getComponent(PhysicsComponent.ID)).isGrounded(), 0, Gdx.graphics.getHeight() - 30);


            String velText = "Velocity: " + ((PhysicsComponent) this.player.getComponent(PhysicsComponent.ID)).getVelocity();
            font.draw(sb, velText, 0, Gdx.graphics.getHeight() - 50);

            font.draw(sb, "NB JUMPS: " + ((JumpComponent) this.player.getComponent(JumpComponent.ID)).getNbJujmps(), 0, Gdx.graphics.getHeight() - 80);
            font.draw(sb, "NB JUMPS MAX: " + ((JumpComponent) this.player.getComponent(JumpComponent.ID)).getNbJumpsMax(), 0, Gdx.graphics.getHeight() - 100);
            font.draw(sb, "CONTACTS: " + ((PhysicsComponent) this.player.getComponent(PhysicsComponent.ID)).getContacts().size(), 0, Gdx.graphics.getHeight() - 120);

            sb.end();
        }

        systemManager.getSystem(RenderingSystem.class).update(deltaTime);
        systemManager.getSystem(RenderingSystem.class).renderMap(mapRenderer);
        systemManager.getSystem(RenderingSystem.class).renderHud(deltaTime);

    }
}
