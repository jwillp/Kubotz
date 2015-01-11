package com.brm.Kubotz.Component;

import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.Kubotz.Input.GameAction;

import java.util.ArrayList;

/**
 * Used to let an entity be controllable by user input or AI
 * This is some kind of a virtual joystick
 */
public class ControllableComponent extends Component {

    public enum InputSource{USER_INPUT, AI_INPUT};



    public InputSource inputSource;
    public static String ID =  "CONTROLLABLE_PROPERTY";
    public ArrayList<GameAction> gameActions;           //All the controllable Movements

    public ControllableComponent(InputSource inputSource){
        this.inputSource = inputSource;
        gameActions = new ArrayList<GameAction>();
    }
}
