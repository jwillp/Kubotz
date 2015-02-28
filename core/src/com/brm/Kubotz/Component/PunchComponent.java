package com.brm.Kubotz.Component;

import com.badlogic.gdx.physics.box2d.Body;
import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Component used to let an entity punch
 */
public class PunchComponent extends Component {

    public final String ID = "PUNCH_COMPONENT";

    public int damage = 10; //Number of damage per hit

    Timer cooldown = new Timer(80); //The delay between hits


    /**
     * It needs
     * @param body
     */
    public PunchComponent(Body body){

    }




    @Override
    public void onAttach() {
        super.onAttach();
    }

    @Override
    public void onDetach(){
        super.onDetach();
    }

}
