package com.brm.GoatEngine.ECS.Components;

import com.badlogic.gdx.math.Vector2;

/**
 * Alllows an entity to follow another entity
 */
public class TrackerComponent extends Component {
    public final static String ID = "TRACKER_COMPONENT";
    public String targetId;    //the id of the target

    //The minimumDistance the tracker has to be from the target at all times
    // For Example: (-2,2) well be at the upper left of the target two units afar
    public Vector2 distance = new Vector2(0,0);


    public TrackerComponent(String targetId){
        this.targetId = targetId;
    }


}
