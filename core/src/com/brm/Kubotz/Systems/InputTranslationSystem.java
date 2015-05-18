package com.brm.Kubotz.Systems;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.Kubotz.Input.GameButton;
import com.brm.Kubotz.Input.UserInput;

/**
 * Used to manage User input and AI input
 * These inputs are first translated to virtual GamePad inputs
 */
public class InputTranslationSystem extends EntitySystem {


    public InputTranslationSystem(EntityManager em) {
        super(em);
    }

    @Override
    public void init(){}



    /**
     * Translates the Input to GameActions
     */
    @Override
    public void handleInput(){
        //find player
        for(Entity e: em.getEntitiesWithComponent(VirtualGamePad.ID)){
            VirtualGamePad gamePad = (VirtualGamePad)e.getComponent(VirtualGamePad.ID);
            gamePad.releaseAll(); //Release for everyone so with don't attack the button


            if (gamePad.isEnabled()) {
                //Translation of the USER INPUT
                if (gamePad.inputSource == VirtualGamePad.InputSource.USER_INPUT && Gdx.input.isKeyPressed(Input.Keys.ANY_KEY)) {

                    // Movement Buttons
                    // up XOR down ==> prevalence of UP
                    if (Gdx.input.isKeyPressed(UserInput.MOVE_UP)) {
                        gamePad.pressButton(GameButton.MOVE_UP);
                    } else if (Gdx.input.isKeyPressed(UserInput.MOVE_DOWN)) {
                        gamePad.pressButton(GameButton.MOVE_DOWN);
                    }

                    // left XOR right ==> prevalence of left
                    if (Gdx.input.isKeyPressed(UserInput.MOVE_LEFT)) {
                        gamePad.pressButton(GameButton.MOVE_LEFT);
                    } else if (Gdx.input.isKeyPressed(UserInput.MOVE_RIGHT)) {
                        gamePad.pressButton(GameButton.MOVE_RIGHT);
                    }

                    //Action buttons
                    if (Gdx.input.isKeyJustPressed(UserInput.PRIMARY_ACTION_BUTTON)) {
                        gamePad.pressButton(GameButton.PRIMARY_ACTION_BUTTON);
                    }

                    if (Gdx.input.isKeyJustPressed(UserInput.SECONDARY_ACTION_BUTTON)) {
                        gamePad.pressButton(GameButton.SECONDARY_ACTION_BUTTON);
                    }

                    if (Gdx.input.isKeyJustPressed(UserInput.START)) {
                        gamePad.pressButton(GameButton.START_BUTTON);
                    }

                    if (Gdx.input.isKeyJustPressed(UserInput.PUNCH)) {
                        gamePad.pressButton(GameButton.PUNCH_BUTTON);
                    }

                    if (Gdx.input.isKeyJustPressed(UserInput.ACTIVE_SKILL)) {
                        gamePad.pressButton(GameButton.ACTIVE_SKILL_BUTTON);
                    }
                }
            }
        }
    }


    @Override
    public void update(float dt) {}

}
