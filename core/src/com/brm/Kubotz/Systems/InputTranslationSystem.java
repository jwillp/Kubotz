package com.brm.Kubotz.Systems;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.Kubotz.Component.ControllableComponent;
import com.brm.Kubotz.Input.ActionInput;
import com.brm.Kubotz.Input.GameAction;

/**
 * Used to manage User input
 * These inputs are first translated to game actions (jump, attack shoot etc.)
 * and then sent over to the network (if multiplayer game) or directly to the GameActionList of the GameState
 * (if singleplayer game). The other systems can then process the GameActions and apply the correct behaviours
 */
public class InputTranslationSystem extends com.brm.GoatEngine.ECS.System.System {


    public InputTranslationSystem(EntityManager em) {
        super(em);
    }

    /**
     * Translates the Input to GameActions
     */
    public void update(){
        //find player
        for(Entity e: em.getEntitiesWithComponent(ControllableComponent.ID)){
            ControllableComponent cp = (ControllableComponent)e.getComponent(ControllableComponent.ID);

            //Translatation of the USER INPUT
            if(Gdx.input.isKeyPressed(Input.Keys.ANY_KEY) && cp.inputSource == ControllableComponent.InputSource.USER_INPUT){

                if(Gdx.input.isKeyPressed(ActionInput.MOVE_LEFT) && Gdx.input.isKeyPressed(ActionInput.MOVE_RIGHT)){
                    cp.gameActions.add(new GameAction().addData("TYPE", GameAction.MOVE_STOP));
                }

                else if(Gdx.input.isKeyPressed(ActionInput.JUMP) && !Gdx.input.isKeyPressed(ActionInput.MOVE_DOWN )){
                    cp.gameActions.add(new GameAction().addData("TYPE", GameAction.MOVE_JUMP));
                }

                else if(Gdx.input.isKeyPressed(ActionInput.MOVE_DOWN) && !Gdx.input.isKeyPressed(ActionInput.JUMP )){
                    cp.gameActions.add(new GameAction().addData("TYPE", GameAction.MOVE_DOWN));
                }

                else if(Gdx.input.isKeyPressed(ActionInput.MOVE_LEFT)){
                    cp.gameActions.add(new GameAction().addData("TYPE", GameAction.MOVE_LEFT));
                }

                else if(Gdx.input.isKeyPressed(ActionInput.MOVE_RIGHT)){
                    cp.gameActions.add(new GameAction().addData("TYPE", GameAction.MOVE_RIGHT));
                }

                else if(Gdx.input.isKeyPressed(ActionInput.SPECIAL_ATTACK)){
                    cp.gameActions.add(new GameAction().addData("TYPE", GameAction.PRIMARY_SKILL));
                }

            }
        }
    }


}
