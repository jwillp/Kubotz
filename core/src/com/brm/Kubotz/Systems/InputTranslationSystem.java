package com.brm.Kubotz.Systems;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input;
import com.brm.Kubotz.Input.ActionInput;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.Kubotz.Input.GameAction;

import java.util.ArrayList;

/**
 * Used to manage User input
 * These inputs are first translated to game intelligeable game actions (jump, attack shoot etc.)
 * and then sent over to the network (if multiplayer game) or directly to the GameActionList of the GameState
 * (if singleplayer game). The other systems can then process the GameActions and apply the correct behaviours
 */
public class InputTranslationSystem extends com.brm.GoatEngine.ECS.System.System {


    public InputTranslationSystem(EntityManager em) {
        super(em);
    }

    /**
     * Translates the Input to GameActions
     * @param gameActions
     */
    public void update(ArrayList<GameAction> gameActions){
        //Translate process
        if(Gdx.input.isKeyPressed(Input.Keys.ANY_KEY)){

            if(Gdx.input.isKeyPressed(ActionInput.MOVE_LEFT) && Gdx.input.isKeyPressed(ActionInput.MOVE_RIGHT)){
                gameActions.add(new GameAction().addData("TYPE", GameAction.MOVE_STOP));
            }

            else if(Gdx.input.isKeyPressed(ActionInput.JUMP) && !Gdx.input.isKeyPressed(ActionInput.MOVE_DOWN )){
                gameActions.add(new GameAction().addData("TYPE", GameAction.MOVE_JUMP));
            }

            else if(Gdx.input.isKeyPressed(ActionInput.MOVE_DOWN) && !Gdx.input.isKeyPressed(ActionInput.JUMP )){
                gameActions.add(new GameAction().addData("TYPE", GameAction.MOVE_DOWN));
            }

            else if(Gdx.input.isKeyPressed(ActionInput.MOVE_LEFT)){
                gameActions.add(new GameAction().addData("TYPE", GameAction.MOVE_LEFT));
            }


            else if(Gdx.input.isKeyPressed(ActionInput.MOVE_RIGHT)){
                gameActions.add(new GameAction().addData("TYPE", GameAction.MOVE_RIGHT));
            }

            else if(Gdx.input.isKeyPressed(ActionInput.SPECIAL_ATTACK)){
                gameActions.add(new GameAction().addData("TYPE", GameAction.PRIMARY_SKILL));
            }

        }


    }


}
