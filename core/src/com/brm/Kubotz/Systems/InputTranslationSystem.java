package com.brm.Kubotz.Systems;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input;
import com.badlogic.gdx.controllers.Controller;
import com.badlogic.gdx.controllers.Controllers;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;

import com.brm.Kubotz.Config;
import com.brm.Kubotz.Features.GameRules.Components.PlayerScoreComponent;
import com.brm.Kubotz.Input.DiaronControllerMap;
import com.brm.Kubotz.Input.GameButton;
import com.brm.Kubotz.Input.ControllerMap;
import com.brm.Kubotz.Input.Xbox360ControllerMap;


import java.util.HashMap;

/**
 * Used to manage User input
 * These inputs are first translated to virtual GamePad inputs
 * Collect low-level input events and generate high-level (read game event) input events.
 * For instance the 'W' key with the virtual DPAD_UP_BUTTON
 * The input from the virtual controller (called Virtual Input) will then be processed
 * By different CharacterController Systems that will Map these virtual input events
 * to Game Events that will be read by other systems to apply Game Logic
 *
 * // TODO Clean up? the handle Input is waaaaaayyyy tooo long!
 */
public class InputTranslationSystem extends EntitySystem {

    private HashMap<GameButton, Integer> player1Map = new HashMap<GameButton, Integer>();
    private HashMap<GameButton, Integer> player2Map = new HashMap<GameButton, Integer>();

    private Controller player1Controller = null;
    private Controller player2Controller = null;

    public InputTranslationSystem(){

        if(Config.PLAYER_1_USE_GAMEPAD){
            player1Controller = Controllers.getControllers().first(); // DIARON
        }

        if(Config.PLAYER_2_USE_GAMEPAD){
            player2Controller = Controllers.getControllers().get(1); // XBOX
        }

        this.mapKeyboard();

    }



    @Override
    public void init(){}


    /**
     * Maps the Keyboard keys to Virtual GamePad
     */
    private void mapKeyboard(){
        // PLAYER 1
        player1Map.put(GameButton.DPAD_UP, Config.PLAYER_1_MOVE_UP);
        player1Map.put(GameButton.DPAD_DOWN, Config.PLAYER_1_MOVE_DOWN);
        player1Map.put(GameButton.DPAD_LEFT, Config.PLAYER_1_MOVE_LEFT);
        player1Map.put(GameButton.DPAD_RIGHT, Config.PLAYER_1_MOVE_RIGHT);

        player1Map.put(GameButton.BUTTON_START, Config.PLAYER_1_START);

        player1Map.put(GameButton.BUTTON_A, Config.PLAYER_1_ATTACK_BUTTON);
        player1Map.put(GameButton.BUTTON_B, Config.PLAYER_1_GRAB_BUTTON);
        player1Map.put(GameButton.BUTTON_X, Config.PLAYER_1_SPECIAL_BUTTON);
        player1Map.put(GameButton.BUTTON_Y, Config.PLAYER_1_MOVE_UP);
        player1Map.put(GameButton.BUTTON_R, Config.PLAYER_1_THROW_BUTTON);



        // PLAYER 2
        player2Map.put(GameButton.DPAD_UP, Config.PLAYER_2_MOVE_UP);
        player2Map.put(GameButton.DPAD_DOWN, Config.PLAYER_2_MOVE_DOWN);
        player2Map.put(GameButton.DPAD_LEFT, Config.PLAYER_2_MOVE_LEFT);
        player2Map.put(GameButton.DPAD_RIGHT, Config.PLAYER_2_MOVE_RIGHT);

        player2Map.put(GameButton.BUTTON_START, Config.PLAYER_2_START);

        player2Map.put(GameButton.BUTTON_A, Config.PLAYER_2_ATTACK_BUTTON);
        player2Map.put(GameButton.BUTTON_B, Config.PLAYER_2_GRAB_BUTTON);
        player2Map.put(GameButton.BUTTON_X, Config.PLAYER_2_SPECIAL_BUTTON);
        player2Map.put(GameButton.BUTTON_Y, Config.PLAYER_2_MOVE_UP);
        player2Map.put(GameButton.BUTTON_R, Config.PLAYER_2_THROW_BUTTON);

    }








