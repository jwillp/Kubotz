package com.brm.Kubotz.Scripts;

import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Scripts.EntityScript;
import com.brm.GoatEngine.Input.VirtualButton;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.Kubotz.Components.KubotzActionComponent;
import com.brm.Kubotz.Components.Movements.FlyComponent;
import com.brm.Kubotz.Components.Movements.RunningComponent;
import com.brm.Kubotz.Components.Parts.Weapons.LaserSwordComponent;
import com.brm.Kubotz.Game;
import com.brm.Kubotz.Input.GameButton;

import java.util.ArrayList;

/**
 * Script used to control a Kubotz, according to the input of the player.
 * It verifies user input and translates it to Intent (Actions)
 */
public class KubotzCharacterControllerScript extends EntityScript{

    @Override
    public void onUpdate(Entity entity){ }


    @Override
    public void onInput(Entity entity, ArrayList<VirtualButton> pressedButtons){
        KubotzActionComponent action = (KubotzActionComponent) entity.getComponent(KubotzActionComponent.ID);

        if(pressedButtons.contains(GameButton.BUTTON_A)){ // ATTACK

        }else if(pressedButtons.contains(GameButton.BUTTON_B)){ // GRAB

        }else if(pressedButtons.contains(GameButton.BUTTON_X)){ // SPECIAL

        }else{ //Simple Moves
            if(pressedButtons.contains(GameButton.BUTTON_Y)){
                if(entity.hasComponentEnabled(RunningComponent.ID)){
                    action.setAction(KubotzActionComponent.Action.JUMP);
                }
            }else if(pressedButtons.contains(GameButton.DPAD_UP)){
                ac
            }else if(pressedButtons.contains(GameButton.DPAD_DOWN)){

            }else if(pressedButtons.contains(GameButton.DPAD_LEFT)){

            }else if(pressedButtons.contains(GameButton.DPAD_RIGHT)){

            }



        }







    }




    /**
     * Handles the input translation when airborne
     */
    private void handleAirborne(Entity entity){
        VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);
        KubotzActionComponent action = (KubotzActionComponent) entity.getComponent(KubotzActionComponent.ID);

        if(gamePad.isButtonPressed(GameButton.BUTTON_A)){
            if(gamePad.isButtonPressed(GameButton.DPAD_UP)){
                action.setAction(KubotzActionComponent.Action.AIR_ATTACK_UP);

            }else if(gamePad.isButtonPressed(GameButton.DPAD_DOWN)){
                action.setAction(KubotzActionComponent.Action.AIR_ATTACK_DOWN);

            }else if(gamePad.isButtonPressed(GameButton.DPAD_LEFT)){ //TODO See with facing direction
                action.setAction(KubotzActionComponent.Action.AIR_ATTACK_FORWARD);

            }else if(gamePad.isButtonPressed(GameButton.DPAD_RIGHT)){  //TODO See with facing direction
                action.setAction(KubotzActionComponent.Action.AIR_ATTACK_BACK);
            }else{
                action.setAction(KubotzActionComponent.Action.AIR_ATTACK_NEUTRAL);
            }
        }

    }





















}
