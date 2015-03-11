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
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.ScreenManager.GameScreen;
import com.brm.GoatEngine.ScreenManager.GameScreenManager;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.PickableComponent;
import com.brm.Kubotz.Config;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Entities.BlockFactory;
import com.brm.Kubotz.Entities.KubotzFactory;
import com.brm.Kubotz.Systems.*;
import com.brm.Kubotz.Systems.MovementSystems.MovementSystem;
import com.brm.Kubotz.Systems.SkillsSystem.SkillSystem;


public class InGameScreen extends GameScreen {

    private EntityManager entityManager;
    private RenderingSystem renderingSystem;
    private PhysicsSystem physicsSystem;
    private InputTranslationSystem inputSystem;
    private TrackerSystem trackerSystem;
    private SkillSystem skillSystem;
    private MovementSystem movementSystem;

    private LifespanSystem lifespanSystem;

    private DamageSystem damageSystem;



    //MAP
    private TiledMap tiledMap;
    private OrthogonalTiledMapRenderer mapRenderer;

    //PLAYER
    private Entity player;
    private PunchSystem punchSystem;
    private ObjectSystem objectSystem;


    public InGameScreen() {
    }


    @Override
    public void init(GameScreenManager engine) {

        Logger.log("In Game State initialisation");

        // Systems Init
        this.entityManager = new EntityManager();

        this.physicsSystem = new PhysicsSystem(this.entityManager);

        this.renderingSystem = new RenderingSystem(this.entityManager);


        this.inputSystem = new InputTranslationSystem(this.entityManager);


        this.movementSystem = new MovementSystem(this.entityManager);



        this.trackerSystem = new TrackerSystem(this.entityManager);

        this.skillSystem = new SkillSystem(this.entityManager);

        this.punchSystem = new PunchSystem(this.entityManager);



        this.objectSystem = new ObjectSystem(this.entityManager);

        this.lifespanSystem = new LifespanSystem(this.entityManager);


        this.damageSystem = new DamageSystem(this.entityManager);



        // MAP


        //LOAD MAP
        tiledMap = new TmxMapLoader().load("res/maps/BasicCube.tmx");
        float tileSize = tiledMap.getProperties().get("tilewidth", Integer.class);


        mapRenderer = new OrthogonalTiledMapRenderer(tiledMap, 1/tileSize);


        MapObjects mapObjects = tiledMap.getLayers().get("objects").getObjects();


        for(int i=0; i<mapObjects.getCount(); i++){


            RectangleMapObject obj = (RectangleMapObject) mapObjects.get(i);
            Rectangle rect = obj.getRectangle();

            if(obj.getProperties().get("type").equals("PLAYER_SPAWN")){
                this.player = new KubotzFactory(entityManager, physicsSystem.getWorld(),
                        new Vector2(rect.getX()/tileSize, rect.getY()/tileSize))
                        .withHeight(1.0f)
                        .withCameraTargetComponent()
                        .build();
            }else{
                new BlockFactory(this.entityManager, physicsSystem.getWorld(),
                        new Vector2(rect.getX()/tileSize, rect.getY()/tileSize))
                        .withSize(0.5f,0.5f)
                        .withSize(rect.getWidth()/tileSize, rect.getHeight()/tileSize)
                        .build();
            }
        }







        

        Entity bo = new KubotzFactory(entityManager, physicsSystem.getWorld(), new Vector2(7,2))
                .withHeight(1.0f)
                .withCameraTargetComponent().build();
        bo.disableComponent(VirtualGamePad.ID);
        bo.addComponent(new PickableComponent(), PickableComponent.ID);
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
        this.inputSystem.update();
        this.skillSystem.handleInput();
        this.punchSystem.handleInput();
        this.movementSystem.handleInput();

        this.objectSystem.handleInput();


    }

    @Override
    public void update(GameScreenManager engine, float deltaTime) {



        this.movementSystem.update();
        this.trackerSystem.update();
        this.skillSystem.update();
        this.punchSystem.update();
        this.objectSystem.update();
        this.damageSystem.update();
        this.lifespanSystem.update();

        this.physicsSystem.update(deltaTime);
        this.renderingSystem.update();

    }

    @Override
    public void draw(GameScreenManager engine) {
        // CLEAR SCREEN
        //Gdx.gl.glClearColor(0.1f, 0.1f, 0.1f, 1);
        Gdx.gl.glClearColor(0.07f, 0.2f, 0.3f, 1);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);



        // DRAW WORLD
        this.renderingSystem.render(physicsSystem.getWorld());
        this.mapRenderer.setView(this.renderingSystem.getCamera());
        this.mapRenderer.render();


        // FPS
        if(Config.DEBUG_RENDERING_ENABLED) {
            SpriteBatch sb = this.renderingSystem.getSpriteBatch();
            BitmapFont font = new BitmapFont();
            sb.begin();
            font.draw(sb, "FPS: " + Gdx.graphics.getFramesPerSecond(), 0, Gdx.graphics.getHeight());
            font.draw(sb, "IS GROUNDED: " + ((PhysicsComponent) this.player.getComponent(PhysicsComponent.ID)).isGrounded(), 0, Gdx.graphics.getHeight() - 30);


            String velText = "Velocity: " + ((PhysicsComponent) this.player.getComponent(PhysicsComponent.ID)).getVelocity();

            font.draw(sb, velText, 0, Gdx.graphics.getHeight() - 50);
            sb.end();
        }
        //Logger.log(this.entityManager.getEntitiesWithTag(Constants.ENTITY_TAG_PUNCH).size());


    }
}
