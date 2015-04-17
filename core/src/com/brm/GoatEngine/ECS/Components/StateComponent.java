package com.brm.GoatEngine.ECS.Components;

/**
 * Component representing the current state of an entity
 * (useful for the animation system to determine
 * the animation according to the state)
 */
public class StateComponent extends Component {


    public static String ID = "STATE_COMPONENT";

    /**
     * An interface to be extended by Enums or classes to make Entity States
     */
    public interface EntityState{}


    public EntityState state;



    /*protected HashSet<EntityState> states = new HashSet<EntityState>();



    public boolean hasState(EntityState state){
        return states.contains(state);
    }

    public void removeState(EntityState state){
        states.remove(state);
    }

    public void addState(EntityState state){
        states.add(state);
    }

    public void clearStates(){
        states.clear();
    }*/





}
