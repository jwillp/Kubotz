package com.brm.GoatEngine.ECS.Components;

/**
 * Alllows an entity to follow another entity
 */
public class TrackerComponent extends Component {
    public final static String ID = "TRACKER_COMPONENT";
    public String targetId;    //the id of the target

    public TrackerComponent(String targetId){
        this.targetId = targetId;
    }


}
