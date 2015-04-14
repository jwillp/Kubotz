package com.brm.Kubotz.GameScreens;


import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.maps.MapObjects;
import com.badlogic.gdx.maps.objects.RectangleMapObject;
import com.badlogic.gdx.maps.tiled.TiledMap;
import com.badlogic.gdx.maps.tiled.TmxMapLoader;
import com.badlogic.gdx.maps.tiled.renderers.OrthogonalTiledMapRenderer;
import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.AI.Pathfinding.Node;
import com.brm.GoatEngine.AI.Pathfinding.Pathfinder;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.ScreenManager.GameScreen;
import com.brm.GoatEngine.ScreenManager.GameScreenManager;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.AI.KubotzAIComponent;
import com.brm.Kubotz.Component.PickableComponent;
import com.brm.Kubotz.Config;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Entities.BlockFactory;
import com.brm.Kubotz.Entities.KubotzFactory;
import com.brm.Kubotz.Systems.*;
import com.brm.Kubotz.Systems.MovementSystems.MovementSystem;
import com.brm.Kubotz.Systems.SkillsSystem.SkillSystem;
import com.sun.xml.internal.bind.v2.runtime.reflect.opt.Const;

import java.util.ArrayList;


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

    private KubotzAISystem aiSystem;


    //MAP
    private TiledMap tiledMap;
    private OrthogonalTiledMapRenderer mapRenderer;

    //PLAYER
    private Entity player;
    private PunchSystem punchSystem;
    private ObjectSystem objectSystem;
    private GunSystem gunSystem;




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


        this.gunSystem = new GunSystem(this.entityManager);

        this.aiSystem = new KubotzAISystem(this.entityManager);



        // MAP


        //LOAD MAP
        tiledMap = new TmxMapLoader().load("res/maps/BasicCube.tmx");
        float tileSize = tiledMap.getProperties().get("tilewidth", Integer.class);


        mapRenderer = new OrthogonalTiledMapRenderer(tiledMap, 1/tileSize);


        MapObjects mapObjects = tiledMap.getLayers().get("objects").getObjects();



        for(int i=0; i<mapObjects.getCount(); i++){


            RectangleMapObject obj = (RectangleMapObject) mapObjects.get(i);
            Rectangle rect = obj.getRectangle();
            String type = (String) obj.getProperties().get("type");

            if(type.equals("PLAYER_SPAWN")){
                this.player = new KubotzFactory(entityManager, physicsSystem.getWorld(),
                        new Vector2(rect.getX()/tileSize, rect.getY()/tileSize))
                        .withHeight(1.0f)
                        .withCameraTargetComponent()
                        .withTag("player")
                        .build();
            }else {
                if (type.equals("STATIC_PLATFORM") || type.equals("WALL") || type.equals("WARP_ZONE")) {
                    String tag = type.equals("STATIC_PLATFORM") ? Constants.ENTITY_TAG_PLATFORM : "AUTRE";

                    new BlockFactory(this.entityManager, physicsSystem.getWorld(),
                            new Vector2(rect.getX() / tileSize, rect.getY() / tileSize))
                            .withSize(rect.getWidth() / tileSize, rect.getHeight() / tileSize)
                            .withTag(tag)
                            .build();
                }
            }
        }




        for(int i=0; i<1; i++){
            Entity ba = new KubotzFactory(entityManager, physicsSystem.getWorld(), new Vector2(5 + i,7))
                    .withHeight(1.0f)
                    .withInputSource(VirtualGamePad.InputSource.AI_INPUT)
                    .withCameraTargetComponent().build();
            ba.addComponent(new KubotzAIComponent(this.entityManager, ba, this.aiSystem.pathfinder), KubotzAIComponent.ID);
            //bo.disableComponent(VirtualGamePad.ID);

            ba.addComponent(new PickableComponent(), PickableComponent.ID);

        }












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
        this.aiSystem.update();


        this.skillSystem.handleInput();
        this.gunSystem.handleInput();
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
        this.mapRenderer.setView(this.renderingSystem.getCamera());
        this.mapRenderer.render();
        this.renderingSystem.render(physicsSystem.getWorld());



        ShapeRenderer sr = this.renderingSystem.getShapeRenderer();
        OrthographicCamera cam = this.renderingSystem.getCamera();



        //Logger.log(this.entityManager.getEntitiesWithTag(Constants.ENTITY_TAG_PUNCH).size());


    }
}
