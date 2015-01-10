package com.brm.Kubotz.States;


import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.brm.GoatEngine.StateManger.GameState;
import com.brm.GoatEngine.StateManger.GameStateManager;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.Kubotz.Entities.EntityFactory;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.Kubotz.GameAction;
import com.brm.Kubotz.Properties.CameraTargetProperty;
import com.brm.Kubotz.Properties.PhysicsProperty;
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


    private ArrayList<GameAction> gameActions;




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



        // Game Actions Container
        this.gameActions = new ArrayList<GameAction>();





        // MAP
        Random rand = new Random();

        //ground
        this.entityManager.registerEntity(EntityFactory.createBlock(physicsSystem.getWorld(), 1, 1, 20,1));

        //Blocks
        this.entityManager.registerEntity(EntityFactory.createBlock(physicsSystem.getWorld(), 3, 5, 3,1));

        this.entityManager.registerEntity(EntityFactory.createBlock(physicsSystem.getWorld(), 7, 10, 3,1));

        this.entityManager.registerEntity(EntityFactory.createBlock(physicsSystem.getWorld(), 10, 12, 3,1));


        // Player

        this.player = EntityFactory.createCharacter(physicsSystem.getWorld(), 2, 5);
        this.player.addProperty(new CameraTargetProperty(), CameraTargetProperty.ID);
        this.entityManager.registerEntity(this.player);
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
        this.inputSystem.update(gameActions);
    }

    @Override
    public void update(GameStateManager engine, float deltaTime) {



        this.characterControlSystem.update(this.gameActions);
        this.physicsSystem.update(deltaTime);

        this.gameActions.clear();

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
            font.draw(sb, "IS GROUNDED: " + ((PhysicsProperty)this.player.getProperty(PhysicsProperty.ID)).isGrounded(), 0, Gdx.graphics.getHeight()-30);
            sb.end();
        /*}*/



        //Logger.log(Gdx.graphics.getFramesPerSecond() + " FPS");

    }
}
