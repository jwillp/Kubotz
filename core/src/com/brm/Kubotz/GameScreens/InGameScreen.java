package com.brm.Kubotz.GameScreens;


import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.maps.MapObjects;
import com.badlogic.gdx.maps.objects.RectangleMapObject;
import com.badlogic.gdx.maps.tiled.TiledMap;
import com.badlogic.gdx.maps.tiled.TmxMapLoader;
import com.badlogic.gdx.maps.tiled.renderers.OrthogonalTiledMapRenderer;
import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.JumpComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Components.TrackerComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystemManager;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.ScreenManager.GameScreen;
import com.brm.GoatEngine.ScreenManager.GameScreenManager;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.GrabbableComponent;
import com.brm.Kubotz.Component.Powerups.EnergeticShieldComponent;
import com.brm.Kubotz.Component.Powerups.InvincibilityComponent;
import com.brm.Kubotz.Component.SpawnPointComponent;
import com.brm.Kubotz.Config;
import com.brm.Kubotz.Entities.BlockFactory;
import com.brm.Kubotz.Entities.KubotzFactory;
import com.brm.Kubotz.Systems.*;
import com.brm.Kubotz.Systems.MovementSystems.MovementSystem;
import com.brm.Kubotz.Systems.SkillsSystem.SkillSystem;


public class InGameScreen extends GameScreen {

    private EntityManager entityManager;
    private EntitySystemManager systemManager;

    //MAP
    private TiledMap tiledMap;
    private OrthogonalTiledMapRenderer mapRenderer;

    //PLAYER
    private Entity player;


    public InGameScreen() {
    }


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

        systemManager.addSystem(SkillSystem.class, new SkillSystem(this.entityManager));


        systemManager.addSystem(PunchSystem.class, new PunchSystem(this.entityManager));

        systemManager.addSystem(LifespanSystem.class, new LifespanSystem(this.entityManager));

        systemManager.addSystem(DamageSystem.class, new DamageSystem(this.entityManager));

        systemManager.addSystem(PowerUpsSystem.class, new PowerUpsSystem(this.entityManager));




        // MAP


        //LOAD MAP
        tiledMap = new TmxMapLoader().load("res/maps/BasicCube.tmx");
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
                        .withHeight(1.0f)
                        .withCameraTargetComponent()
                        .build();
            }else if(objType.equals("BONUS_SPAWN")){
                Entity entity = new Entity();
                entityManager.registerEntity(entity);
                entity.addComponent(new SpawnPointComponent(new Vector2(rect.getX()/tileSize, rect.getY()/tileSize),
                        SpawnPointComponent.Type.PowerUp), SpawnPointComponent.ID);


            }else{
                new BlockFactory(this.entityManager, systemManager.getSystem(PhysicsSystem.class).getWorld(),
                        new Vector2(rect.getX()/tileSize, rect.getY()/tileSize))
                        .withSize(0.5f,0.5f)
                        .withSize(rect.getWidth()/tileSize, rect.getHeight()/tileSize)
                        .build();
            }
        }







        

        Entity bo = new KubotzFactory(entityManager, systemManager.getSystem(PhysicsSystem.class).getWorld(), new Vector2(7,2))
                .withHeight(1.0f)
                .withCameraTargetComponent().build();
        bo.disableComponent(VirtualGamePad.ID);
        bo.addComponent(new GrabbableComponent(), GrabbableComponent.ID);


        Logger.log("In Game State initialised");


    }

    @Override
    public void cleanUp() {

    }

    @Override
    public void resume() {

    }

    @Override
    public void handleInput(GameScreenManager engine) {


        systemManager.getSystem(InputTranslationSystem.class).update();
        systemManager.getSystem(GrabSystem.class).handleInput();
        systemManager.getSystem(SkillSystem.class).handleInput();
        systemManager.getSystem(PunchSystem.class).handleInput();
        systemManager.getSystem(MovementSystem.class).handleInput();




    }

    @Override
    public void update(GameScreenManager engine, float deltaTime) {



        systemManager.getSystem(MovementSystem.class).update();
        systemManager.getSystem(TrackerSystem.class).update();
        systemManager.getSystem(SkillSystem.class).update();
        systemManager.getSystem(PunchSystem.class).update();
        systemManager.getSystem(GrabSystem.class).update();
        systemManager.getSystem(DamageSystem.class).update();
        systemManager.getSystem(LifespanSystem.class).update();

        systemManager.getSystem(PhysicsSystem.class).update(deltaTime);
        systemManager.getSystem(RenderingSystem.class).update();

        systemManager.getSystem(PowerUpsSystem.class).update();
    }

    @Override
    public void draw(GameScreenManager engine) {
        // CLEAR SCREEN
        //Gdx.gl.glClearColor(0.1f, 0.1f, 0.1f, 1);
        Gdx.gl.glClearColor(0.07f, 0.2f, 0.3f, 1);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);



        // DRAW WORLD
        systemManager.getSystem(RenderingSystem.class).render();
        this.mapRenderer.setView(systemManager.getSystem(RenderingSystem.class).getCamera());
        this.mapRenderer.render();


        // FPS
        if(Config.DEBUG_RENDERING_ENABLED) {
            SpriteBatch sb = systemManager.getSystem(RenderingSystem.class).getSpriteBatch();
            BitmapFont font = new BitmapFont();
            sb.begin();
            font.draw(sb, "FPS: " + Gdx.graphics.getFramesPerSecond(), 0, Gdx.graphics.getHeight());
            font.draw(sb, "IS GROUNDED: " + ((PhysicsComponent) this.player.getComponent(PhysicsComponent.ID)).isGrounded(), 0, Gdx.graphics.getHeight() - 30);


            String velText = "Velocity: " + ((PhysicsComponent) this.player.getComponent(PhysicsComponent.ID)).getVelocity();
            font.draw(sb, velText, 0, Gdx.graphics.getHeight() - 50);

            font.draw(sb, "NB JUMPS: " + ((JumpComponent) this.player.getComponent(JumpComponent.ID)).nbJujmps, 0, Gdx.graphics.getHeight() - 80);
            font.draw(sb, "NB JUMPS MAX: " + ((JumpComponent) this.player.getComponent(JumpComponent.ID)).getNbJumpsMax(), 0, Gdx.graphics.getHeight() - 100);
            sb.end();
        }
        //Logger.log(this.entityManager.getEntitiesWithTag(Constants.ENTITY_TAG_PUNCH).size());


    }
}
