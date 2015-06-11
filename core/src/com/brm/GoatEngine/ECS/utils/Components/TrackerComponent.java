package com.brm.GoatEngine.ECS.utils.Components;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.core.Components.EntityComponent;

/**
 * Alllows an entity to follow another entity
 */
public class TrackerComponent extends EntityComponent {
    public final static String ID = "TRACKER_COMPONENT";
    private String targetId;    //the id of the target

    //The minimumDistance the tracker has to be from the target at all times
    // For Example: (-2,2) well be at the upper left of the target two units afar
    private Vector2 distance = new Vector2(0,0);


    public TrackerComponent(String targetId){
        this.targetId = targetId;
    }


    public String getTargetId() {
        return targetId;
    }

    public void setTargetId(String targetId) {
        this.targetId = targetId;
    }

    public Vector2 getDistance() {
        return distance;
    }

    public void setDistance(Vector2 distance) {
        this.distance = distance;
    }
}
