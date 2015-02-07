package com.brm.Kubotz.GameStates;


import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.maps.tiled.TiledMap;
import com.badlogic.gdx.maps.tiled.TiledMapTileLayer;
import com.badlogic.gdx.maps.tiled.TmxMapLoader;
import com.badlogic.gdx.maps.tiled.renderers.OrthogonalTiledMapRenderer;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.StateManger.GameState;
import com.brm.GoatEngine.StateManger.GameStateManager;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Config;
import com.brm.Kubotz.Entities.BlockBuilder;
import com.brm.Kubotz.Entities.RobotBuilder;
import com.brm.Kubotz.Systems.*;
import com.brm.Kubotz.Systems.MovementSystem.MovementSystem;
import com.brm.Kubotz.Systems.SkillsSystem.SkillSystem;

import java.util.Random;


public class InGameState extends GameState {

    private EntityManager entityManager;
    private RenderingSystem renderingSystem;
    private PhysicsSystem physicsSystem;
    private InputTranslationSystem inputSystem;
    private TrackerSystem trackerSystem;
    private SkillSystem skillSystem;
    private MovementSystem movementSystem;



    //MAP
    private TiledMap tiledMap;
    private OrthogonalTiledMapRenderer mapRenderer;

    //PLAYER
    private Entity player;



    public InGameState() {
    }


    @Override
    public void init(GameStateManager engine) {

        Logger.log("In Game State initialisation");

        // Systems Init
        this.entityManager = new EntityManager();

        this.physicsSystem = new PhysicsSystem(this.entityManager);

        this.renderingSystem = new RenderingSystem(this.entityManager);


        this.inputSystem = new InputTranslationSystem(this.entityManager);


        this.movementSystem = new MovementSystem(this.entityManager);



        this.trackerSystem = new TrackerSystem(this.entityManager);

        this.skillSystem = new SkillSystem(this.entityManager);







        // MAP


        //LOAD MAP
        tiledMap = new TmxMapLoader().load("res/maps/BasicCube.tmx");
        mapRenderer = new OrthogonalTiledMapRenderer(tiledMap);

        TiledMapTileLayer layer = (TiledMapTileLayer) tiledMap.getLayers().get("base");
        float tileSize = layer.getTileWidth();

        for(int row = 0; row <layer.getHeight(); row++){
            for(int col = 0; col <layer.getHeight(); col++){


                TiledMapTileLayer.Cell cell = layer.getCell(col, row);
                if(cell != null){
                    new BlockBuilder(this.entityManager, physicsSystem.getWorld(), new Vector2(col,row))
                            .withSize(0.5f,0.5f)
                            .build();
                }


            }
        }









        // Player
        this.player = new RobotBuilder(entityManager, physicsSystem.getWorld(), new Vector2(2,5))
                .withHeight(0.5f)
                .withCameraTargetComponent()
                .build();


        Entity bo = new RobotBuilder(entityManager, physicsSystem.getWorld(), new Vector2(7,2))
                .withHeight(0.5f)
                .withCameraTargetComponent().build();
        bo.disableComponent(VirtualGamePad.ID);
        Logger.log("In Game State initialised");


    }

    @Override
    public void cleanUp() {

    }

    @Override
    public void resume() {

    }

    @Override
    public void handleInput(GameStateManager engine) {
        this.inputSystem.update();
        this.skillSystem.handleInput();
        this.movementSystem.handleInput();

    }

    @Override
    public void update(GameStateManager engine, float deltaTime) {



        this.movementSystem.update();
        this.trackerSystem.update();
        this.skillSystem.update();
        this.physicsSystem.update(deltaTime);
        this.renderingSystem.update();

    }

    @Override
    public void draw(GameStateManager engine) {
        // CLEAR SCREEN
        //Gdx.gl.glClearColor(0.1f, 0.1f, 0.1f, 1);
        Gdx.gl.glClearColor(0.3f, 0.2f, 0.2f, 1);
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



        //Logger.log(Gdx.graphics.getFramesPerSecond() + " FPS");

    }
}
