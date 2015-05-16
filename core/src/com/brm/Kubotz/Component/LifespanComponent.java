package com.brm.Kubotz.Component;

import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Makes an entity die after a certain amount of time
 */
public class LifespanComponent extends Component{

    public static final String ID = "LIFESPAN_COMPONENT";

    public Timer counter;

    /**
     * Ctor
     * @param lifespan : in ms
     */
    public LifespanComponent(int lifespan){
        this.counter = new Timer(lifespan);
    }

    /**
     * Ctor
     * Lifespan defaults to infinite
     */
    public LifespanComponent(){
        this.counter = new Timer(Timer.INFINITE);
    }



    /**
     * Starts the life counter
     */
    public void startLife(){
        this.counter.start();
    }

    /**
     * Returns whether or not the lifespan is finished
     * @return
     */
    public boolean isFinished(){
        return  this.counter.isDone();
    }

}
