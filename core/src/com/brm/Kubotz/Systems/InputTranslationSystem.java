package com.brm.Kubotz.Systems;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.Kubotz.Input.GameButton;
import com.brm.Kubotz.Input.UserInput;

/**
 * Used to manage User input and AI input
 * These inputs are first translated to virtual GamePad inputs
 */
public class InputTranslationSystem extends EntitySystem {


    public InputTranslationSystem(){}

    @Override
    public void init(){}



    /**
     * Translates the Input to GameActions
     */
    @Override
    public void handleInput(){
        //find player
        for(Entity e: getEntityManager().getEntitiesWithComponent(VirtualGamePad.ID)){
            VirtualGamePad gamePad = (VirtualGamePad)e.getComponent(VirtualGamePad.ID);
            gamePad.releaseAll(); //Release for everyone so with don't attack the button


            if (gamePad.isEnabled()) {
                //Translation of the USER INPUT
                if (gamePad.inputSource == VirtualGamePad.InputSource.USER_INPUT && Gdx.input.isKeyPressed(Input.Keys.ANY_KEY)) {

                    // Movement Buttons
                    // up XOR down ==> prevalence of UP
                    if (Gdx.input.isKeyPressed(UserInput.DPAD_UP)) {
                        gamePad.pressButton(GameButton.DPAD_UP);
                    } else if (Gdx.input.isKeyPressed(UserInput.DPAD_DOWN)) {
                        gamePad.pressButton(GameButton.DPAD_DOWN);
                    }

                    // left XOR right ==> prevalence of left
                    if (Gdx.input.isKeyPressed(UserInput.DPAD_LEFT)) {
                        gamePad.pressButton(GameButton.DPAD_LEFT);
                    } else if (Gdx.input.isKeyPressed(UserInput.DPAD_RIGHT)) {
                        gamePad.pressButton(GameButton.DPAD_RIGHT);
                    }

                    //Action buttons
                    if (Gdx.input.isKeyJustPressed(UserInput.BUTTON_B)) {
                        gamePad.pressButton(GameButton.BUTTON_B);
                    }

                    if (Gdx.input.isKeyJustPressed(UserInput.BUTTON_Y)) {
                        gamePad.pressButton(GameButton.BUTTON_Y);
                    }

                    if (Gdx.input.isKeyJustPressed(UserInput.START)) {
                        gamePad.pressButton(GameButton.START_BUTTON);
                    }

                    if (Gdx.input.isKeyJustPressed(UserInput.BUTTON_A)) {
                        gamePad.pressButton(GameButton.BUTTON_A);
                    }

                    if (Gdx.input.isKeyJustPressed(UserInput.BUTTON_X)) {
                        gamePad.pressButton(GameButton.BUTTON_X);
                    }
                }
            }
        }
    }


    @Override
    public void update(float dt) {}

}
