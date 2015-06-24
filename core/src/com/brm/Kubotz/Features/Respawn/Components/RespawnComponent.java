package com.brm.Kubotz.Features.Respawn.Components;

import com.badlogic.gdx.utils.XmlReader;
import com.brm.GoatEngine.ECS.core.EntityComponent;
import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.Config;

/**
 * Mainly used for players, makes an entity respawn after it is dead
 *
 * This compoennt uses a simple state machine
 *
 */
public class RespawnComponent extends EntityComponent {
    public static final String ID = "RESPAWN_COMPONENT";



    public enum State{
        SPAWNED, // When the entity is spawned
        SPAWNING, // When the entity is being spawned
        DEAD,    // When the entity is Dead
        WAITING, // When the entity is waiting to be respawned
    }

    private Timer delay; //Delay before respawning when dead
    private State state;


    public RespawnComponent(){
        delay = new Timer(Config.RESPAWN_DELAY);
        this.delay.start();
        state = State.SPAWNED;
    }

    public RespawnComponent(XmlReader.Element element){
        super(element);
    }


    /**
     * Deserialize a component
     *
     * @param componentData the data as an XML element
     */
    @Override
    public void deserialize(XmlReader.Element componentData) {
        for(XmlReader.Element param: componentData.getChildrenByName("param")){
            String name = param.getAttribute("name");
            String value = param.getText();
            if(name.equals("delay")){
                this.delay = new Timer(Integer.parseInt(value));
                this.state = State.SPAWNED;
                this.delay.start();
            }
        }

    }


    public Timer getDelay() {
        return delay;
    }

    public State getState() {
        return state;
    }

    public void setState(State state) {
        this.state = state;
    }


}
