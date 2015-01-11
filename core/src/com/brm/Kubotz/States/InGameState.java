package com.brm.Kubotz.States;


import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.StateManger.GameState;
import com.brm.GoatEngine.StateManger.GameStateManager;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.Kubotz.Entities.BlockBuilder;
import com.brm.Kubotz.Entities.EntityFactory;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.Kubotz.Entities.RobotBuilder;
import com.brm.Kubotz.Input.GameAction;
import com.brm.Kubotz.Component.CameraTargetComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.Kubotz.Systems.CharacterControlSystem;
import com.brm.Kubotz.Systems.InputTranslationSystem;
import com.brm.Kubotz.Systems.PhysicsSystem;
import com.brm.Kubotz.Systems.RenderingSystem;

import java.util.ArrayList;
import java.util.Random;


public class InGameState extends GameState {

    private EntityManager entityManager;
    private RenderingSystem renderingSystem;
    private PhysicsSystem physicsSystem;
    private InputTranslationSystem inputSystem;

    private CharacterControlSystem characterControlSystem;


    private Entity player;







    @Override
    public void init(GameStateManager engine) {

        Logger.log("In Game State initialisation");

        // Systems Init
        this.entityManager = new EntityManager();

        this.physicsSystem = new PhysicsSystem(this.entityManager);
        this.physicsSystem.init();

        this.renderingSystem = new RenderingSystem(this.entityManager);
        this.renderingSystem.init();

        this.inputSystem = new InputTranslationSystem(this.entityManager);
        this.inputSystem.init();

        this.characterControlSystem = new CharacterControlSystem(this.entityManager);
        this.characterControlSystem.init();




        // MAP
        Random rand = new Random();

        //ground
        new BlockBuilder(this.entityManager, physicsSystem.getWorld(), new Vector2(1,1)).withSize(20,1).build();


        //Blocks
        new BlockBuilder(this.entityManager, physicsSystem.getWorld(), new Vector2(3,5)).withSize(3,1).build();

        new BlockBuilder(this.entityManager, physicsSystem.getWorld(), new Vector2(7,10)).withSize(3,1).build();

        new BlockBuilder(this.entityManager, physicsSystem.getWorld(), new Vector2(10,12)).withSize(3,1).build();


        // Player
        this.player = new RobotBuilder(entityManager, physicsSystem.getWorld(), new Vector2(2,5)).
                withCameraTargetComponent().build();


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
    }

    @Override
    public void update(GameStateManager engine, float deltaTime) {



        this.characterControlSystem.update();
        this.physicsSystem.update(deltaTime);
        this.renderingSystem.update();

    }

    @Override
    public void draw(GameStateManager engine) {
        // CLEAR SCREEN
        Gdx.gl.glClearColor(0.1f, 0.1f, 0.1f, 1);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);



        // DRAW WORLD
        this.renderingSystem.render(physicsSystem.getWorld());



        // FPS
        /*if(Config.DEBUG_RENDERING_ENABLED){*/
            SpriteBatch sb = this.renderingSystem.getSpriteBatch();
            BitmapFont font = new BitmapFont();
            sb.begin();
            font.draw(sb, "FPS: " + Gdx.graphics.getFramesPerSecond(), 0, Gdx.graphics.getHeight());
            font.draw(sb, "IS GROUNDED: " + ((PhysicsComponent)this.player.getComponent(PhysicsComponent.ID)).isGrounded(), 0, Gdx.graphics.getHeight()-30);
            font.draw(sb, "HAS CAMERA: " + (this.player.hasComponent(CameraTargetComponent.ID)), 0, Gdx.graphics.getHeight()-50);

        sb.end();
        /*}*/



        //Logger.log(Gdx.graphics.getFramesPerSecond() + " FPS");

    }
}