    /**
     * Translates the Input to GameActions
     */
    @Override
    public void handleInput(){
        //find player
        for(Entity e: getEntityManager().getEntitiesWithComponent(VirtualGamePad.ID)){
            VirtualGamePad gamePad = (VirtualGamePad)e.getComponent(VirtualGamePad.ID);
            gamePad.releaseAll(); //Release for everyone, prevents button bashing :)

            if (gamePad.isEnabled()) {
                //Translation of the USER INPUT
                if (gamePad.inputSource == VirtualGamePad.InputSource.USER_INPUT) {
                    PlayerScoreComponent playerInfo = (PlayerScoreComponent) e.getComponent(PlayerScoreComponent.ID);
                    if(playerInfo.getPlayerId() == 1 && Config.PLAYER_1_USE_GAMEPAD){
                        translateController(playerInfo.getPlayerId(), gamePad);
                    }else{
                        translateKeyboard(playerInfo.getPlayerId(), gamePad);
                    }
                }
            }
        }
    }


    @Override
    public void update(float dt) {}

    /**
     * When using a Physical GamePad
     */
    private void translateController(int playerId, VirtualGamePad gamePad){

        Controller controller = null;
        ControllerMap map = null;

        if (playerId == 1) {
            controller = this.player1Controller;
            map = new DiaronControllerMap();
        } else if (playerId == 2) {
            controller = this.player2Controller;
            map = new Xbox360ControllerMap();
        }
        assert controller != null;


        //DIARON
        if(controller.getButton(map.getButtonA())){
            gamePad.pressButton(GameButton.BUTTON_A);
        }

        if(controller.getButton(map.getButtonB())){
            gamePad.pressButton(GameButton.BUTTON_B);
        }

        if(controller.getButton(map.getButtonX())){
            gamePad.pressButton(GameButton.BUTTON_X);
        }

        if(controller.getButton(map.getButtonY())){
            gamePad.pressButton(GameButton.DPAD_UP);
        }

        if(controller.getButton(map.getButtonR1())){
            gamePad.pressButton(GameButton.BUTTON_R);
        }

        if(controller.getButton(map.getButtonStart())){
            gamePad.pressButton(GameButton.BUTTON_START);
        }


        //Analog Stick
        if(controller.getAxis(map.getAxisLeftX()) == -1){
            gamePad.pressButton(GameButton.DPAD_LEFT);
        }
        if(controller.getAxis(map.getAxisLeftX()) == 1){
            gamePad.pressButton(GameButton.DPAD_RIGHT);
        }
        if(controller.getAxis(map.getAxisLeftY()) == -1){
            gamePad.pressButton(GameButton.DPAD_UP);
        }
        if(controller.getAxis(map.getAxisLeftY()) == 1){
            gamePad.pressButton(GameButton.DPAD_DOWN);
        }










    }




    /**
     * Translates the keyboard to Virtual GamePad
     */
    private void translateKeyboard(int playerId, VirtualGamePad gamePad){
        if (Gdx.input.isKeyPressed(Input.Keys.ANY_KEY)){
            HashMap<GameButton, Integer> map = null;
            // DEFINE MAP TO USE BASED ON INPUT ID
            switch (playerId) {
                case 1:
                    map = this.player1Map;
                    break;
                case 2:

                    map = this.player2Map;
                    break;
            }
            // LETS GO!
            // Movement Buttons
            // up XOR down ==> prevalence of UP
            if (Gdx.input.isKeyPressed(map.get(GameButton.DPAD_UP))) {
                gamePad.pressButton(GameButton.DPAD_UP);
            } else if (Gdx.input.isKeyPressed(map.get(GameButton.DPAD_DOWN))) {
                gamePad.pressButton(GameButton.DPAD_DOWN);
            }

            // left XOR right ==> prevalence of left
            if (Gdx.input.isKeyPressed(map.get(GameButton.DPAD_LEFT))) {
                gamePad.pressButton(GameButton.DPAD_LEFT);
            } else if (Gdx.input.isKeyPressed(map.get(GameButton.DPAD_RIGHT))) {
                gamePad.pressButton(GameButton.DPAD_RIGHT);
            }

            //Action buttons
            if (Gdx.input.isKeyJustPressed(map.get(GameButton.BUTTON_B))) {
                gamePad.pressButton(GameButton.BUTTON_B);
            }

            if (Gdx.input.isKeyJustPressed(map.get(GameButton.BUTTON_Y))) {
                gamePad.pressButton(GameButton.BUTTON_Y);
            }

            if (Gdx.input.isKeyJustPressed(map.get(GameButton.BUTTON_START))) {
                gamePad.pressButton(GameButton.BUTTON_START);
            }

            if (Gdx.input.isKeyJustPressed(map.get(GameButton.BUTTON_A))) {
                gamePad.pressButton(GameButton.BUTTON_A);
            }

            if (Gdx.input.isKeyJustPressed(map.get(GameButton.BUTTON_X))) {
                gamePad.pressButton(GameButton.BUTTON_X);
            }
        }
    }




















}
