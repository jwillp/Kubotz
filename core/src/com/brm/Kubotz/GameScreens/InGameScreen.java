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
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystemManager;
import com.brm.GoatEngine.ECS.Systems.ScriptSystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.ScreenManager.GameScreen;
import com.brm.GoatEngine.ScreenManager.GameScreenManager;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Components.GrabbableComponent;
import com.brm.Kubotz.Components.SpawnPointComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Entities.BlockFactory;
import com.brm.Kubotz.Entities.KubotzFactory;
import com.brm.Kubotz.Systems.AttackSystems.AttackSystem;
import com.brm.Kubotz.Systems.AttackSystems.PunchSystem;
import com.brm.Kubotz.Systems.*;
import com.brm.Kubotz.Systems.MovementSystems.MovementSystem;
import com.brm.Kubotz.Systems.RendringSystems.AnimationSystem;
import com.brm.Kubotz.Systems.RendringSystems.RenderingSystem;
import com.brm.Kubotz.Systems.SkillsSystem.SkillsSystem;


public class InGameScreen extends GameScreen {

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
        entityManager = new EntityManager();
        systemManager = new EntitySystemManager();

        systemManager.addSystem(PhysicsSystem.class, new PhysicsSystem(this.entityManager));
        systemManager.addSystem(RenderingSystem.class, new RenderingSystem(this.entityManager));
        systemManager.addSystem(InputTranslationSystem.class, new InputTranslationSystem(this.entityManager));
        systemManager.addSystem(MovementSystem.class, new MovementSystem(this.entityManager));

        systemManager.addSystem(TrackerSystem.class, new TrackerSystem(this.entityManager));

        systemManager.addSystem(GrabSystem.class, new GrabSystem(this.entityManager));

        systemManager.addSystem(SkillsSystem.class, new SkillsSystem(this.entityManager));


        systemManager.addSystem(PowerUpsSystem.class, new PowerUpsSystem(this.entityManager));

        systemManager.addSystem(PunchSystem.class, new PunchSystem(this.entityManager));

        systemManager.addSystem(LifespanSystem.class, new LifespanSystem(this.entityManager));

        systemManager.addSystem(DamageSystem.class, new DamageSystem(this.entityManager));

        systemManager.addSystem(AttackSystem.class, new AttackSystem(this.entityManager));

        systemManager.addSystem(ScriptSystem.class, new ScriptSystem(this.entityManager));

        systemManager.addSystem(AnimationSystem.class, new AnimationSystem(this.entityManager));

        systemManager.addSystem(RespawnSystem.class, new RespawnSystem(this.entityManager));


        //INIT SYSTEMS
        systemManager.initSystems();



        // Init Animation Manager
        Spriter.setDrawerDependencies(
                systemManager.getSystem(RenderingSystem.class).getSpriteBatch(),
                systemManager.getSystem(RenderingSystem.class).getShapeRenderer()
        );
        Spriter.init(LibGdxSpriterLoader.class, LibGdxSpriterDrawer.class);
        Spriter.load(Gdx.files.internal("animations/kubotz.scml").read(), "animations/kubotz.scml");



        // MAP
        //LOAD MAP
        tiledMap = new TmxMapLoader().load("maps/BasicCube.tmx");
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



        Entity bo = new KubotzFactory(entityManager, systemManager.getSystem(PhysicsSystem.class).getWorld(), new Vector2(7,12))
                .withHeight(2.0f)
                .withCameraTargetComponent().build();
        bo.disableComponent(VirtualGamePad.ID);
        bo.addComponent(new GrabbableComponent(), GrabbableComponent.ID);

        Logger.log("In Game State initialised");
    }



    @Override
    public void cleanUp(){}

    @Override
    public void resume(){}

    @Override
    public void handleInput(GameScreenManager engine){


        systemManager.getSystem(InputTranslationSystem.class).handleInput();
        systemManager.getSystem(ScriptSystem.class).handleInput();
        systemManager.getSystem(MovementSystem.class).handleInput();
        systemManager.getSystem(GrabSystem.class).handleInput();
        systemManager.getSystem(SkillsSystem.class).handleInput();
        systemManager.getSystem(AttackSystem.class).handleInput();


    }

    @Override
    public void update(GameScreenManager engine, float deltaTime) {


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

        Gdx.gl.glClearColor(0,0,0,0);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT | GL20.GL_DEPTH_BUFFER_BIT);
        // DRAW WORLD

        systemManager.getSystem(RenderingSystem.class).update(deltaTime);
        systemManager.getSystem(RenderingSystem.class).renderMap(mapRenderer);
        systemManager.getSystem(RenderingSystem.class).renderHud(deltaTime);
    }
}
