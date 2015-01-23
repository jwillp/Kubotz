package com.brm.Kubotz.Component.Skills;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.Component;

/**
 * Used to dash a character
 */
public class DashComponent extends Component{
    public final static String ID = "DASH_COMPONENT";

    public Vector2 distance = new Vector2(4,4); // The distance in nb of game units a Dash is
    public Vector2 speed = new Vector2(2,2);    // The Speed of the das

    public DashComponent(){

    }



}
